import { parseCSV } from './parse.js';

const ROLES = [
  ['date', /^(?:transaction\s*)?(?:txn\s*)?date$/i],
  ['date2', /^value\s*date$/i],
  ['narration', /^(?:narration|description|particulars|remarks|details|transaction\s*details)$/i],
  ['debit', /^(?:debit|withdrawal|withdrawals|paid\s*out)(?:\s*(?:amount|amt))?$/i],
  ['credit', /^(?:credit|deposit|deposits|paid\s*in)(?:\s*(?:amount|amt))?$/i],
  ['amount', /^(?:amount|transaction\s*amount|txn\s*amount)$/i],
  ['type', /^(?:type|dr\s*\/\s*cr|transaction\s*type)$/i],
  ['balance', /^(?:balance|closing\s*balance)$/i],
  ['ref', /^(?:reference|ref|cheque\s*(?:no)?|transaction\s*id)$/i],
];

const DATE = /^(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})$/;

function userError(message) {
  const error = new Error(message);
  error.isUserError = true;
  return error;
}

function linesFromItems(items) {
  const lines = [];
  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    let line = lines.find(row => Math.abs(row.y - y) < 3);
    if (!line) { line = { y, items: [] }; lines.push(line); }
    line.items.push({ x, end: x + (item.width || 0), text: item.str.trim() });
  }
  return lines.sort((a, b) => b.y - a.y).map(line => ({
    ...line,
    items: line.items.sort((a, b) => a.x - b.x),
  }));
}

function findColumns(line) {
  const columns = [];
  const pieces = line.items;
  for (let start = 0; start < pieces.length; start++) {
    for (let length = Math.min(3, pieces.length - start); length >= 1; length--) {
      const text = pieces.slice(start, start + length).map(piece => piece.text).join(' ').replace(/\s+/g, ' ').replace(/[₹:().]/g, '').trim();
      const role = ROLES.find(([, pattern]) => pattern.test(text))?.[0];
      if (role) { columns.push({ role, x: pieces[start].x }); start += length - 1; break; }
    }
  }
  if (!columns.some(c => c.role === 'date') || !columns.some(c => c.role === 'narration') ||
      !columns.some(c => ['debit', 'credit', 'amount'].includes(c.role))) return null;
  return columns.sort((a, b) => a.x - b.x);
}

function cellsFor(line, columns) {
  const cells = Object.fromEntries(columns.map(column => [column.role, '']));
  for (const item of line.items) {
    // PDF text chunks are positioned by their starting x coordinate.
    let index = 0;
    for (let i = 1; i < columns.length; i++) {
      if (item.x >= (columns[i - 1].x + columns[i].x) / 2) index = i;
    }
    const role = columns[index].role;
    cells[role] = [cells[role], item.text].filter(Boolean).join(' ');
  }
  return cells;
}

function csvCell(value) {
  return `"${String(value || '').replaceAll('"', '""')}"`;
}

/** Converts positioned text from PDF.js pages into the existing normalized CSV transaction model. */
export function parsePdfTextPages(pages) {
  const rows = [];
  let candidateRows = 0;
  let firstPageIntro = '';
  let columns = null;
  for (const pageItems of pages) {
    const lines = linesFromItems(pageItems);
    if (!firstPageIntro) firstPageIntro = lines.slice(0, 12).flatMap(line => line.items.map(item => item.text)).join(' ');
    for (const line of lines) {
      const header = findColumns(line);
      if (header) { columns = header; continue; }
      if (!columns) continue;
      const cells = cellsFor(line, columns);
      const date = cells.date || cells.date2 || '';
      if (!DATE.test(date.trim())) continue;
      candidateRows++;
      if (!cells.narration?.trim()) continue;
      rows.push(cells);
    }
  }
  if (!rows.length) {
    throw userError('No readable transaction table was found in this PDF. Export a text-based bank statement PDF or CSV; scanned image PDFs are not supported.');
  }
  if (rows.some(row => (row.debit !== undefined || row.credit !== undefined) !== (rows[0].debit !== undefined || rows[0].credit !== undefined))) {
    throw userError('This PDF changes transaction column formats between pages. Please export it as CSV.');
  }
  const splitAmounts = rows.some(row => row.debit !== undefined || row.credit !== undefined);
  const fields = splitAmounts
    ? ['Date', 'Narration', 'Debit', 'Credit', 'Balance', 'Reference']
    : ['Date', 'Narration', 'Amount', 'Type', 'Balance', 'Reference'];
  const csv = [fields.join(','), ...rows.map(row => (splitAmounts
    ? [row.date || row.date2, row.narration, row.debit, row.credit, row.balance, row.ref]
    : [row.date || row.date2, row.narration, row.amount, row.type, row.balance, row.ref]).map(csvCell).join(','))].join('\n');
  const transactions = parseCSV(csv);
  if (!transactions.length || transactions.length < candidateRows * 0.8) {
    throw userError(`Only ${transactions.length} of ${candidateRows} apparent PDF transactions could be interpreted. Please export this statement as CSV to avoid an incomplete analysis.`);
  }
  const bank = [/hdfc/i, /icici/i, /state bank|\bsbi\b/i, /axis/i, /kotak/i].find(pattern => pattern.test(firstPageIntro));
  if (bank) transactions.bank = firstPageIntro.match(bank)?.[0] || 'Your Bank';
  return transactions;
}
