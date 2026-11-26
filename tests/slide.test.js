// Tests for src/games/slide.js. Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, check, verify, usable, isStretchy, ROUNDS } from '../src/games/slide.js';
import { names } from '../src/sounds.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const WORDS = JSON.parse(readFileSync(new URL('../data/words.json', import.meta.url), 'utf8'));
const ALL = [...'abcdefghijklmnopqrstuvwxyz'];
// Some letters recorded: enough for 9 words (bag, bat, bug, bus, sun, mom, man, nut, tub), 3 of them stretchy.
const SOME = [...'abgmnostu'];
const byWord = (word) => WORDS.find((entry) => entry.word === word);

test('every day for two years, at every level, each round can be answered', () => {
  everyDay((key) => {
    for (const level of [1, 2]) {
      for (const letters of [ALL, SOME]) {
        const puzzle = generate(seedFor(key, 'slide'), level, WORDS, letters);
        assertValid(verify(puzzle), `${key} level ${level}`);
        // The right picture can't be mistaken for a wrong one.
        for (const { word, choices } of puzzle.rounds) {
          for (const choice of choices.filter((other) => other.word !== word)) {
            assert.ok(!names(byWord(choice.word)).some((name) => names(byWord(word)).includes(name)), `${key}: ${choice.word} could be called ${word}`);
          }
        }
      }
    }
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'slide');
  assert.deepEqual(generate(seed, 2, WORDS, ALL), generate(seed, 2, WORDS, ALL));
  assert.equal(generate(seed, 2, WORDS, ALL).rounds.length, ROUNDS);
});

test('only words whose letters are all recorded are used', () => {
  assert.deepEqual(usable(WORDS, SOME).map(({ word }) => word).sort(), ['bag', 'bat', 'bug', 'bus', 'man', 'mom', 'nut', 'sun', 'tub']);
  everyDay((key) => {
    for (const { word } of generate(seedFor(key, 'slide'), 2, WORDS, SOME).rounds) assert.ok([...word].every((letter) => SOME.includes(letter)), `${key}: ${word}`);
  }, 60);
});

test('level 1 uses stretchy words, and fills up with others only when there are too few', () => {
  everyDay((key) => {
    const seed = seedFor(key, 'slide');
    assert.ok(generate(seed, 1, WORDS, ALL).rounds.every(({ word }) => isStretchy(word)), key);
    assert.equal(generate(seed, 1, WORDS, SOME).rounds.filter(({ word }) => isStretchy(word)).length, 3, key);
  }, 60);
});

test('only the picture of the word is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'slide'), 1, WORDS, ALL).rounds;
  assert.equal(check(round, round.word), true);
  for (const { word } of round.choices.filter((choice) => choice.word !== round.word)) assert.equal(check(round, word), false);
});

test('verify catches a round with no right answer', () => {
  const puzzle = generate(seedFor('2026-11-26', 'slide'), 1, WORDS, ALL);
  puzzle.rounds[0].word = 'zzz';
  assert.equal(verify(puzzle).ok, false);
});
