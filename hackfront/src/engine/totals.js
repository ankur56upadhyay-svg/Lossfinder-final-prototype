/**
 * totals.js — Computes summary metrics for Dashboard and Analytics
 */

export function computeTotals(subs = []) {
  let yearlySpend = 0;
  let hikeExtra = 0;
  let unusedAmount = 0;
  let hikeCount = 0;
  let unusedCount = 0;

  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    const isMonthly = s.per !== 'yr';
    const isEnded = s.status && s.status.kind === 'ended';
    const hasHike = typeof s.was === 'number' && s.price > s.was;
    const isUnused = s.status && (s.status.kind === 'unused' || s.status.kind === 'unknown');

    // 1. Total yearly spend for non-ended subscriptions
    if (!isEnded) {
      yearlySpend += isMonthly ? (s.price * 12) : s.price;
    }

    // 2. Extra cost from price increases
    if (hasHike) {
      const diff = s.price - s.was;
      hikeExtra += isMonthly ? (diff * 12) : diff;
      hikeCount++;
    } else if (s.status && s.status.kind === 'hike') {
      hikeCount++;
    }

    // 3. Unused or unknown usage spend
    if (isUnused && !isEnded) {
      unusedAmount += isMonthly ? (s.price * 12) : s.price;
      unusedCount++;
    }
  }

  return {
    yearlySpend,
    hikeExtra,
    unusedAmount,
    hikeCount,
    unusedCount
  };
}
