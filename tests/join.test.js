// Tests for src/games/join.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/join.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (level, days = 60) => {
  const all = [];
  everyDay((key) => all.push(...generate(seedFor(key, 'join'), level).rounds), days);
  return all;
};
const spread = (numbers) => [Math.min(...numbers), Math.max(...numbers)];

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'join'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'join');
  for (const level of [1, 2, 3]) assert.deepEqual(generate(seed, level), generate(seed, level));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels join 4 to 10, split 5 to 10, then join 11 to 20 with up to 10 on a pad', () => {
  assert.deepEqual(spread(rounds(1).map(({ a, b }) => a + b)), [4, 10]);
  assert.deepEqual(spread(rounds(2).map(({ whole }) => whole)), [5, 10]);
  assert.deepEqual(spread(rounds(3).map(({ a, b }) => a + b)), [11, 20]);
  assert.deepEqual(spread(rounds(3).flatMap(({ a, b }) => [a, b])), [1, 10]);
});

test('a day never splits the same number twice', () => {
  everyDay((key) => {
    const wholes = generate(seedFor(key, 'join'), 2).rounds.map(({ whole }) => whole);
    assert.equal(new Set(wholes).size, ROUNDS, key);
  });
});

test('joining: only the card for how many in all is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'join'), 1).rounds;
  assert.equal(check(round, round.a + round.b), true);
  for (const choice of round.choices.filter((n) => n !== round.a + round.b)) assert.equal(check(round, choice), false);
});

test('splitting: any two groups that use every duckling are right', () => {
  const round = { whole: 6 };
  for (const a of [1, 2, 3, 4, 5]) assert.equal(check(round, [a, 6 - a]), true);
  assert.equal(check(round, [6, 0]), false);
  assert.equal(check(round, [0, 6]), false);
  assert.equal(check(round, [2, 3]), false); // one still on the bank
});

test('verify catches a round with no right answer, a number split twice, and a pad over 10', () => {
  const joining = generate(seedFor('2026-11-26', 'join'), 1);
  const { a, b } = joining.rounds[0];
  joining.rounds[0].choices = joining.rounds[0].choices.map((n) => (n === a + b ? 99 : n));
  assert.equal(verify(joining).ok, false);
  const splitting = generate(seedFor('2026-11-26', 'join'), 2);
  splitting.rounds[1].whole = splitting.rounds[0].whole;
  assert.equal(verify(splitting).ok, false);
  const crowded = generate(seedFor('2026-11-26', 'join'), 3);
  crowded.rounds[0] = { ...crowded.rounds[0], a: 11, b: crowded.rounds[0].a + crowded.rounds[0].b - 11 };
  assert.equal(verify(crowded).ok, false);
});
