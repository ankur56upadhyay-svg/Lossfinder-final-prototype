/**
 * parse.js — In-browser bank statement CSV parser
 *
 * Supports comma, semicolon, tab, and pipe delimiters.
 * Handles messy headers, varying column naming conventions,
 * credit/debit separation or signed amount columns, and multiple date formats.
 */

export const MIN_STATEMENT_DAYS = 5;
export const GRACE_DAYS = 7;

const MONTH_NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const BANK_NAMES = [
  [/hdfc/i, 'HDFC Bank'],
  [/icici/i, 'ICICI Bank'],
  [/state bank|\bsbi\b/i, 'State Bank of India'],
  [/axis/i, 'Axis Bank'],
  [/kotak/i, 'Kotak Mahindra Bank'],
  [/idfc/i, 'IDFC FIRST Bank'],
  [/yes bank/i, 'Yes Bank'],
  [/indusind/i, 'IndusInd Bank'],
  [/canara/i, 'Canara Bank'],
  [/punjab national|\bpnb\b/i, 'Punjab National Bank'],
  [/bank of baroda/i, 'Bank of Baroda'],
  [/union bank/i, 'Union Bank of India']
];

function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).slice(0, 40);
  let best = ',';
  let bestN = 0;
  [',', ';', '\t', '|'].forEach(d => {
    let n = 0;
    lines.forEach(l => { n += l.split(d).length - 1; });
    if (n > bestN) { bestN = n; best = d; }
  });
  return best;
}

function parseRows(text, delim) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  function endRow() {
    row.push(cell.trim());
    cell = '';
    if (row.some(c => c !== '')) rows.push(row);
    row = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += ch;
    }
  }
  endRow();
  return rows;
}

function mkDate(y, m, d) {
  if (y < 100) y += 2000;
  const dt = new Date(y, m - 1, d);
  const ok = dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y >= 1990 && y <= 2100;
  return ok ? dt : null;
}

function makeDateParser(samples) {
  let dayFirst = false;
  let monthFirst = false;
  samples.forEach(s => {
    const m = String(s || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (!m) return;
    if (+m[1] > 12) dayFirst = true;
    if (+m[2] > 12) monthFirst = true;
  });
  const mdy = monthFirst && !dayFirst;

  return function (raw) {
    let s = String(raw || '').trim().replace(/^'+/, '');
    if (!s) return null;
    s = s.replace(/[T ]\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?.*$/i, '');
    let m, mon;
    if ((m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) return mkDate(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/))) {
      return mdy ? mkDate(+m[3], +m[1], +m[2]) : mkDate(+m[3], +m[2], +m[1]);
    }
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.,]*([A-Za-z]{3,9})[\s\-\/.,]*(\d{2,4})$/)) && (mon = MONTH_NAMES[m[2].slice(0, 3).toLowerCase()])) {
      return mkDate(+m[3], mon, +m[1]);
    }
    if ((m = s.match(/^([A-Za-z]{3,9})[\s\-\/.]*(\d{1,2})(?:st|nd|rd|th)?,?[\s\-\/.]*(\d{4})$/)) && (mon = MONTH_NAMES[m[1].slice(0, 3).toLowerCase()])) {
      return mkDate(+m[3], mon, +m[2]);
    }
    if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/)) && +m[2] <= 12) return mkDate(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{2})(\d{2})(\d{4})$/))) return mkDate(+m[3], +m[2], +m[1]);
    if (/^\d{5}(\.\d+)?$/.test(s) && +s > 30000 && +s < 60000) {
      const d = new Date(Math.round((+s - 25569) * 86400000));
      return mkDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  };
}

function parseMoney(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  let m, dc = null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
  if ((m = s.match(/(?:^|[^a-zA-Z])(dr|cr|debit|credit|d|c)\.?\s*\)?$/i)) || (m = s.match(/^(dr|cr)\b/i))) {
    dc = /^d/i.test(m[1]) ? 'D' : 'C';
  }
  const num = s.replace(/[,\s]/g, '').match(/\d+(?:\.\d+)?/);
  if (!num) return null;
  const n = parseFloat(num[0]);
  return { v: neg ? -n : n, dc };
}

function sideOf(cell) {
  const s = String(cell || '').trim();
  if (/^(dr|d|debit|withdrawal|wd|paid out|out)\b/i.test(s)) return 'D';
  if (/^(cr|c|credit|deposit|received|in)\b/i.test(s)) return 'C';
  return null;
}

function norm(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function roleOf(h) {
  const n = norm(h);
  if (!n) return null;
  if (/\b(dr cr|cr dr|debit credit|credit debit|dr or cr)\b/.test(n) && !/amount|amt/.test(n)) return 'type';
  if (/^(transaction type|txn type|tran type|type)$/.test(n)) return 'type';

  const hasD = /\b(withdrawal|withdrawals|withdraw|debit|debits|dr|paid out|money out|outflow)\b/.test(n);
  const hasC = /\b(deposit|deposits|credit|credits|cr|paid in|money in|inflow)\b/.test(n);

  if (hasD && hasC) return 'amount';
  if (hasD) return 'debit';
  if (hasC) return 'credit';
  if (/\b(balance|bal|closing)\b/.test(n) && !/opening/.test(n)) return 'balance';
  if (/\b(amount|amt)\b/.test(n) && !/\b(date|dt)\b/.test(n)) return 'amount';
  if (/\b(date|dt)\b/.test(n)) return /value|vlu/.test(n) ? 'date2' : 'date';
  if (/\b(narration|description|particulars|remarks|details|merchant|payee|memo)\b/.test(n)) return 'narration';
  if (/\b(chq|cheque|ref|reference|utr|instrument|txn id|transaction id|tran id)\b/.test(n)) return 'ref';
  if (/\bstatus\b/.test(n)) return 'status';
  return null;
}

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 60); r++) {
    const map = {};
    rows[r].forEach((cell, c) => {
      const role = roleOf(cell);
      if (role && map[role] === undefined) map[role] = c;
    });
    if (map.date === undefined) map.date = map.date2;
    const money = map.debit !== undefined || map.credit !== undefined || map.amount !== undefined;
    if (map.date !== undefined && map.narration !== undefined && money) {
      return { index: r, map, names: rows[r] };
    }
  }
  return null;
}

function guessBank(rows, upto) {
  const text = rows.slice(0, upto + 1).map(r => r.join(' ')).join(' ');
  for (let i = 0; i < BANK_NAMES.length; i++) {
    if (BANK_NAMES[i][0].test(text)) return BANK_NAMES[i][1];
  }
  return 'Your Bank';
}

export function validateBankCsvHeaders(text) {
  if (!text || typeof text !== 'string') return false;
  const lines = text.split(/\r?\n/);
  const dateRegex = /(date|txn\s*date|trans.*date|value\s*date)/i;
  const descRegex = /(narration|description|particulars|details|remarks|merchant)/i;
  const amtRegex = /(debit|dr|withdrawal|amount|spent)/i;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (dateRegex.test(line) && descRegex.test(line) && amtRegex.test(line)) {
      return true;
    }
  }
  return false;
}

export function parseCSV(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) return [];
  const text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  const delim = detectDelimiter(text);
  const rows = parseRows(text, delim);
  const head = findHeader(rows);

  if (!head) {
    const err = new Error('Could not find column headings. A statement CSV needs a Date column, a Narration/Description column, and a Debit or Amount column.');
    err.isUserError = true;
    throw err;
  }

  const m = head.map;
  const data = rows.slice(head.index + 1);
  const toDate = makeDateParser(data.map(r => r[m.date]));
  const items = [];
  const badDates = [];

  data.forEach((r, idx) => {
    const raw = r[m.date];
    if (!raw) return;
    const d = toDate(raw);
    if (!d) {
      if (r.join('').length > 12) badDates.push(raw);
      return;
    }

    if (m.status !== undefined && /fail|reject|revers|declin|cancel|pending|unsuccess|void/i.test(r[m.status] || '')) {
      return;
    }

    const deb = m.debit !== undefined ? parseMoney(r[m.debit]) : null;
    const cre = m.credit !== undefined ? parseMoney(r[m.credit]) : null;
    const amt = m.amount !== undefined ? parseMoney(r[m.amount]) : null;
    const bal = m.balance !== undefined ? parseMoney(r[m.balance]) : null;

    let w = 0;
    let dep = 0;
    let unsure = null;
    let neg = false;

    if (deb || cre) {
      w = deb ? Math.abs(deb.v) : 0;
      dep = cre ? Math.abs(cre.v) : 0;
    } else if (amt) {
      const side = amt.dc || (m.type !== undefined ? sideOf(r[m.type]) : null);
      if (side) {
        if (side === 'D') w = Math.abs(amt.v); else dep = Math.abs(amt.v);
      } else if (amt.v < 0) {
        w = -amt.v;
        neg = true;
      } else {
        unsure = amt.v;
      }
    }

    if (w === 0 && dep === 0 && unsure === null) return;

    items.push({
      id: `txn-${idx}`,
      d,
      narr: r[m.narration] || '',
      ref: m.ref !== undefined ? (r[m.ref] || '') : '',
      w,
      dep,
      unsure,
      neg,
      bal: bal ? bal.v : null
    });
  });

  if (!items.length) {
    if (badDates.length) {
      const err = new Error(`Could not parse dates in the "${head.names[m.date]}" column. Please check file format.`);
      err.isUserError = true;
      throw err;
    }
    return [];
  }

  const haveNeg = items.some(x => x.neg);
  const asc = items[0].d <= items[items.length - 1].d;
  const out = [];

  items.forEach((x, i) => {
    let w = x.w;
    let dep = x.dep;
    if (x.unsure !== null) {
      if (haveNeg) dep = x.unsure;
      else {
        const prev = items[asc ? i - 1 : i + 1];
        const delta = (prev && prev.bal !== null && x.bal !== null) ? x.bal - prev.bal : null;
        if (delta !== null && Math.abs(Math.abs(delta) - x.unsure) < 0.51) {
          if (delta < 0) w = x.unsure; else dep = x.unsure;
        } else {
          return;
        }
      }
    }
    if (!w && !dep) return;
    out.push({
      id: x.id,
      date: x.d,
      transactionDate: x.d.toISOString().slice(0, 10),
      narration: x.narr,
      description: x.narr,
      ref: x.ref,
      amount: w,
      debit: w,
      deposit: dep,
      credit: dep,
      direction: w > 0 ? 'debit' : 'credit',
      balance: x.bal || 0
    });
  });

  out.sort((a, b) => a.date - b.date);
  out.bank = guessBank(rows, head.index);
  return out;
}

export function parseUsageCSV(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) return [];
  const text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  const delim = detectDelimiter(text);
  const rows = parseRows(text, delim);
  let dc = 0, sc = 1, ec = 2, start = 0;

  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    let fd = false, fs = false;
    for (let c = 0; c < rows[r].length; c++) {
      const cell = norm(rows[r][c]);
      if (/\bdate\b/.test(cell)) { dc = c; fd = true; }
      else if (/\b(service|name|app|merchant)\b/.test(cell)) { sc = c; fs = true; }
      else if (/\b(event|action|type|activity)\b/.test(cell)) ec = c;
    }
    if (fd && fs) { start = r + 1; break; }
  }

  const body = rows.slice(start);
  const toDate = makeDateParser(body.map(x => x[dc]));
  const events = [];

  body.forEach(x => {
    const d = toDate(x[dc]);
    const service = (x[sc] || '').trim();
    if (d && service) {
      events.push({
        date: d,
        eventDate: d.toISOString().slice(0, 10),
        service,
        merchantKey: service.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        event: (x[ec] || '').trim()
      });
    }
  });

  return events;
}
