const crypto = require('crypto');
const importRepository = require('../repositories/importRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { computeRowHash } = require('../utils/fingerprint');
const { findMerchant, determineMechanism } = require('../utils/merchants');
const logger = require('../utils/logger');
const { MAX_FILES_IN_WINDOW, WINDOW_DAYS, MAX_STATEMENT_DAYS } = require('../config/uploadLimits');

function checkStatementDates(transactions) {
  const byFile = new Map();
  for (const row of transactions) {
    const index = row.sourceFileIndex ?? 0;
    const date = row.transactionDate || row.date;
    if (!date) continue;
    const bounds = byFile.get(index) || { first: date, last: date };
    if (date < bounds.first) bounds.first = date;
    if (date > bounds.last) bounds.last = date;
    byFile.set(index, bounds);
  }
  for (const [index, { first, last }] of byFile) {
    if ((Date.parse(last) - Date.parse(first)) / 86400000 > MAX_STATEMENT_DAYS) {
      const error = new Error(`Statement ${index + 1} spans more than two years. Export a shorter date range.`);
      error.status = 400;
      error.code = 'STATEMENT_DATE_RANGE_EXCEEDED';
      throw error;
    }
  }
}

const importService = {
  async processImport(userId, inputData) {
    const { transactions = [], bankName = 'Your bank', fileNames = [] } = inputData;
    const fileCount = fileNames.length || 1;
    if (fileCount > MAX_FILES_IN_WINDOW) {
      const error = new Error('You can upload at most 10 statement files in 14 days.');
      error.status = 400;
      error.code = 'TOO_MANY_FILES';
      throw error;
    }
    checkStatementDates(transactions);
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

    const toInsert = [];
    let duplicateCount = 0;

    // Deduplicate within this analysis, while keeping separate analyses independent.
    const seenInBatch = new Set();

    for (const row of validRows) {
      if (seenInBatch.has(row.sourceRowHash)) {
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
    const created = await importRepository.createImportBatch(userId, {
      importId,
      importedAt: now,
      transactionCount: toInsert.length,
      dateRangeStart,
      dateRangeEnd,
      status: 'completed',
      bankName,
      fileNames,
      fileCount
    });
    if (!created) {
      const error = new Error(`You have reached the limit of ${MAX_FILES_IN_WINDOW} statement files in a rolling ${WINDOW_DAYS}-day period. Please try again when an earlier upload expires.`);
      error.status = 429;
      error.code = 'FILE_QUOTA_EXCEEDED';
      throw error;
    }

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

    // 5. Re-run the same detector as guest mode on the accepted, saved rows.
    try {
      const { analyzeTransactions } = await import('../../src/engine/analysis.js');
      const detected = analyzeTransactions(toInsert);
      const classifications = await importRepository.getClassificationPreferences(userId);
      await importRepository.saveAnalysisSnapshot(userId, importId, detected.map(sub => ({
        ...sub,
        id: sub.merchantKey,
        reviewDecision: null,
        cancelled: false,
        classificationDecision: classifications[sub.merchantKey] || null
      })));
    } catch (analysisErr) {
      logger.error('Subscription analysis error after import', { error: analysisErr.message });
      // The import remains available; its snapshot can be generated when opened.
    }

    return {
      importId,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      totalRows: transactions.length,
      dateRangeStart,
      dateRangeEnd,
      bankName,
      fileNames
    };
  }
};

module.exports = importService;
