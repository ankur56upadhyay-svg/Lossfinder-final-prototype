export const money = value => '₹' + Math.round(Number(value) || 0).toLocaleString('en-IN');
export const annualCost = sub => sub.status?.kind === 'ended' ? 0 : (sub.per === 'yr' ? sub.price : sub.price * 12);

export function attentionRank(sub) {
  if (sub.status?.kind === 'hike' || (Number.isFinite(sub.was) && sub.was < sub.price)) return 0;
  if (sub.status?.kind === 'trial') return 1;
  if (sub.status?.kind === 'ended') return 3;
  return 2;
}

export function paymentReason(sub) {
  if (Number.isFinite(sub.was) && sub.was < sub.price) return `Price rose from ${money(sub.was)} to ${money(sub.price)}.`;
  if (sub.status?.kind === 'trial') return 'A trial charge was followed by a full-price payment.';
  return '';
}

export function reportCsv(subs, decisions = {}, cancelledMap = {}) {
  const quote = value => {
    const raw = String(value ?? '');
    const safe = typeof value === 'string' && /^[\s\t\r\n]*[=+\-@]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const rows = [['Service', 'Narration', 'Category', 'Amount INR', 'Frequency', 'Annual cost INR', 'Status', 'Decision', 'Marked cancelled']];
  subs.forEach(sub => rows.push([
    sub.name, sub.code || '', sub.category || sub.what || 'Other', sub.price,
    sub.per === 'yr' ? 'Yearly' : 'Monthly', annualCost(sub),
    ['unused', 'unknown'].includes(sub.status?.kind) ? 'Active' : sub.status?.label || 'Active', decisions[sub.id] || '', cancelledMap[sub.id] ? 'Yes' : 'No'
  ]));
  return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
}
