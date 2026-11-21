// Entirely fictional accounts and transactions for the optional AA experience.
// This is not a ReBIT payload or a live Account Aggregator integration.
export const AA_DEMO_ACCOUNTS = [
  { id: 'demo-daily', bank: 'Demo Daily Bank', account: 'Savings account ending 0142' },
  { id: 'demo-digital', bank: 'Demo Digital Bank', account: 'Savings account ending 7308' },
];

function transaction(year, month, day, narration, debit, credit, accountId) {
  const date = new Date(year, month - 1, day);
  const transactionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    id: `aa-demo-${accountId}-${transactionDate}-${narration.replace(/[^a-z]/gi, '').toLowerCase()}`,
    date,
    transactionDate,
    narration,
    description: narration,
    ref: `DEMO-${accountId}-${transactionDate}-${narration.slice(-6).replace(/[^a-z]/gi, '')}`,
    amount: debit,
    debit,
    deposit: credit,
    credit,
    direction: debit > 0 ? 'debit' : 'credit',
    balance: 0,
  };
}

export function buildAaDemoTransactions(selectedAccountIds) {
  const selected = new Set(selectedAccountIds);
  const allowed = new Set(AA_DEMO_ACCOUNTS.map(account => account.id));
  if (!selected.size || [...selected].some(id => !allowed.has(id))) {
    throw new Error('Choose at least one demo account.');
  }

  const rows = [];
  for (let month = 4; month <= 11; month++) {
    if (selected.has('demo-daily')) {
      rows.push(transaction(2026, month, 1, 'SALARY CREDIT DEMO EMPLOYER', 0, 60000, 'demo-daily'));
      rows.push(transaction(2026, month, 5, 'CARD RECUR NETFLIX', month < 10 ? 499 : 649, 0, 'demo-daily'));
      rows.push(transaction(2026, month, 7, 'UPI AUTOPAY SPOTIFY PREMIUM', 119, 0, 'demo-daily'));
      rows.push(transaction(2026, month, 20, 'CARD GROCERY STORE', 920 + month * 13, 0, 'demo-daily'));
    }
    if (selected.has('demo-digital')) {
      rows.push(transaction(2026, month, 10, 'CARD RECUR GOOGLE ONE', 130, 0, 'demo-digital'));
      rows.push(transaction(2026, month, 15, 'CARD RECUR YOUTUBE PREMIUM', 189, 0, 'demo-digital'));
    }
  }
  return rows.sort((a, b) => a.date - b.date);
}
