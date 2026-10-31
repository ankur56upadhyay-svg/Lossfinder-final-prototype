const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');

const subscriptionRepository = {
  async saveSubscriptions(userId, subscriptions) {
    if (!subscriptions || !subscriptions.length) return 0;
    const session = getSession(neo4j.session.WRITE);
    try {
      const now = new Date().toISOString();
      const rows = subscriptions.map(s => ({
        subscriptionId: s.subscriptionId || `${userId}_${s.merchantKey}`,
        userId: userId,
        merchantKey: s.merchantKey,
        serviceName: s.name || s.serviceName,
        what: s.what || '',
        code: s.code || '',
        mechanism: s.mech || s.mechanism || 'Card',
        category: s.category || 'Other',
        price: Number(s.price),
        per: s.per || 'mo',
        wasAmount: s.was ? Number(s.was) : null,
        statusKind: s.status?.kind || 'active',
        statusLabel: s.status?.label || 'Active',
        confidence: s.confidence !== undefined ? Number(s.confidence) : 1.0,
        lastPaymentDate: s.lastPaymentDate || null,
        nextExpectedDate: s.nextExpectedDate || null,
        evidence: JSON.stringify(s.evidence || []),
        history: JSON.stringify(s.history || []),
        explain: s.explain || '',
        now: now
      }));

      const query = `
        MATCH (u:User { userId: $userId })
        UNWIND $rows AS row
        MERGE (m:Merchant { merchantKey: row.merchantKey })
        MERGE (u)-[:TRACKS]->(s:Subscription { subscriptionId: row.subscriptionId })
        ON CREATE SET
          s.userId = row.userId,
          s.merchantKey = row.merchantKey,
          s.serviceName = row.serviceName,
          s.what = row.what,
          s.code = row.code,
          s.mechanism = row.mechanism,
          s.category = row.category,
          s.price = row.price,
          s.per = row.per,
          s.wasAmount = row.wasAmount,
          s.statusKind = row.statusKind,
          s.statusLabel = row.statusLabel,
          s.confidence = row.confidence,
          s.lastPaymentDate = row.lastPaymentDate,
          s.nextExpectedDate = row.nextExpectedDate,
          s.evidence = row.evidence,
          s.history = row.history,
          s.explain = row.explain,
          s.createdAt = row.now,
          s.updatedAt = row.now
        ON MATCH SET
          s.serviceName = row.serviceName,
          s.what = row.what,
          s.code = row.code,
          s.mechanism = row.mechanism,
          s.category = row.category,
          s.price = row.price,
          s.per = row.per,
          s.wasAmount = row.wasAmount,
          // Preserve user override status if present
          s.statusKind = CASE WHEN s.userOverrideStatus IS NOT NULL THEN s.userOverrideStatus ELSE row.statusKind END,
          s.statusLabel = CASE WHEN s.userOverrideStatus IS NOT NULL THEN s.statusLabel ELSE row.statusLabel END,
          s.confidence = row.confidence,
          s.lastPaymentDate = row.lastPaymentDate,
          s.nextExpectedDate = row.nextExpectedDate,
          s.evidence = row.evidence,
          s.history = row.history,
          s.explain = row.explain,
          s.updatedAt = row.now
        MERGE (s)-[:FOR_MERCHANT]->(m)
        RETURN count(s) AS savedCount
      `;

      const result = await session.run(query, { userId, rows });
      return result.records[0].get('savedCount').toNumber();
    } finally {
      await session.close();
    }
  },

  async getSubscriptionsByUser(userId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:TRACKS]->(s:Subscription)
         OPTIONAL MATCH (s)-[:FOR_MERCHANT]->(m:Merchant)
         RETURN s.subscriptionId AS subscriptionId,
                s.merchantKey AS merchantKey,
                s.serviceName AS name,
                s.what AS what,
                s.code AS code,
                s.mechanism AS mech,
                COALESCE(s.category, m.category, 'Other') AS category,
                s.price AS price,
                s.per AS per,
                s.wasAmount AS was,
                s.statusKind AS statusKind,
                s.statusLabel AS statusLabel,
                s.userOverrideStatus AS userOverrideStatus,
                s.confidence AS confidence,
                s.lastPaymentDate AS lastPaymentDate,
                s.nextExpectedDate AS nextExpectedDate,
                s.evidence AS evidence,
                s.history AS history,
                s.explain AS explain,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt
         ORDER BY
           CASE s.statusKind
             WHEN 'hike' THEN 0
             WHEN 'unused' THEN 1
             WHEN 'trial' THEN 2
             WHEN 'active' THEN 3
             ELSE 4
           END,
           s.price * (CASE s.per WHEN 'mo' THEN 12 ELSE 1 END) DESC`,
        { userId }
      );

      return result.records.map(rec => {
        let evidence = [];
        try {
          evidence = JSON.parse(rec.get('evidence') || '[]');
        } catch (e) {}

        let history = [];
        try {
          history = JSON.parse(rec.get('history') || '[]');
        } catch (e) {}

        const statusKind = rec.get('statusKind');
        const statusLabel = rec.get('statusLabel');

        return {
          id: rec.get('merchantKey'), // Frontend expects id to match merchantKey
          subscriptionId: rec.get('subscriptionId'),
          name: rec.get('name'),
          what: rec.get('what'),
          code: rec.get('code'),
          mech: rec.get('mech'),
          category: rec.get('category'),
          price: rec.get('price'),
          per: rec.get('per'),
          was: rec.get('was') !== null ? rec.get('was') : undefined,
          status: {
            kind: statusKind,
            label: statusLabel
          },
          userOverrideStatus: rec.get('userOverrideStatus'),
          confidence: rec.get('confidence'),
          lastPaymentDate: rec.get('lastPaymentDate'),
          nextExpectedDate: rec.get('nextExpectedDate'),
          evidence: evidence,
          history: history,
          explain: rec.get('explain'),
          createdAt: rec.get('createdAt'),
          updatedAt: rec.get('updatedAt')
        };
      });
    } finally {
      await session.close();
    }
  },

  async getSubscriptionById(userId, idOrKey) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:TRACKS]->(s:Subscription)
         WHERE s.subscriptionId = $idOrKey OR s.merchantKey = $idOrKey
         OPTIONAL MATCH (s)-[:FOR_MERCHANT]->(m:Merchant)
         RETURN s.subscriptionId AS subscriptionId,
                s.merchantKey AS merchantKey,
                s.serviceName AS name,
                s.what AS what,
                s.code AS code,
                s.mechanism AS mech,
                COALESCE(s.category, m.category, 'Other') AS category,
                s.price AS price,
                s.per AS per,
                s.wasAmount AS was,
                s.statusKind AS statusKind,
                s.statusLabel AS statusLabel,
                s.userOverrideStatus AS userOverrideStatus,
                s.confidence AS confidence,
                s.lastPaymentDate AS lastPaymentDate,
                s.nextExpectedDate AS nextExpectedDate,
                s.evidence AS evidence,
                s.history AS history,
                s.explain AS explain,
                s.createdAt AS createdAt,
                s.updatedAt AS updatedAt
         LIMIT 1`,
        { userId, idOrKey }
      );

      if (!result.records.length) return null;
      const rec = result.records[0];

      let evidence = [];
      try {
        evidence = JSON.parse(rec.get('evidence') || '[]');
      } catch (e) {}

      let history = [];
      try {
        history = JSON.parse(rec.get('history') || '[]');
      } catch (e) {}

      return {
        id: rec.get('merchantKey'),
        subscriptionId: rec.get('subscriptionId'),
        name: rec.get('name'),
        what: rec.get('what'),
        code: rec.get('code'),
        mech: rec.get('mech'),
        category: rec.get('category'),
        price: rec.get('price'),
        per: rec.get('per'),
        was: rec.get('was') !== null ? rec.get('was') : undefined,
        status: {
          kind: rec.get('statusKind'),
          label: rec.get('statusLabel')
        },
        userOverrideStatus: rec.get('userOverrideStatus'),
        confidence: rec.get('confidence'),
        lastPaymentDate: rec.get('lastPaymentDate'),
        nextExpectedDate: rec.get('nextExpectedDate'),
        evidence: evidence,
        history: history,
        explain: rec.get('explain'),
        createdAt: rec.get('createdAt'),
        updatedAt: rec.get('updatedAt')
      };
    } finally {
      await session.close();
    }
  },

  async updateSubscriptionStatus(userId, idOrKey, newStatus, notes = '') {
    const session = getSession(neo4j.session.WRITE);
    try {
      const now = new Date().toISOString();
      const statusLabel = newStatus === 'cancelled'
        ? 'Marked as cancelled'
        : newStatus === 'active'
        ? 'Active'
        : newStatus;

      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:TRACKS]->(s:Subscription)
         WHERE s.subscriptionId = $idOrKey OR s.merchantKey = $idOrKey
         SET s.statusKind = $newStatus,
             s.statusLabel = $statusLabel,
             s.userOverrideStatus = $newStatus,
             s.notes = $notes,
             s.updatedAt = $now
         RETURN s.subscriptionId AS subscriptionId, s.statusKind AS statusKind, s.statusLabel AS statusLabel`,
        { userId, idOrKey, newStatus, statusLabel, notes, now }
      );

      if (!result.records.length) return null;
      const rec = result.records[0];
      return {
        subscriptionId: rec.get('subscriptionId'),
        status: {
          kind: rec.get('statusKind'),
          label: rec.get('statusLabel')
        }
      };
    } finally {
      await session.close();
    }
  }
};

module.exports = subscriptionRepository;
