// sounds.js: Sounds.
//
// The app asks "Which one starts with" and then plays one letter's sound
// (a grown-up's recording, src/sounds.js): "mmm". The player taps the
// picture whose word starts with that sound. Tapping the big duckling says
// the sound again. It builds hearing the first sound in a word.

import { createRandom } from '../seed.js';
import { button } from '../ui.js';
import { pictureCards, playRounds } from '../scene.js';
import { ENOUGH, loadWords, names, recorded, play } from '../sounds.js';

export const meta = {
  title: 'Sounds', kind: 'sounds', levels: 2, css: true,
  art: `<svg viewBox="0 0 120 52" width="120" height="52" fill="none" stroke="var(--words)" stroke-width="5" stroke-linecap="round">
    <path d="M36 19h10l14-11v36L46 33H36z" fill="var(--words)" stroke-linejoin="round"/>
    <path d="M70 17a12 12 0 0 1 0 18M79 9a23 23 0 0 1 0 34"/></svg>`,
};

export const ROUNDS = 4;
// Sounds a young ear can mix up. A wrong picture never starts with one of these.
const ALIKE = ['bp', 'dt', 'ckg', 'fv', 'sz', 'mn', 'wr'];
export const alike = (a, b) => a === b || ALIKE.some((group) => group.includes(a) && group.includes(b));

/** The sounds that can be asked: recorded letters that start a word in the list. */
export function usable(words, letters) {
  const have = new Set(letters);
  return [...new Set(words.map(({ word }) => word[0]))].filter((letter) => have.has(letter));
}

// What the app hands to generate (after the seed and level), and whether there is enough to play.
export const data = async () => [await loadWords(), [...await recorded()]];
export const available = async () => usable(...await data()).length >= ENOUGH;

/**
 * The day's rounds: each is { sound, word, choices }. `word` starts with
 * `sound`; choices are pictures ({ word, picture }): the word's and 1 wrong
 * one (level 1) or 2 (level 2). No sound is asked twice.
 */
export function generate(seed, level = 1, words = [], letters = []) {
  const random = createRandom(seed);
  const rounds = random.shuffle(usable(words, letters)).slice(0, ROUNDS).map((sound) => {
    const right = random.pick(words.filter(({ word }) => word[0] === sound));
    // Nothing the player might call a wrong picture starts with a sound like this one.
    const wrong = words.filter((other) => names(other).every((name) => !alike(name[0], sound)));
    const choices = random.shuffle([right, ...random.shuffle(wrong).slice(0, level)]);
    return { sound, word: right.word, choices: choices.map(({ word, picture }) => ({ word, picture })) };
  });
  return { level, rounds };
}

export const check = (round, answer) => answer === round.word;

/** Confirm every round can be answered: one picture starts with the sound, and the others clearly don't. */
export function verify(puzzle) {
  const problems = [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ sound, word, choices }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (word[0] !== sound) say(`"${word}" does not start with "${sound}"`);
    if (puzzle.rounds.findIndex((round) => round.sound === sound) !== i) say(`"${sound}" is asked twice`);
    if (choices.length !== puzzle.level + 1 || new Set(choices.map((choice) => choice.picture)).size !== choices.length) say(`the choices are not ${puzzle.level + 1} different pictures`);
    if (choices.filter((choice) => check({ word }, choice.word)).length !== 1) say('not exactly one right picture');
    if (choices.some((choice) => choice.word !== word && alike(choice.word[0], sound))) say(`a wrong picture starts with a sound like "${sound}"`);
  });
  return { ok: problems.length === 0, problems };
}

const LINE = 'Which one starts with';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Done when the built-in voice has finished its line (or after 4 seconds, if the phone never says so). */
async function voiceDone() {
  const voice = window.speechSynthesis;
  await wait(300); // the voice takes a moment to start
  for (let tries = 0; voice && (voice.speaking || voice.pending) && tries < 40; tries++) await wait(100);
}

export function render(container, puzzle, onDone, session) {
  // playRounds says the line itself: at the start of a round, after a miss,
  // and from its speaker button. It asks prompt() for the line each time, so
  // that is where the recorded sound is lined up to follow the voice. Only
  // the newest line is followed; an answer calls it off.
  let turn = 0;
  const thenSound = (sound) => {
    const mine = ++turn;
    voiceDone().then(() => { if (mine === turn) play(sound); });
  };
  playRounds(container, puzzle, onDone, session, {
    prompt: (round) => {
      thenSound(round.sound);
      return LINE;
    },
    check,
    draw(stage, round, answer) {
      const hear = button('snd-hear', '🔊', () => { turn += 1; play(round.sound); });
      hear.setAttribute('aria-label', 'Hear the sound');
      hear.insertAdjacentHTML('afterbegin', '<img src="assets/duck.svg" alt="">');
      const cards = pictureCards(round.choices, (word, card) => { turn += 1; answer(word, card); });
      stage.append(hear, cards.node);
      return () => {
        cards.markRight(round.word);
        return round.word;
      };
    },
  });
}
