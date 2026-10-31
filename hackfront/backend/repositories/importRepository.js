const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');

const importRepository = {
  async createImportBatch(userId, batchData) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })
         CREATE (i:ImportBatch {
           importId: $importId,
           userId: $userId,
           importedAt: $importedAt,
           transactionCount: $transactionCount,
           dateRangeStart: $dateRangeStart,
           dateRangeEnd: $dateRangeEnd,
           status: $status,
           bankName: $bankName
         })
         CREATE (u)-[:CREATED_IMPORT]->(i)
         RETURN i.importId AS importId, i.importedAt AS importedAt, i.transactionCount AS transactionCount,
                i.dateRangeStart AS dateRangeStart, i.dateRangeEnd AS dateRangeEnd, i.status AS status,
                i.bankName AS bankName`,
        {
          userId,
          importId: batchData.importId,
          importedAt: batchData.importedAt || new Date().toISOString(),
          transactionCount: neo4j.int(batchData.transactionCount || 0),
          dateRangeStart: batchData.dateRangeStart || null,
          dateRangeEnd: batchData.dateRangeEnd || null,
          status: batchData.status || 'completed',
          bankName: batchData.bankName || 'Your bank'
        }
      );
      const rec = result.records[0];
      return {
        importId: rec.get('importId'),
        importedAt: rec.get('importedAt'),
        transactionCount: rec.get('transactionCount').toNumber ? rec.get('transactionCount').toNumber() : rec.get('transactionCount'),
        dateRangeStart: rec.get('dateRangeStart'),
        dateRangeEnd: rec.get('dateRangeEnd'),
        status: rec.get('status'),
        bankName: rec.get('bankName')
      };
    } finally {
      await session.close();
    }
  },

  async getImportsByUser(userId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch)
         RETURN i.importId AS importId, i.importedAt AS importedAt, i.transactionCount AS transactionCount,
                i.dateRangeStart AS dateRangeStart, i.dateRangeEnd AS dateRangeEnd, i.status AS status,
                i.bankName AS bankName
         ORDER BY i.importedAt DESC`,
        { userId }
      );
      return result.records.map(rec => ({
        importId: rec.get('importId'),
        importedAt: rec.get('importedAt'),
        transactionCount: rec.get('transactionCount').toNumber ? rec.get('transactionCount').toNumber() : rec.get('transactionCount'),
        dateRangeStart: rec.get('dateRangeStart'),
        dateRangeEnd: rec.get('dateRangeEnd'),
        status: rec.get('status'),
        bankName: rec.get('bankName')
      }));
    } finally {
      await session.close();
    }
  },

  async getImportById(userId, importId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch { importId: $importId })
         RETURN i.importId AS importId, i.importedAt AS importedAt, i.transactionCount AS transactionCount,
                i.dateRangeStart AS dateRangeStart, i.dateRangeEnd AS dateRangeEnd, i.status AS status,
                i.bankName AS bankName
         LIMIT 1`,
        { userId, importId }
      );
      if (!result.records.length) return null;
      const rec = result.records[0];
      return {
        importId: rec.get('importId'),
        importedAt: rec.get('importedAt'),
        transactionCount: rec.get('transactionCount').toNumber ? rec.get('transactionCount').toNumber() : rec.get('transactionCount'),
        dateRangeStart: rec.get('dateRangeStart'),
        dateRangeEnd: rec.get('dateRangeEnd'),
        status: rec.get('status'),
        bankName: rec.get('bankName')
      };
    } finally {
      await session.close();
    }
  },

  async deleteImport(userId, importId) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch { importId: $importId })
         OPTIONAL MATCH (t:Transaction)-[:IN_IMPORT]->(i)
         DETACH DELETE t, i
         RETURN count(i) AS deletedCount`,
        { userId, importId }
      );
      return result.records[0].get('deletedCount').toNumber() > 0;
    } finally {
      await session.close();
    }
  }
};

module.exports = importRepository;
