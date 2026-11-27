// Tests for src/games/more-or-fewer.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/more-or-fewer.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const day = (key, level) => generate(seedFor(key, 'more-or-fewer'), level);

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3, 4]) assertValid(verify(day(key, level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(day('2026-11-26', 2), day('2026-11-26', 2));
  assert.equal(day('2026-11-26', 2).rounds.length, ROUNDS);
});

test('levels: 2 or more apart within 10, exactly 1 apart within 10, 1 to 3 apart within 20, then make the same within 15', () => {
  let most = 0;
  everyDay((key) => {
    for (const { ask, pads: [a, b] } of day(key, 1).rounds) assert.ok(ask !== 'same' && Math.abs(a - b) >= 2 && Math.max(a, b) <= 10, key);
    for (const { ask, pads: [a, b] } of day(key, 2).rounds) assert.ok(ask !== 'same' && Math.abs(a - b) === 1 && Math.max(a, b) <= 10, key);
    for (const { ask, pads: [a, b] } of day(key, 3).rounds) {
      assert.ok(ask !== 'same' && Math.abs(a - b) >= 1 && Math.abs(a - b) <= 3 && Math.max(a, b) <= 20, key);
      most = Math.max(most, a, b);
    }
    for (const { ask, pads: [a, b] } of day(key, 4).rounds) assert.ok(ask === 'same' && a !== b && Math.max(a, b) <= 15, key);
  }, 60);
  assert.equal(most, 20);
});

test('only the pad with more (or fewer) is right', () => {
  assert.equal(check({ ask: 'more', pads: [2, 5] }, 1), true);
  assert.equal(check({ ask: 'more', pads: [2, 5] }, 0), false);
  assert.equal(check({ ask: 'fewer', pads: [2, 5] }, 0), true);
  assert.equal(check({ ask: 'fewer', pads: [2, 5] }, 1), false);
});

test('"same" is right only when the second pad holds as many as the first', () => {
  const round = { ask: 'same', pads: [4, 6] };
  assert.equal(check(round, 4), true);
  for (const count of [0, 3, 5, 6]) assert.equal(check(round, count), false);
});

test('verify catches a broken puzzle', () => {
  const equal = day('2026-11-26', 1);
  equal.rounds[0].pads = [3, 3];
  assert.equal(verify(equal).ok, false);
  const started = day('2026-11-26', 4);
  started.rounds[0].pads = [5, 5];
  assert.equal(verify(started).ok, false);
  const tooMany = day('2026-11-26', 1);
  tooMany.rounds[0].pads = [2, 12];
  assert.equal(verify(tooMany).ok, false);
});
