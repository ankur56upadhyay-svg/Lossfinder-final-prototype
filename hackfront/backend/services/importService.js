const crypto = require('crypto');
const importRepository = require('../repositories/importRepository');
const transactionRepository = require('../repositories/transactionRepository');
const subscriptionDetectionService = require('./subscriptionDetectionService');
const { computeRowHash } = require('../utils/fingerprint');
const { findMerchant, determineMechanism } = require('../utils/merchants');
const logger = require('../utils/logger');

const importService = {
  async processImport(userId, inputData) {
    const { transactions = [], bankName = 'Your bank' } = inputData;
    const importId = 'imp_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    logger.info('Processing import batch', { userId, importId, count: transactions.length });

    const validRows = [];
    let rejectedCount = 0;

    // 1. Normalize and compute fingerprints
    for (let i = 0; i < transactions.length; i++) {
      const row = transactions[i];
      const date = row.transactionDate || row.date;
      const desc = row.description || row.narration || '';
      const amount = Number(row.amount !== undefined ? row.amount : row.debit || 0);

      if (!date || isNaN(amount) || amount < 0 || !desc.trim()) {
        rejectedCount++;
        continue;
      }

      const merchant = findMerchant(desc);
      const direction = row.direction || (amount > 0 && (row.debit > 0 || row.amount > 0) ? 'debit' : 'credit');
      const hash = computeRowHash(userId, {
        ref: row.ref,
        transactionDate: date,
        amount: amount,
        description: desc,
        direction: direction
      });

      const txId = 'tx_' + crypto.randomBytes(10).toString('hex');

      validRows.push({
        transactionId: txId,
        transactionDate: date,
        description: desc.trim(),
        normalizedMerchant: merchant.canonicalName,
        merchantKey: merchant.merchantKey,
        canonicalName: merchant.canonicalName,
        category: merchant.category,
        amount: amount,
        currency: row.currency || 'INR',
        direction: direction,
        transactionType: row.transactionType || 'purchase',
        ref: (row.ref || '').trim(),
        method: (row.method || '').trim(),
        status: (row.status || 'DEBIT').trim(),
        sourceRowHash: hash
      });
    }

    if (!validRows.length) {
      throw new Error('No valid transactions could be processed from this file.');
    }

    // 2. Deduplication check against persisted transactions
    const allHashes = validRows.map(r => r.sourceRowHash);
    const existingHashes = await transactionRepository.findExistingHashes(userId, allHashes);

    const toInsert = [];
    let duplicateCount = 0;

    // Also deduplicate within the current import batch
    const seenInBatch = new Set();

    for (const row of validRows) {
      if (existingHashes.has(row.sourceRowHash) || seenInBatch.has(row.sourceRowHash)) {
        duplicateCount++;
      } else {
        seenInBatch.add(row.sourceRowHash);
        toInsert.push(row);
      }
    }

    // Determine date range
    const dates = validRows.map(r => r.transactionDate).sort();
    const dateRangeStart = dates[0];
    const dateRangeEnd = dates[dates.length - 1];

    // 3. Create import batch record
    await importRepository.createImportBatch(userId, {
      importId,
      importedAt: now,
      transactionCount: toInsert.length,
      dateRangeStart,
      dateRangeEnd,
      status: 'completed',
      bankName
    });

    // 4. Save transactions in batches of 500
    const BATCH_SIZE = 500;
    let acceptedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const slice = toInsert.slice(i, i + BATCH_SIZE);
      const inserted = await transactionRepository.saveTransactionsBatch(userId, importId, slice);
      acceptedCount += inserted;
    }

    logger.info('Import batch saved to Neo4j', {
      userId,
      importId,
      acceptedCount,
      duplicateCount,
      rejectedCount
    });

    // 5. Trigger graph subscription detection pipeline
    try {
      await subscriptionDetectionService.analyzeForUser(userId);
    } catch (analysisErr) {
      logger.error('Subscription analysis error after import', { error: analysisErr.message });
      // Don't fail the whole import if re-analysis encounters an issue; transactions are safe
    }

    return {
      importId,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      totalRows: transactions.length,
      dateRangeStart,
      dateRangeEnd,
      bankName
    };
  }
};

module.exports = importService;
