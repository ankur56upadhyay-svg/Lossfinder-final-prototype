const flaggedKinds = new Set(['hike', 'trial']);
const inactiveKinds = new Set(['ended', 'cancelled', 'ignored']);

export function getCancellationCandidates(subscriptions, reviewDecisions = {}, cancelledMap = {}) {
  const active = subscriptions.filter(sub =>
    !cancelledMap[sub.id] &&
    !inactiveKinds.has(sub.status?.kind) &&
    reviewDecisions[sub.id] !== 'keep'
  );
  const chosen = active.filter(sub => reviewDecisions[sub.id] === 'consider_cancelling');
  const flagged = active.filter(sub =>
    !reviewDecisions[sub.id] && flaggedKinds.has(sub.status?.kind)
  );
  const other = active.filter(sub =>
    reviewDecisions[sub.id] !== 'consider_cancelling' &&
    (reviewDecisions[sub.id] || !flaggedKinds.has(sub.status?.kind))
  );
  return [...chosen, ...flagged, ...other];
}
