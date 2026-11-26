// Tests for src/games/match-the-number.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/match-the-number.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const day = (key, level) => generate(seedFor(key, 'match-the-number'), level);

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(day(key, level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(day('2026-11-26', 2), day('2026-11-26', 2));
  assert.equal(day('2026-11-26', 2).rounds.length, ROUNDS);
});

test('levels go to 3, to 5, and to 10', () => {
  const most = (level) => {
    let top = 0;
    everyDay((key) => { for (const { pads } of day(key, level).rounds) top = Math.max(top, ...pads); }, 60);
    return top;
  };
  assert.deepEqual([most(1), most(2), most(3)], [3, 5, 10]);
});

test('at the top level the pads are within 2 of the answer', () => {
  everyDay((key) => {
    for (const { count, pads } of day(key, 3).rounds) assert.ok(pads.every((n) => Math.abs(n - count) <= 2), key);
  }, 60);
});

test('only the pad with that many ducklings is right', () => {
  const round = { count: 4, pads: [3, 4, 5] };
  assert.equal(check(round, 1), true);
  assert.equal(check(round, 0), false);
  assert.equal(check(round, 2), false);
});

test('verify catches a broken puzzle', () => {
  const none = day('2026-11-26', 2);
  none.rounds[0].count = 99;
  assert.equal(verify(none).ok, false);
  const twins = day('2026-11-26', 2);
  twins.rounds[0].pads = [twins.rounds[0].count, twins.rounds[0].count, 1];
  assert.equal(verify(twins).ok, false);
});
