// Tests for src/games/sounds.js and the word list both sound games use
// (data/words.json). Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, check, verify, usable, alike, ROUNDS } from '../src/games/sounds.js';
import { isStretchy } from '../src/games/slide.js';
import { names, LETTERS } from '../src/sounds.js';
import { seedFor } from '../src/seed.js';
import { everyDay, assertValid } from './helpers.js';

const WORDS = JSON.parse(readFileSync(new URL('../data/words.json', import.meta.url), 'utf8'));
const ALL = [...'abcdefghijklmnopqrstuvwxyz'];
const SOME = [...'bcdhmpst']; // 8 recorded letters, each the start of a word
const byWord = (word) => WORDS.find((entry) => entry.word === word);

test('the word list is well-formed', () => {
  const one = new Intl.Segmenter('en', { granularity: 'grapheme' });
  for (const { word, picture, stretchy, also = [] } of WORDS) {
    // Consonant, short vowel, consonant: one letter for each sound.
    assert.match(word, /^[b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z]$/, word);
    assert.equal([...one.segment(picture)].length, 1, `${word}: one emoji`);
    assert.match(picture, /\p{Extended_Pictographic}|⃣/u, `${word}: an emoji`);
    assert.equal(stretchy, isStretchy(word), `${word}: stretchy`);
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
  everyDay((key) => {
    for (const level of [1, 2]) {
      for (const letters of [ALL, SOME]) {
        const puzzle = generate(seedFor(key, 'sounds'), level, WORDS, letters);
        assertValid(verify(puzzle), `${key} level ${level}`);
        for (const { sound, word, choices } of puzzle.rounds) {
          assert.ok(letters.includes(sound), `${key}: "${sound}" is not recorded`);
          // Whatever the player calls a wrong picture, it starts with a clearly different sound.
          for (const choice of choices.filter((other) => other.word !== word)) {
            for (const name of names(byWord(choice.word))) assert.ok(!alike(name[0], sound), `${key}: ${name} starts like "${sound}"`);
          }
        }
      }
    }
  });
});

test('the same day and level give the same rounds', () => {
  const seed = seedFor('2026-11-26', 'sounds');
  assert.deepEqual(generate(seed, 2, WORDS, ALL), generate(seed, 2, WORDS, ALL));
  assert.equal(generate(seed, 2, WORDS, ALL).rounds.length, ROUNDS);
});

test('level 1 has 2 pictures and level 2 has 3', () => {
  const seed = seedFor('2026-11-26', 'sounds');
  for (const level of [1, 2]) assert.ok(generate(seed, level, WORDS, ALL).rounds.every(({ choices }) => choices.length === level + 1));
});

test('only recorded letters that start a word can be asked', () => {
  assert.deepEqual(usable(WORDS, [...'aeioxbm']).sort(), ['b', 'm']);
  assert.equal(usable(WORDS, SOME).length, 8);
});

test('only the picture that starts with the sound is right', () => {
  const [round] = generate(seedFor('2026-11-26', 'sounds'), 2, WORDS, ALL).rounds;
  assert.equal(check(round, round.word), true);
  for (const { word } of round.choices.filter((choice) => choice.word !== round.word)) assert.equal(check(round, word), false);
});

test('verify catches a wrong picture that starts with the same sound', () => {
  const puzzle = generate(seedFor('2026-11-26', 'sounds'), 1, WORDS, ALL);
  const [round] = puzzle.rounds;
  round.choices.find((choice) => choice.word !== round.word).word = `${round.sound}ib`;
  assert.equal(verify(puzzle).ok, false);
});
