const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.COOKIE_SECURE = 'false';

const app = require('../app');
const importRepository = require('../repositories/importRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');
const subscriptionRepository = require('../repositories/subscriptionRepository');

let server;
let baseUrl;

before(async () => {
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('analysis history and decisions remain separated by owner and import', async () => {
  const originals = {
    list: importRepository.getImportsByUser,
    get: importRepository.getImportById,
    save: importRepository.saveAnalysisSnapshot,
    detect: subscriptionDetectionService.analyzeForUser,
    priorSubscriptions: subscriptionRepository.getSubscriptionsByUser
  };
  const rows = new Map([
    ['imp_first', { importId: 'imp_first', owner: 'usr_one', bankName: 'First bank', analysisJson: JSON.stringify([{ id: 'netflix', merchantKey: 'netflix', name: 'Netflix', reviewDecision: null, cancelled: false }]) }],
    ['imp_second', { importId: 'imp_second', owner: 'usr_one', bankName: 'Second bank', analysisJson: JSON.stringify([{ id: 'spotify', merchantKey: 'spotify', name: 'Spotify', reviewDecision: null, cancelled: false }]) }],
    ['imp_other', { importId: 'imp_other', owner: 'usr_other', bankName: 'Other bank', analysisJson: '[]' }],
    ['imp_legacy', { importId: 'imp_legacy', owner: 'usr_one', bankName: 'Older bank', analysisJson: null }]
  ]);
  const detectedIds = [];
  importRepository.getImportsByUser = async userId => [...rows.values()]
    .filter(item => item.owner === userId)
    .map(({ analysisJson, owner, ...item }) => item);
  importRepository.getImportById = async (userId, id) => {
    const item = rows.get(id);
    return item?.owner === userId ? { ...item } : null;
  };
  importRepository.saveAnalysisSnapshot = async (userId, id, subs) => {
    const item = rows.get(id);
    if (item?.owner !== userId) return false;
    item.analysisJson = JSON.stringify(subs);
    return true;
  };
  subscriptionDetectionService.analyzeForUser = async (userId, options) => {
    detectedIds.push([userId, options]);
    return [{ merchantKey: 'cloud', name: 'Cloud storage' }];
  };
  subscriptionRepository.getSubscriptionsByUser = async userId => {
    assert.equal(userId, 'usr_one');
    return [{ id: 'cloud', reviewDecision: 'keep', userOverrideStatus: 'ended' }];
  };

  const token = jwt.sign({ userId: 'usr_one', email: 'one@example.com' }, process.env.JWT_SECRET);
  const headers = { Cookie: `af_token=${token}`, Origin: 'http://localhost:3000' };
  const url = path => `${baseUrl}/api/imports${path}`;

  try {
    const guest = await fetch(url('/'));
    assert.equal(guest.status, 401);

    const history = await fetch(url('/'), { headers });
    assert.equal(history.status, 200);
    assert.deepEqual((await history.json()).imports.map(item => item.importId).sort(), ['imp_first', 'imp_legacy', 'imp_second']);

    const first = await fetch(url('/imp_first/analysis'), { headers });
    assert.deepEqual((await first.json()).subs.map(sub => sub.id), ['netflix']);
    const second = await fetch(url('/imp_second/analysis'), { headers });
    assert.deepEqual((await second.json()).subs.map(sub => sub.id), ['spotify']);

    const other = await fetch(url('/imp_other/analysis'), { headers });
    assert.equal(other.status, 404);
    const otherWrite = await fetch(url('/imp_other/analysis/spotify'), {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewDecision: 'keep' })
    });
    assert.equal(otherWrite.status, 404);

    const patch = await fetch(url('/imp_first/analysis/netflix'), {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewDecision: 'review', cancelled: true })
    });
    assert.equal(patch.status, 200);
    const updated = await fetch(url('/imp_first/analysis'), { headers });
    assert.deepEqual((await updated.json()).subs.map(sub => [sub.reviewDecision, sub.cancelled]), [['review', true]]);
    const unchanged = await fetch(url('/imp_second/analysis'), { headers });
    assert.equal((await unchanged.json()).subs[0].reviewDecision, null);

    rows.delete('imp_first');
    rows.delete('imp_second');
    const legacy = await fetch(url('/imp_legacy/analysis'), { headers });
    assert.deepEqual((await legacy.json()).subs.map(sub => [sub.id, sub.reviewDecision, sub.cancelled]), [['cloud', 'keep', true]]);
    assert.deepEqual(detectedIds, [['usr_one', { importId: 'imp_legacy', persist: false }]]);
    assert.ok(rows.get('imp_legacy').analysisJson);
  } finally {
    importRepository.getImportsByUser = originals.list;
    importRepository.getImportById = originals.get;
    importRepository.saveAnalysisSnapshot = originals.save;
    subscriptionDetectionService.analyzeForUser = originals.detect;
    subscriptionRepository.getSubscriptionsByUser = originals.priorSubscriptions;
  }
});
