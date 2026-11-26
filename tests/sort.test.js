// Tests for src/games/sort.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/sort.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const today = (level) => generate(seedFor('2026-11-26', 'sort'), level);

test('every day for two years, at every level, each round can be sorted', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'sort'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(today(2), today(2));
  assert.equal(today(2).rounds.length, ROUNDS);
});

test('levels have 2 pads of sizes, 2 pads of kinds, then 3 pads and 6 things', () => {
  assert.ok(today(1).rounds.every(({ pads }) => [...pads].sort().join() === 'big,small'));
  assert.ok(today(2).rounds.every(({ pads }) => pads.length === 2 && !pads.includes('big')));
  assert.ok(today(3).rounds.every(({ pads, things }) => pads.length === 3 && things.length === 6));
});

test('only every thing on its own pad is right', () => {
  const [round] = today(3).rounds;
  const sorted = round.things.map((kind) => round.pads.indexOf(kind));
  assert.equal(check(round, sorted), true);
  assert.equal(check(round, sorted.with(0, (sorted[0] + 1) % 3)), false);
  assert.equal(check(round, sorted.with(0, null)), false);
});

test('verify catches a thing with no pad', () => {
  const puzzle = today(2);
  puzzle.rounds[0].things[0] = 'big';
  assert.equal(verify(puzzle).ok, false);
});
