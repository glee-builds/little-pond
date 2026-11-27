// Tests for src/games/how-many.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/how-many.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3, 4]) assertValid(verify(generate(seedFor(key, 'how-many'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'how-many');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels count from 3 to 6, 5 to 10, 8 to 15, and 11 to 20', () => {
  const counts = (level) => {
    const all = [];
    everyDay((key) => all.push(...generate(seedFor(key, 'how-many'), level).rounds.map(({ count }) => count)), 60);
    return [Math.min(...all), Math.max(...all)];
  };
  assert.deepEqual([counts(1), counts(2), counts(3), counts(4)], [[3, 6], [5, 10], [8, 15], [11, 20]]);
});

test('only the card with the same number of dots is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'how-many'), 1).rounds;
  assert.equal(check(round, round.count), true);
  for (const choice of round.choices.filter((n) => n !== round.count)) assert.equal(check(round, choice), false);
});

test('verify catches a round with no right answer', () => {
  const puzzle = generate(seedFor('2026-11-26', 'how-many'), 1);
  puzzle.rounds[0].choices = puzzle.rounds[0].choices.map((n) => (n === puzzle.rounds[0].count ? 99 : n));
  assert.equal(verify(puzzle).ok, false);
});
