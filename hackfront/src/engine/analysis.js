import { enrichTransactions } from './merchants.js';
import { findRecurring } from './recurring.js';
import { applyFlags } from './flags.js';

// Keep the browser analysis and the signed-in import on the same normalized rows.
export function formatStatementTransactions(transactions) {
  return transactions.map(tx => ({
    transactionDate: tx.transactionDate || (tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : String(tx.date).slice(0, 10)),
    description: tx.narration || tx.description || 'Debit',
    amount: Number(tx.amount || tx.debit || 0),
    direction: tx.direction || 'debit',
    currency: 'INR',
    ref: tx.ref || '',
    method: tx.mech || tx.method || '',
    status: tx.direction === 'credit' ? 'CREDIT' : 'DEBIT',
    sourceFileIndex: tx.sourceFileIndex ?? 0
  }));
}

export function dedupeStatementTransactions(transactions) {
  const seen = new Set();
  return transactions.filter(tx => {
    const key = [
      (tx.ref || '').trim(),
      tx.transactionDate,
      Number(tx.amount).toFixed(2),
      (tx.description || '').trim().toUpperCase(),
      (tx.direction || 'debit').toLowerCase()
    ].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function analyzeTransactions(transactions) {
  const rows = transactions.map(tx => ({
    date: new Date(`${tx.transactionDate}T00:00:00`),
    transactionDate: tx.transactionDate,
    narration: tx.description,
    amount: tx.direction === 'credit' ? 0 : Number(tx.amount),
    debit: tx.direction === 'credit' ? 0 : Number(tx.amount),
    direction: tx.direction,
    ref: tx.ref,
    method: tx.method
  }));
  return applyFlags(findRecurring(enrichTransactions(rows)));
}
