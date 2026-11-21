import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdfTextPages } from './pdfStatement.js';

function item(str, x, y) {
  return { str, transform: [1, 0, 0, 1, x, y], width: str.length * 5 };
}

test('reads a positioned PDF transaction table without losing debit and credit direction', () => {
  const page = [
    item('HDFC Bank', 20, 800),
    item('Date', 20, 750), item('Narration', 125, 750), item('Debit', 315, 750), item('Credit', 395, 750), item('Balance', 480, 750),
    item('01/10/2026', 20, 720), item('NETFLIX MUMBAI', 125, 720), item('649.00', 315, 720), item('9,351.00', 480, 720),
    item('02/10/2026', 20, 690), item('SALARY CREDIT', 125, 690), item('50,000.00', 395, 690), item('59,351.00', 480, 690),
  ];
  const result = parsePdfTextPages([page]);
  assert.equal(result.length, 2);
  assert.equal(result[0].transactionDate, '2026-10-01');
  assert.equal(result[0].amount, 649);
  assert.equal(result[0].direction, 'debit');
  assert.equal(result[1].direction, 'credit');
  assert.equal(result[1].deposit, 50000);
});

test('supports signed amount columns with Dr and Cr markers', () => {
  const page = [
    item('Date', 20, 700), item('Description', 125, 700), item('Amount', 350, 700),
    item('10/11/2026', 20, 670), item('Spotify Premium', 125, 670), item('119.00 Dr', 350, 670),
    item('11/11/2026', 20, 640), item('Refund', 125, 640), item('50.00 Cr', 350, 640),
  ];
  const result = parsePdfTextPages([page]);
  assert.equal(result.length, 2);
  assert.equal(result[0].amount, 119);
  assert.equal(result[1].deposit, 50);
});

test('rejects scanned or unreadable PDFs and ambiguous amount rows', () => {
  assert.throws(() => parsePdfTextPages([[]]), /scanned image PDFs/);
  const page = [
    item('Date', 20, 700), item('Description', 125, 700), item('Amount', 350, 700),
    item('10/11/2026', 20, 670), item('Unknown payment', 125, 670), item('119.00', 350, 670),
  ];
  assert.throws(() => parsePdfTextPages([page]), /could be interpreted/);
});

test('extracts positioned text from an actual PDF before parsing transactions', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const entries = [
    ['Date', 20, 750], ['Narration', 125, 750], ['Debit', 315, 750], ['Credit', 395, 750],
    ['01/10/2026', 20, 720], ['NETFLIX MUMBAI', 125, 720], ['649.00', 315, 720],
    ['02/10/2026', 20, 690], ['SALARY CREDIT', 125, 690], ['50000.00', 395, 690],
  ];
  const content = entries.map(([value, x, y]) => `BT /F1 12 Tf ${x} ${y} Td (${value}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const task = getDocument({ data: new TextEncoder().encode(pdf), useSystemFonts: true, isEvalSupported: false });
  try {
    const document = await task.promise;
    const text = await (await document.getPage(1)).getTextContent();
    const rows = parsePdfTextPages([text.items]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].amount, 649);
    assert.equal(rows[1].deposit, 50000);
  } finally {
    await task.destroy();
  }
});
