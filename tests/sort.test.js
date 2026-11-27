// Tests for src/games/sort.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/sort.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const today = (level) => generate(seedFor('2026-11-26', 'sort'), level);

test('every day for two years, at every level, each round can be sorted', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3, 4]) assertValid(verify(generate(seedFor(key, 'sort'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(today(2), today(2));
  assert.equal(today(2).rounds.length, ROUNDS);
});

test('levels have 2, 3, then 4 pads, with more things each time', () => {
  const seen = [1, 2, 3, 4].map((level) => {
    const rounds = [];
    everyDay((key) => rounds.push(...generate(seedFor(key, 'sort'), level).rounds), 30);
    const counts = rounds.map(({ things }) => things.length);
    return [new Set(rounds.map(({ pads }) => pads.length)).size === 1 && rounds[0].pads.length, Math.min(...counts), Math.max(...counts)];
  });
  assert.deepEqual(seen, [[2, 6, 7], [3, 7, 9], [4, 8, 10], [4, 11, 12]]);
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
  puzzle.rounds[0].things[0] = ['duck', 'fish', 'frog', 'bug'].find((kind) => !puzzle.rounds[0].pads.includes(kind));
  assert.equal(verify(puzzle).ok, false);
});
