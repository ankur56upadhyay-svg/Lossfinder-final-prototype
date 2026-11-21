const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');
const { MAX_FILES_IN_WINDOW, WINDOW_DAYS } = require('../config/uploadLimits');

const importRepository = {
  async createImportBatch(userId, batchData) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const now = batchData.importedAt || new Date().toISOString();
      const cutoff = new Date(Date.parse(now) - WINDOW_DAYS * 86400000).toISOString();
      const result = await session.run(
        `MATCH (u:User { userId: $userId })
         SET u.uploadQuotaLock = $importedAt
         WITH u
         OPTIONAL MATCH (u)-[:CREATED_IMPORT]->(old:ImportBatch)
         WHERE old.importedAt >= $cutoff AND old.quotaTracked IS NULL
         WITH u, sum(CASE WHEN old IS NULL THEN 0 WHEN size(coalesce(old.fileNames, [])) = 0 THEN 1 ELSE size(old.fileNames) END) AS legacyCount
         WITH u, legacyCount, [stamp IN coalesce(u.uploadFileTimes, []) WHERE stamp >= $cutoff] AS recent
         WHERE legacyCount + size(recent) + $fileCount <= $limit
         SET u.uploadFileTimes = recent + [n IN range(1, $fileCount) | $importedAt]
         CREATE (i:ImportBatch {
           importId: $importId,
           userId: $userId,
           importedAt: $importedAt,
           transactionCount: $transactionCount,
           dateRangeStart: $dateRangeStart,
           dateRangeEnd: $dateRangeEnd,
           status: $status,
           bankName: $bankName,
           fileNames: $fileNames,
           quotaTracked: true
         })
         CREATE (u)-[:CREATED_IMPORT]->(i)
         RETURN i.importId AS importId, i.importedAt AS importedAt, i.transactionCount AS transactionCount,
                i.dateRangeStart AS dateRangeStart, i.dateRangeEnd AS dateRangeEnd, i.status AS status,
                i.bankName AS bankName, i.fileNames AS fileNames`,
        {
          userId,
          importId: batchData.importId,
          importedAt: now,
          cutoff,
          limit: MAX_FILES_IN_WINDOW,
          fileCount: batchData.fileCount || 1,
          transactionCount: neo4j.int(batchData.transactionCount || 0),
          dateRangeStart: batchData.dateRangeStart || null,
          dateRangeEnd: batchData.dateRangeEnd || null,
          status: batchData.status || 'completed',
          bankName: batchData.bankName || 'Your bank',
          fileNames: batchData.fileNames || []
        }
      );
      const rec = result.records[0];
      if (!rec) return null;
      return {
        importId: rec.get('importId'),
        importedAt: rec.get('importedAt'),
        transactionCount: rec.get('transactionCount').toNumber ? rec.get('transactionCount').toNumber() : rec.get('transactionCount'),
        dateRangeStart: rec.get('dateRangeStart'),
        dateRangeEnd: rec.get('dateRangeEnd'),
        status: rec.get('status'),
        bankName: rec.get('bankName'),
        fileNames: rec.get('fileNames') || []
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
                i.bankName AS bankName, i.fileNames AS fileNames
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
        bankName: rec.get('bankName'),
        fileNames: rec.get('fileNames') || []
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
                i.bankName AS bankName, i.fileNames AS fileNames,
                i.analysisJson AS analysisJson
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
        bankName: rec.get('bankName'),
        fileNames: rec.get('fileNames') || [],
        analysisJson: rec.get('analysisJson')
      };
    } finally {
      await session.close();
    }
  },

  async saveAnalysisSnapshot(userId, importId, subscriptions) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch { importId: $importId })
         SET i.analysisJson = $analysisJson
         RETURN i.importId AS importId`,
        { userId, importId, analysisJson: JSON.stringify(subscriptions) }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  },

  async deleteImport(userId, importId) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch { importId: $importId })
         OPTIONAL MATCH (u)-[:MADE]->(t:Transaction)-[:IN_IMPORT]->(i)
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
