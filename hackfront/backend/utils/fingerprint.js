const crypto = require('crypto');

function computeRowHash(userId, tx) {
  const ref = (tx.ref || tx.transaction_id || '').trim();
  const date = (tx.transactionDate || tx.date || '').trim();
  const amount = Number(tx.amount || tx.debit || 0).toFixed(2);
  const desc = (tx.description || tx.narration || '').trim().toUpperCase();
  const direction = (tx.direction || (tx.debit > 0 ? 'debit' : 'credit')).toLowerCase();

  const raw = `${userId}:${ref}:${date}:${amount}:${desc}:${direction}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = {
  computeRowHash
};
