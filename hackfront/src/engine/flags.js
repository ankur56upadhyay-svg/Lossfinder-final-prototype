/** Preserve recurring-payment flags and mark detected price rises. */
export function applyFlags(subscriptions) {
  if (!Array.isArray(subscriptions)) return [];
  return subscriptions.map(sub => ({
    ...sub,
    status: sub.was && sub.price > sub.was ? { kind: 'hike', label: 'Price hike' } : sub.status
  }));
}
