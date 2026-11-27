// Tests for src/games/hop-away.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/hop-away.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (level, days = 730) => {
  const all = [];
  everyDay((key) => all.push(...generate(seedFor(key, 'hop-away'), level).rounds), days);
  return all;
};

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'hop-away'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'hop-away');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels start with up to 10, 15, and 20; level 1 always leaves one, and 3 to 10 hop away at level 3', () => {
  const most = (level) => Math.max(...rounds(level).map(({ start }) => start));
  const fewestLeft = (level) => Math.min(...rounds(level).map(({ start, away }) => start - away));
  const away = rounds(3).map((round) => round.away);
  assert.deepEqual([most(1), most(2), most(3)], [10, 15, 20]);
  assert.deepEqual([fewestLeft(1), fewestLeft(2), fewestLeft(3)], [1, 0, 0]);
  assert.deepEqual([Math.min(...away), Math.max(...away)], [3, 10]);
  assert.equal(Math.min(...rounds(3).map(({ start }) => start)), 10);
});

test('only the card for how many are left is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'hop-away'), 1).rounds;
  assert.equal(check(round, round.start - round.away), true);
  for (const choice of round.choices.filter((n) => n !== round.start - round.away)) assert.equal(check(round, choice), false);
});

test('verify catches a round with no right answer, and one where too many hop away', () => {
  const seed = seedFor('2026-11-26', 'hop-away');
  const noAnswer = generate(seed, 1);
  const [first] = noAnswer.rounds;
  first.choices = first.choices.map((n) => (n === first.start - first.away ? 99 : n));
  assert.equal(verify(noAnswer).ok, false);
  const noneLeft = generate(seed, 1);
  noneLeft.rounds[0].away = noneLeft.rounds[0].start;
  assert.equal(verify(noneLeft).ok, false);
});
