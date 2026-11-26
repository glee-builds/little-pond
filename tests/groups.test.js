// Tests for src/games/groups.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/groups.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (level, days = 60) => {
  const all = [];
  everyDay((key) => all.push(...generate(seedFor(key, 'groups'), level).rounds), days);
  return all;
};

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'groups'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'groups');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels: 2 pads, 3 pads (at most 9 ducklings), then fair sharing (at most 10)', () => {
  assert.ok(rounds(1).every(({ pads, each, fair }) => pads === 2 && each <= 3 && !fair));
  assert.ok(rounds(2).every(({ pads, each, fair }) => pads === 3 && each <= 3 && !fair));
  assert.ok(rounds(3).every(({ pads, each, fair }) => fair && pads * each <= 10));
  assert.equal(Math.max(...rounds(3).map(({ pads, each }) => pads * each)), 10);
});

test('only the same number on every pad is right', () => {
  const round = { pads: 3, each: 2, fair: true };
  assert.equal(check(round, [2, 2, 2]), true);
  assert.equal(check(round, [3, 2, 1]), false);
  assert.equal(check(round, [6, 0, 0]), false);
  assert.equal(check(round, [1, 1, 1]), false); // some still on the bank
});

test('verify catches a round that is not one of its level\'s', () => {
  const puzzle = generate(seedFor('2026-11-26', 'groups'), 1);
  puzzle.rounds[0].each = 7;
  assert.equal(verify(puzzle).ok, false);
});
