// Tests for src/games/patterns.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/patterns.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'patterns'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'patterns');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels use 2 kinds with 2 cards, 2 kinds with 3 cards, then 3 kinds', () => {
  everyDay((key) => {
    [[2, 2], [2, 3], [3, 3]].forEach(([kinds, cards], i) => {
      for (const { row, choices } of generate(seedFor(key, 'patterns'), i + 1).rounds) {
        assert.equal(new Set(row).size, kinds);
        assert.equal(choices.length, cards);
      }
    });
  }, 60);
});

test('only the card that carries the pattern on is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'patterns'), 2).rounds;
  assert.equal(check(round, round.answer), true);
  for (const choice of round.choices.filter((kind) => kind !== round.answer)) assert.equal(check(round, choice), false);
});

test('verify catches a wrong answer and a row that does not repeat', () => {
  const seed = seedFor('2026-11-26', 'patterns');
  const wrong = generate(seed, 1);
  wrong.rounds[0].answer = wrong.rounds[0].choices.find((kind) => kind !== wrong.rounds[0].answer);
  assert.equal(verify(wrong).ok, false);
  const broken = generate(seed, 3);
  broken.rounds[0].row.reverse();
  assert.equal(verify(broken).ok, false);
});
