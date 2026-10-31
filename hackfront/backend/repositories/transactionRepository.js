const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');

const transactionRepository = {
  async findExistingHashes(userId, hashes) {
    if (!hashes || !hashes.length) return new Set();
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:MADE]->(t:Transaction)
         WHERE t.sourceRowHash IN $hashes
         RETURN t.sourceRowHash AS hash`,
        { userId, hashes }
      );
      return new Set(result.records.map(r => r.get('hash')));
    } finally {
      await session.close();
    }
  },

  async saveTransactionsBatch(userId, importId, transactions) {
    if (!transactions.length) return 0;
    const session = getSession(neo4j.session.WRITE);
    try {
      const now = new Date().toISOString();
      const rows = transactions.map(t => ({
        transactionId: t.transactionId,
        userId: userId,
        transactionDate: t.transactionDate,
        description: t.description,
        normalizedMerchant: t.normalizedMerchant,
        merchantKey: t.merchantKey,
        canonicalName: t.canonicalName,
        category: t.category,
        amount: Number(t.amount),
        currency: t.currency || 'INR',
        direction: t.direction,
        transactionType: t.transactionType || 'purchase',
        ref: t.ref || '',
        method: t.method || '',
        status: t.status || 'DEBIT',
        sourceRowHash: t.sourceRowHash,
        createdAt: now
      }));

      const query = `
        MATCH (u:User { userId: $userId })
        MATCH (i:ImportBatch { importId: $importId })
        UNWIND $rows AS row
        MERGE (m:Merchant { merchantKey: row.merchantKey })
          ON CREATE SET m.canonicalName = row.canonicalName,
                        m.category = row.category,
                        m.createdAt = $now
          ON MATCH SET m.canonicalName = CASE WHEN m.canonicalName = 'Unknown Merchant' THEN row.canonicalName ELSE m.canonicalName END
        CREATE (t:Transaction {
          transactionId: row.transactionId,
          userId: row.userId,
          transactionDate: row.transactionDate,
          description: row.description,
          normalizedMerchant: row.normalizedMerchant,
          merchantKey: row.merchantKey,
          amount: row.amount,
          currency: row.currency,
          direction: row.direction,
          transactionType: row.transactionType,
          ref: row.ref,
          method: row.method,
          status: row.status,
          sourceRowHash: row.sourceRowHash,
          createdAt: row.createdAt
        })
        CREATE (u)-[:MADE]->(t)
        CREATE (t)-[:PAID_TO]->(m)
        CREATE (t)-[:IN_IMPORT]->(i)
        RETURN count(t) AS createdCount
      `;

      const result = await session.run(query, {
        userId,
        importId,
        rows,
        now
      });

      return result.records[0].get('createdCount').toNumber();
    } finally {
      await session.close();
    }
  },

  async getTransactionsByUser(userId, filters = {}, pagination = { page: 1, limit: 50 }) {
    const session = getSession(neo4j.session.READ);
    try {
      const { merchantKey, direction, dateFrom, dateTo, importId } = filters;
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      let whereClauses = ['t.userId = $userId'];
      const params = {
        userId,
        skip: neo4j.int(skip),
        limit: neo4j.int(limit)
      };

      if (merchantKey) {
        whereClauses.push('t.merchantKey = $merchantKey');
        params.merchantKey = merchantKey;
      }
      if (direction) {
        whereClauses.push('t.direction = $direction');
        params.direction = direction;
      }
      if (dateFrom) {
        whereClauses.push('t.transactionDate >= $dateFrom');
        params.dateFrom = dateFrom;
      }
      if (dateTo) {
        whereClauses.push('t.transactionDate <= $dateTo');
        params.dateTo = dateTo;
      }

      let matchClause = '(u:User { userId: $userId })-[:MADE]->(t:Transaction)';
      if (importId) {
        matchClause += ', (t)-[:IN_IMPORT]->(i:ImportBatch { importId: $importId })';
        params.importId = importId;
      }

      const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countResult = await session.run(
        `MATCH ${matchClause} ${whereStr} RETURN count(t) AS total`,
        params
      );
      const total = countResult.records[0].get('total').toNumber();

      const query = `
        MATCH ${matchClause}
        OPTIONAL MATCH (t)-[:PAID_TO]->(m:Merchant)
        ${whereStr}
        RETURN t.transactionId AS transactionId,
               t.transactionDate AS transactionDate,
               t.description AS description,
               t.normalizedMerchant AS normalizedMerchant,
               t.merchantKey AS merchantKey,
               t.amount AS amount,
               t.currency AS currency,
               t.direction AS direction,
               t.transactionType AS transactionType,
               t.ref AS ref,
               t.method AS method,
               t.status AS status,
               t.sourceRowHash AS sourceRowHash,
               t.createdAt AS createdAt,
               m.canonicalName AS merchantName,
               m.category AS category
        ORDER BY t.transactionDate DESC, t.transactionId DESC
        SKIP $skip LIMIT $limit
      `;

      const result = await session.run(query, params);

      const items = result.records.map(rec => ({
        transactionId: rec.get('transactionId'),
        transactionDate: rec.get('transactionDate'),
        description: rec.get('description'),
        normalizedMerchant: rec.get('normalizedMerchant'),
        merchantKey: rec.get('merchantKey'),
        amount: rec.get('amount'),
        currency: rec.get('currency'),
        direction: rec.get('direction'),
        transactionType: rec.get('transactionType'),
        ref: rec.get('ref'),
        method: rec.get('method'),
        status: rec.get('status'),
        sourceRowHash: rec.get('sourceRowHash'),
        createdAt: rec.get('createdAt'),
        merchantName: rec.get('merchantName'),
        category: rec.get('category')
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } finally {
      await session.close();
    }
  },

  async getAllDebitTransactionsByUser(userId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:MADE]->(t:Transaction)
         OPTIONAL MATCH (t)-[:PAID_TO]->(m:Merchant)
         RETURN t.transactionId AS transactionId,
                t.transactionDate AS date,
                t.description AS narration,
                t.amount AS debit,
                t.currency AS currency,
                t.direction AS direction,
                t.ref AS ref,
                t.method AS method,
                t.status AS status,
                t.merchantKey AS merchantKey,
                t.normalizedMerchant AS normalizedMerchant,
                m.canonicalName AS canonicalName,
                m.category AS category
         ORDER BY t.transactionDate ASC`,
        { userId }
      );

      return result.records.map(rec => ({
        transactionId: rec.get('transactionId'),
        date: rec.get('date'),
        narration: rec.get('narration'),
        debit: rec.get('direction') === 'debit' ? rec.get('debit') : 0,
        credit: rec.get('direction') === 'credit' ? rec.get('debit') : 0,
        amount: rec.get('debit'),
        currency: rec.get('currency'),
        direction: rec.get('direction'),
        ref: rec.get('ref'),
        method: rec.get('method'),
        status: rec.get('status'),
        merchantKey: rec.get('merchantKey'),
        normalizedMerchant: rec.get('normalizedMerchant'),
        canonicalName: rec.get('canonicalName'),
        category: rec.get('category')
      }));
    } finally {
      await session.close();
    }
  },

  async getTransactionById(userId, transactionId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:MADE]->(t:Transaction { transactionId: $transactionId })
         OPTIONAL MATCH (t)-[:PAID_TO]->(m:Merchant)
         RETURN t.transactionId AS transactionId,
                t.transactionDate AS transactionDate,
                t.description AS description,
                t.normalizedMerchant AS normalizedMerchant,
                t.merchantKey AS merchantKey,
                t.amount AS amount,
                t.currency AS currency,
                t.direction AS direction,
                t.transactionType AS transactionType,
                t.ref AS ref,
                t.method AS method,
                t.status AS status,
                t.sourceRowHash AS sourceRowHash,
                t.createdAt AS createdAt,
                m.canonicalName AS merchantName,
                m.category AS category
         LIMIT 1`,
        { userId, transactionId }
      );
      if (!result.records.length) return null;
      const rec = result.records[0];
      return {
        transactionId: rec.get('transactionId'),
        transactionDate: rec.get('transactionDate'),
        description: rec.get('description'),
        normalizedMerchant: rec.get('normalizedMerchant'),
        merchantKey: rec.get('merchantKey'),
        amount: rec.get('amount'),
        currency: rec.get('currency'),
        direction: rec.get('direction'),
        transactionType: rec.get('transactionType'),
        ref: rec.get('ref'),
        method: rec.get('method'),
        status: rec.get('status'),
        sourceRowHash: rec.get('sourceRowHash'),
        createdAt: rec.get('createdAt'),
        merchantName: rec.get('merchantName'),
        category: rec.get('category')
      };
    } finally {
      await session.close();
    }
  },

  async deleteTransaction(userId, transactionId) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:MADE]->(t:Transaction { transactionId: $transactionId })
         DETACH DELETE t
         RETURN count(t) AS deletedCount`,
        { userId, transactionId }
      );
      return result.records[0].get('deletedCount').toNumber() > 0;
    } finally {
      await session.close();
    }
  }
};

module.exports = transactionRepository;
