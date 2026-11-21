import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getCancellationCandidates } from './cancellationCandidates.js';

test('cancel guides list active payments with saved choices and statement flags first', () => {
  const subscriptions = [
    { id: 'hike', status: { kind: 'hike' } },
    { id: 'active', status: { kind: 'active' } },
    { id: 'trial', status: { kind: 'trial' } },
    { id: 'ordinary', status: { kind: 'active' } },
    { id: 'kept', status: { kind: 'unused' } },
    { id: 'later', status: { kind: 'hike' } },
    { id: 'ended', status: { kind: 'ended' } },
    { id: 'cancelled', status: { kind: 'unused' } }
  ];
  const decisions = {
    active: 'consider_cancelling',
    kept: 'keep',
    later: 'review',
    ended: 'consider_cancelling'
  };
  const cancelled = { cancelled: Date.now() };

  assert.deepEqual(
    getCancellationCandidates(subscriptions, decisions, cancelled).map(sub => sub.id),
    ['active', 'hike', 'trial', 'ordinary', 'later']
  );
});
