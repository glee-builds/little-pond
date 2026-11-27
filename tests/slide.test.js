// Tests for src/games/slide.js and its word list (data/words.json).
// Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, check, verify, usable, isStretchy, ROUNDS, meta } from '../src/games/slide.js';
import { names, LETTERS } from '../src/sounds.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const WORDS = JSON.parse(readFileSync(new URL('../data/words.json', import.meta.url), 'utf8'));
const ALL = [...'abcdefghijklmnopqrstuvwxyz'];
// Some letters recorded: enough for 9 words (bag, bat, bug, bus, sun, mom, man, nut, tub), 3 of them stretchy.
const SOME = [...'abgmnostu'];
const byWord = (word) => WORDS.find((entry) => entry.word === word);
const LEVELS = [1, 2, 3];

test('the word list is well-formed', () => {
  const one = new Intl.Segmenter('en', { granularity: 'grapheme' });
  for (const { word, picture, stretchy, also = [] } of WORDS) {
    // Consonant, short vowel, consonant, one letter for each sound.
    assert.match(word, /^[b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z]$/, word);
    assert.equal(stretchy, isStretchy(word), `${word}: stretchy`);
    assert.equal([...one.segment(picture)].length, 1, `${word}: one emoji`);
    assert.match(picture, /\p{Extended_Pictographic}|⃣/u, `${word}: an emoji`);
    for (const name of also) assert.match(name, /^[a-z]+$/, `${word}: also "${name}"`);
  }
  assert.equal(new Set(WORDS.map(({ word }) => word)).size, WORDS.length, 'a word comes twice');
  assert.equal(new Set(WORDS.map(({ picture }) => picture)).size, WORDS.length, 'a picture comes twice');
  assert.ok(WORDS.length >= 30);
});

test('all 26 letters can be recorded, each with a word for its sound', () => {
  assert.deepEqual(Object.keys(LETTERS), ALL);
  for (const [letter, word] of Object.entries(LETTERS)) assert.ok(word.includes(letter), `${letter} as in ${word}`);
});

test('every day for two years, at every level, each round can be answered', () => {
  assert.equal(meta.levels, LEVELS.length);
  everyDay((key) => {
    for (const level of LEVELS) {
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

test('levels show 3 pictures, then 4, then 4 with one that starts like the word', () => {
  let alike = 0;
  everyDay((key) => {
    const seed = seedFor(key, 'slide');
    for (const level of LEVELS) {
      for (const letters of [ALL, SOME]) {
        for (const { word, choices } of generate(seed, level, WORDS, letters).rounds) {
          assert.equal(choices.length, level === 1 ? 3 : 4, key);
          if (level === 3 && choices.some((choice) => choice.word !== word && choice.word[0] === word[0])) alike++;
        }
      }
    }
  }, 60);
  // Most words, though not all, have another word in the list that starts like them.
  assert.ok(alike > 60 * 2 * ROUNDS * 0.6, `only ${alike} top-level rounds have a picture that starts like the word`);
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
