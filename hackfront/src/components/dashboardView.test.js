import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionRank, reportCsv } from './dashboardView.js';

test('attention sorts hikes and trials before active and ended', () => {
  const kinds = ['active', 'ended', 'trial', 'hike'];
  assert.deepEqual(kinds.sort((a,b) => attentionRank({status:{kind:a}}) - attentionRank({status:{kind:b}})), ['hike','trial','active','ended']);
});

test('report quotes merchant names and has Indian rupee values as numeric columns', () => {
  const csv = reportCsv([{id:'a', name:'A, "Plus"', price:119, per:'mo', status:{kind:'active'}}, {id:'b', name:'=2+2', price:1, per:'mo'}]);
  assert.match(csv, /"A, ""Plus"""/);
  assert.match(csv, /"1428"/);
  assert.match(csv, /"'=2\+2"/);
});
