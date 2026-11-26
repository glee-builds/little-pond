// Tests for src/today.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todaysSet, SET_SIZE } from '../src/today.js';

const numbers = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const sounds = ['x', 'y'];

test('a day has 3 number games and then 1 sound game, none twice', () => {
  for (let day = 0; day < 365; day++) {
    const set = todaysSet({ numbers, sounds }, day);
    assert.equal(set.length, SET_SIZE);
    assert.equal(new Set(set).size, SET_SIZE);
    assert.ok(set.slice(0, 3).every((game) => numbers.includes(game)));
    assert.ok(sounds.includes(set[3]));
  }
});

test('with no sound games, all 4 are number games', () => {
  const set = todaysSet({ numbers, sounds: [] }, 5);
  assert.equal(set.length, SET_SIZE);
  assert.ok(set.every((game) => numbers.includes(game)));
});

test('with fewer than 4 games, the set is every game there is', () => {
  assert.deepEqual(todaysSet({ numbers: ['a'], sounds: [] }, 3), ['a']);
  assert.deepEqual(todaysSet({ numbers: ['a', 'b'] }, 3).sort(), ['a', 'b']);
});

test('the same day always gives the same set, and every game comes around', () => {
  assert.deepEqual(todaysSet({ numbers, sounds }, 40), todaysSet({ numbers, sounds }, 40));
  const seen = new Set();
  for (let day = 0; day < 7; day++) for (const game of todaysSet({ numbers, sounds }, day)) seen.add(game);
  assert.equal(seen.size, numbers.length + sounds.length);
});
