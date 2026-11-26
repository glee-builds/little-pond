// Tests for src/games/how-many.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/how-many.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'how-many'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'how-many');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels count to 3, to 5, and to 10', () => {
  const most = (level) => {
    let top = 0;
    everyDay((key) => { for (const { count } of generate(seedFor(key, 'how-many'), level).rounds) top = Math.max(top, count); }, 60);
    return top;
  };
  assert.deepEqual([most(1), most(2), most(3)], [3, 5, 10]);
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
