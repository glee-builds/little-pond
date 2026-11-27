// Tests for src/games/shapes.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS, meta } from '../src/games/shapes.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const rounds = (key, level) => generate(seedFor(key, 'shapes'), level).rounds;
const LEVELS = [1, 2, 3, 4];

test('every day for two years, at every level, each round can be answered', () => {
  assert.equal(meta.levels, LEVELS.length);
  everyDay((key) => {
    for (const level of LEVELS) assertValid(verify(generate(seedFor(key, 'shapes'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'shapes');
  assert.deepEqual(generate(seed, 3), generate(seed, 3));
  assert.equal(generate(seed, 3).rounds.length, ROUNDS);
});

test('levels show 4 shapes, then 4 or 5 turned and stretched, then 5 or 6 and 6 with the oval and diamond', () => {
  const seen = LEVELS.map(() => new Set());
  const shapes = LEVELS.map(() => new Set());
  const changed = LEVELS.map(() => 0);
  everyDay((key) => {
    for (const level of LEVELS) {
      for (const { tiles } of rounds(key, level)) {
        seen[level - 1].add(tiles.length);
        for (const tile of tiles) shapes[level - 1].add(tile.shape);
        changed[level - 1] += tiles.filter((tile) => tile.turn !== 0 || (tile.shape === 'triangle' && tile.stretch !== 1)).length;
      }
    }
  }, 60);
  assert.deepEqual(seen.map((counts) => [...counts].sort()), [[4], [4, 5], [5, 6], [6]]);
  assert.deepEqual(shapes.map((set) => set.size), [5, 5, 7, 7]);
  assert.equal(changed[0], 0, 'level 1 keeps its shapes straight');
  assert.ok(changed.slice(1).every((count) => count > 100), 'later levels turn and stretch their shapes');
});

test('at the top level the shape asked for floats beside its look-alike', () => {
  everyDay((key) => {
    for (const { ask, tiles } of rounds(key, 4)) {
      const on = tiles.map((tile) => tile.shape);
      if (ask === 'circle') assert.ok(on.includes('oval'), key);
      if (ask === 'square') assert.ok(on.includes('rectangle') && on.includes('diamond'), key);
    }
  }, 60);
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

test('verify catches a round with no right answer, a square stretched out of shape, and a square turned into a diamond', () => {
  const seed = seedFor('2026-11-26', 'shapes');
  const none = generate(seed, 1);
  none.rounds[0].ask = ['circle', 'square', 'triangle', 'rectangle', 'star'].find((shape) => !none.rounds[0].tiles.some((tile) => tile.shape === shape));
  assert.equal(verify(none).ok, false);
  const square = (level, change) => {
    const puzzle = generate(seed, level);
    const round = puzzle.rounds.find(({ tiles }) => tiles.some((tile) => tile.shape === 'square'));
    Object.assign(round.tiles.find((tile) => tile.shape === 'square'), change);
    return verify(puzzle).ok;
  };
  assert.equal(square(1, { stretch: 2 }), false);
  assert.equal(square(3, { turn: 45 }), false);
});
