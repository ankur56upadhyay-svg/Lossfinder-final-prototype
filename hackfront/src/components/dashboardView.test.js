import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionRank, potentialSavings, reportCsv } from './dashboardView.js';

test('attention sorts hikes, unused, active and ended', () => {
  const kinds = ['active', 'ended', 'unused', 'hike'];
  assert.deepEqual(kinds.sort((a,b) => attentionRank({status:{kind:a}}) - attentionRank({status:{kind:b}})), ['hike','unused','active','ended']);
});

test('potential savings uses hike difference and likely unused annual cost', () => {
  assert.equal(potentialSavings([
    { price: 649, was: 499, per: 'mo', status: {kind:'hike'} },
    { price: 1850, per: 'mo', status: {kind:'unused'} }
  ]), 24000);
});

test('report quotes merchant names and has Indian rupee values as numeric columns', () => {
  const csv = reportCsv([{id:'a', name:'A, "Plus"', price:119, per:'mo', status:{kind:'active'}}, {id:'b', name:'=2+2', price:1, per:'mo'}]);
  assert.match(csv, /"A, ""Plus"""/);
  assert.match(csv, /"1428"/);
  assert.match(csv, /"'=2\+2"/);
});
