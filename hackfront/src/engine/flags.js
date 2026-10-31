/**
 * flags.js — Correlates usage logs and flags subscriptions (hike, unused, trial, ended, active)
 */

export function applyFlags(subscriptions, usageEvents = []) {
  if (!Array.isArray(subscriptions)) return [];

  const usageByMerchant = {};
  if (Array.isArray(usageEvents)) {
    usageEvents.forEach(u => {
      const k = u.merchantKey || (u.service ? u.service.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
      if (!usageByMerchant[k]) usageByMerchant[k] = [];
      usageByMerchant[k].push(u);
    });
  }

  return subscriptions.map(sub => {
    const s = { ...sub };
    const merchantUsage = usageByMerchant[s.merchantKey] || usageByMerchant[s.id] || [];

    // 1. If user already has a hike flag from recurring detection, preserve it unless unused takes precedence
    if (s.was && s.price > s.was) {
      s.status = { kind: 'hike', label: 'Price hike' };
    }

    // 2. Usage Dormancy check: if usage log provided, check if no activity in last 60 days
    if (merchantUsage.length > 0) {
      const sortedUsage = merchantUsage.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latestUsage = new Date(sortedUsage[0].date);
      const daysSinceUsage = Math.round((Date.now() - latestUsage.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceUsage > 60) {
        s.status = { kind: 'unused', label: 'Likely unused' };
        s.evidence = [
          ...(s.evidence || []),
          `No activity logged in the past ${daysSinceUsage} days (last active: ${latestUsage.toISOString().slice(0, 10)}).`
        ];
      }
    } else if (usageEvents && usageEvents.length > 0) {
      // If a usage CSV was uploaded but this service has zero usage recorded:
      if (s.status.kind === 'active') {
        s.status = { kind: 'unused', label: 'Likely unused' };
        s.evidence = [
          ...(s.evidence || []),
          'No activity events recorded for this service in the uploaded usage log.'
        ];
      }
    }

    return s;
  });
}
