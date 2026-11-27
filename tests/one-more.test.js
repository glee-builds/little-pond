// Tests for src/games/one-more.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/one-more.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (level) => {
  const all = [];
  everyDay((key) => all.push(...generate(seedFor(key, 'one-more'), level).rounds));
  return all;
};

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'one-more'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'one-more');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('every level mixes one more and one less; the cards run 1 to 10, 5 to 15, and 10 to 20', () => {
  const steps = (level) => [...new Set(rounds(level).map(({ step }) => step))].sort().join();
  const shown = (level) => rounds(level).flatMap(({ choices }) => choices);
  assert.deepEqual([steps(1), steps(2), steps(3)], ['-1,1', '-1,1', '-1,1']);
  for (const [level, fewest, most] of [[1, 1, 10], [2, 5, 15], [3, 10, 20]]) {
    assert.equal(Math.min(...shown(level)), fewest);
    assert.equal(Math.max(...shown(level)), most);
  }
});

test('one more is the next number, one less the one before', () => {
  for (const round of generate(seedFor('2026-11-26', 'one-more'), 3).rounds) {
    assert.equal(check(round, round.start + round.step), true);
    assert.equal(check(round, round.start), false);
    assert.equal(check(round, round.start - round.step), false);
  }
});

test('verify catches choices that are not the three neighbours, and a step of 2', () => {
  const seed = seedFor('2026-11-26', 'one-more');
  const spread = generate(seed, 1);
  spread.rounds[0].choices[0] += 5;
  assert.equal(verify(spread).ok, false);
  const two = generate(seed, 1);
  two.rounds[0].step = 2;
  assert.equal(verify(two).ok, false);
});
