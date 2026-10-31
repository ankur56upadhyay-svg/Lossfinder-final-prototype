const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');

const usageRepository = {
  async createUsageEvent(userId, data) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const now = new Date().toISOString();
      const result = await session.run(
        `MATCH (u:User { userId: $userId })
         MERGE (m:Merchant { merchantKey: $merchantKey })
           ON CREATE SET m.canonicalName = $merchantKey, m.category = 'Other', m.createdAt = $now
         CREATE (ue:UsageEvent {
           usageEventId: $usageEventId,
           userId: $userId,
           merchantKey: $merchantKey,
           eventDate: $eventDate,
           eventType: $eventType,
           notes: $notes,
           createdAt: $now
         })
         CREATE (u)-[:RECORDED_USAGE]->(ue)
         CREATE (ue)-[:RELATES_TO]->(m)
         RETURN ue.usageEventId AS usageEventId,
                ue.merchantKey AS merchantKey,
                ue.eventDate AS eventDate,
                ue.eventType AS eventType,
                ue.notes AS notes,
                ue.createdAt AS createdAt,
                m.canonicalName AS merchantName`,
        {
          userId,
          usageEventId: data.usageEventId,
          merchantKey: data.merchantKey,
          eventDate: data.eventDate,
          eventType: data.eventType,
          notes: data.notes || '',
          now
        }
      );
      const rec = result.records[0];
      return {
        usageEventId: rec.get('usageEventId'),
        merchantKey: rec.get('merchantKey'),
        eventDate: rec.get('eventDate'),
        eventType: rec.get('eventType'),
        notes: rec.get('notes'),
        createdAt: rec.get('createdAt'),
        merchantName: rec.get('merchantName')
      };
    } finally {
      await session.close();
    }
  },

  async getUsageEventsByUser(userId, merchantKey = null) {
    const session = getSession(neo4j.session.READ);
    try {
      let whereClause = 'ue.userId = $userId';
      const params = { userId };
      if (merchantKey) {
        whereClause += ' AND ue.merchantKey = $merchantKey';
        params.merchantKey = merchantKey;
      }

      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:RECORDED_USAGE]->(ue:UsageEvent)
         OPTIONAL MATCH (ue)-[:RELATES_TO]->(m:Merchant)
         WHERE ${whereClause}
         RETURN ue.usageEventId AS usageEventId,
                ue.merchantKey AS merchantKey,
                ue.eventDate AS eventDate,
                ue.eventType AS eventType,
                ue.notes AS notes,
                ue.createdAt AS createdAt,
                m.canonicalName AS merchantName
         ORDER BY ue.eventDate DESC`,
        params
      );

      return result.records.map(rec => ({
        usageEventId: rec.get('usageEventId'),
        merchantKey: rec.get('merchantKey'),
        eventDate: rec.get('eventDate'),
        eventType: rec.get('eventType'),
        notes: rec.get('notes'),
        createdAt: rec.get('createdAt'),
        merchantName: rec.get('merchantName')
      }));
    } finally {
      await session.close();
    }
  },

  async deleteUsageEvent(userId, usageEventId) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:RECORDED_USAGE]->(ue:UsageEvent { usageEventId: $usageEventId })
         DETACH DELETE ue
         RETURN count(ue) AS deletedCount`,
        { userId, usageEventId }
      );
      return result.records[0].get('deletedCount').toNumber() > 0;
    } finally {
      await session.close();
    }
  }
};

module.exports = usageRepository;
