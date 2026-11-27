// Tests for src/games/patterns.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS, meta } from '../src/games/patterns.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const LEVELS = [1, 2, 3, 4];

test('every day for two years, at every level, each round can be answered', () => {
  assert.equal(meta.levels, LEVELS.length);
  everyDay((key) => {
    for (const level of LEVELS) assertValid(verify(generate(seedFor(key, 'patterns'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'patterns');
  assert.deepEqual(generate(seed, 2), generate(seed, 2));
  assert.equal(generate(seed, 2).rounds.length, ROUNDS);
});

test('levels use 2 or 3 kinds with 3 cards, then up to 4 kinds with 4 cards, and the gap moves into the row at the top', () => {
  const kinds = LEVELS.map(() => new Set());
  const inside = LEVELS.map(() => 0);
  everyDay((key) => {
    LEVELS.forEach((level, i) => {
      for (const { row, gap, choices } of generate(seedFor(key, 'patterns'), level).rounds) {
        kinds[i].add(new Set(row).size);
        assert.equal(choices.length, level === 1 ? 3 : 4);
        if (gap !== row.length) inside[i]++;
      }
    });
  }, 60);
  assert.deepEqual(kinds.map((set) => [...set].sort()), [[2, 3], [2, 3], [2, 3], [3, 4]]);
  assert.deepEqual(inside.map((count) => count > 60), [false, false, true, true]);
  assert.equal(inside[0] + inside[1], 0);
});

test('only the card that fits the gap is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'patterns'), 3).rounds;
  assert.equal(check(round, round.answer), true);
  for (const choice of round.choices.filter((kind) => kind !== round.answer)) assert.equal(check(round, choice), false);
});

test('verify catches a wrong answer, a row that does not repeat, and a gap inside the row too early', () => {
  const seed = seedFor('2026-11-26', 'patterns');
  const wrong = generate(seed, 1);
  wrong.rounds[0].answer = wrong.rounds[0].choices.find((kind) => kind !== wrong.rounds[0].answer);
  assert.equal(verify(wrong).ok, false);
  const broken = generate(seed, 4);
  broken.rounds[0].row.reverse();
  assert.equal(verify(broken).ok, false);
  const early = generate(seed, 1);
  const round = early.rounds[0];
  round.row.push(round.answer);
  round.answer = round.row.shift();
  round.gap = 0;
  assert.equal(verify(early).ok, false);
});
