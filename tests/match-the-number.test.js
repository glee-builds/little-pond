// Tests for src/games/match-the-number.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/match-the-number.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const day = (key, level) => generate(seedFor(key, 'match-the-number'), level);

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3, 4]) assertValid(verify(day(key, level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(day('2026-11-26', 2), day('2026-11-26', 2));
  assert.equal(day('2026-11-26', 2).rounds.length, ROUNDS);
});

test('levels go 1 to 6, 1 to 10, 5 to 15, and 10 to 20', () => {
  const spread = (level) => {
    const all = [];
    everyDay((key) => { for (const { pads } of day(key, level).rounds) all.push(...pads); }, 60);
    return [Math.min(...all), Math.max(...all)];
  };
  assert.deepEqual([1, 2, 3, 4].map(spread), [[1, 6], [1, 10], [5, 15], [10, 20]]);
});

test('from level 2 the pads are within 2 of the answer', () => {
  everyDay((key) => {
    for (const level of [2, 3, 4]) {
      for (const { count, pads } of day(key, level).rounds) assert.ok(pads.every((n) => Math.abs(n - count) <= 2), key);
    }
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
