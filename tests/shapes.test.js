// Tests for src/games/shapes.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/shapes.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (key, level) => generate(seedFor(key, 'shapes'), level).rounds;

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'shapes'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'shapes');
  assert.deepEqual(generate(seed, 3), generate(seed, 3));
  assert.equal(generate(seed, 3).rounds.length, ROUNDS);
});

test('levels show 3 shapes, 4 shapes, then 4 or 5 turned and stretched', () => {
  const seen = [new Set(), new Set(), new Set()];
  let changed = 0;
  everyDay((key) => {
    for (const level of [1, 2, 3]) {
      for (const { tiles } of rounds(key, level)) {
        seen[level - 1].add(tiles.length);
        if (level === 3) changed += tiles.filter((tile) => tile.turn !== 0 || (tile.shape === 'triangle' && tile.stretch !== 1)).length;
      }
    }
  }, 60);
  assert.deepEqual(seen.map((counts) => [...counts].sort()), [[3], [4], [4, 5]]);
  assert.ok(changed > 100, 'level 3 turns and stretches its shapes');
});

test('color never tells the answer: every shape asked for comes in every color', () => {
  const colors = {};
  everyDay((key) => {
    for (const { ask, tiles } of rounds(key, 2)) (colors[ask] ??= new Set()).add(tiles.find((tile) => tile.shape === ask).color);
  });
  assert.equal(Object.keys(colors).length, 5);
  for (const [shape, set] of Object.entries(colors)) assert.equal(set.size, 6, shape);
});

test('only the tile with the shape asked for is right', () => {
  const [round] = rounds('2026-11-26', 3);
  round.tiles.forEach((tile, place) => assert.equal(check(round, place), tile.shape === round.ask));
  assert.equal(check(round, 99), false);
});

test('verify catches a round with no right answer, and a square stretched out of shape', () => {
  const seed = seedFor('2026-11-26', 'shapes');
  const none = generate(seed, 1);
  none.rounds[0].ask = 'star';
  assert.equal(verify(none).ok, false);
  const stretched = generate(seed, 1);
  stretched.rounds[0].tiles.find((tile) => tile.shape === 'square').stretch = 2;
  assert.equal(verify(stretched).ok, false);
});
