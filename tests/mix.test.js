// Tests for src/mix.js and the games made with it. Each part has its own
// test file; this checks that the mixed games put them together right.
// Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const MIXED = ['counting', 'add-take', 'compare', 'share-sort', 'shapes-patterns'];
const games = Object.fromEntries(await Promise.all(MIXED.map(async (name) => [name, await import(`../src/games/${name}.js`)])));

for (const [name, game] of Object.entries(games)) {
  test(`${name}: every day for two years, at every level, the rounds are good and take turns`, () => {
    const parts = Object.keys(game.generate(seedFor('2026-11-26', name), 1).puzzles);
    everyDay((key) => {
      for (let level = 1; level <= game.meta.levels; level++) {
        const puzzle = game.generate(seedFor(key, name), level);
        assertValid(game.verify(puzzle), `${name} ${key} level ${level}`);
        puzzle.rounds.forEach((round, i) => assert.equal(round.part, parts[i % parts.length]));
      }
    }, 120);
  });

  test(`${name}: the same day and level give the same rounds`, () => {
    const seed = seedFor('2026-11-26', name);
    assert.deepEqual(game.generate(seed, game.meta.levels), game.generate(seed, game.meta.levels));
  });

  test(`${name}: verify catches a round that is not its part's`, () => {
    const puzzle = game.generate(seedFor('2026-11-26', name), 1);
    [puzzle.rounds[0], puzzle.rounds[1]] = [puzzle.rounds[1], puzzle.rounds[0]];
    assert.equal(game.verify(puzzle).ok, false);
  });
}
