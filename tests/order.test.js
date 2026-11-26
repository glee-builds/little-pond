// Tests for src/games/order.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, check, verify, ROUNDS } from '../src/games/order.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const today = (level) => generate(seedFor('2026-11-26', 'order'), level);

test('every day for two years, at every level, each round can be lined up', () => {
  everyDay((key) => {
    for (const level of [1, 2, 3]) assertValid(verify(generate(seedFor(key, 'order'), level)), `${key} level ${level}`);
  });
});

test('the same day and level give the same rounds', () => {
  assert.deepEqual(today(2), today(2));
  assert.equal(today(2).rounds.length, ROUNDS);
});

test('levels have 3, 4, and 5 ducklings, and only the top level asks for biggest first', () => {
  const seen = [1, 2, 3].map((level) => {
    const rounds = [];
    everyDay((key) => rounds.push(...generate(seedFor(key, 'order'), level).rounds), 30);
    return { counts: [...new Set(rounds.map(({ sizes }) => sizes.length))], ways: new Set(rounds.map(({ down }) => down)).size };
  });
  assert.deepEqual(seen, [{ counts: [3], ways: 1 }, { counts: [4], ways: 1 }, { counts: [5], ways: 2 }]);
});

test('only the order asked for is right', () => {
  assert.equal(check({ sizes: [2, 3, 1], down: false }, [1, 2, 3]), true);
  assert.equal(check({ sizes: [2, 3, 1], down: false }, [3, 2, 1]), false);
  assert.equal(check({ sizes: [2, 3, 1], down: true }, [3, 2, 1]), true);
  assert.equal(check({ sizes: [2, 3, 1], down: false }, [1, 3, 2]), false);
  assert.equal(check({ sizes: [2, 3, 1], down: false }, [1, 2, null]), false);
});

test('verify catches ducklings that start in order, and a missing size', () => {
  const sorted = today(1);
  sorted.rounds[0].sizes = [1, 2, 3];
  assert.equal(verify(sorted).ok, false);
  const twins = today(1);
  twins.rounds[0].sizes = [2, 2, 1];
  assert.equal(verify(twins).ok, false);
});
