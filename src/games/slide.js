// slide.js: Slide.
//
// A three-letter word is shown in big letters, with a duckling on a track
// under it. As the player slides the duckling along, each letter lights up
// and says its sound (a grown-up's recording, src/sounds.js); at the end
// the whole word is said. Then the player taps the picture of the word.
// It builds blending: running the sounds together to read a word.
// (This is the one game that shows the player text: the word to blend.)

import { createRandom } from '../seed.js';
import { make, button } from '../ui.js';
import { DRAG_START, across, pictureCards, playRounds } from '../scene.js';
import { speak } from '../voice.js';
import { ENOUGH, loadWords, names, recorded, play } from '../sounds.js';

export const meta = {
  title: 'Slide', kind: 'sounds', levels: 2, css: true,
  art: `<svg viewBox="0 0 120 52" width="120" height="52" font-family="inherit" font-size="30" font-weight="700" text-anchor="middle">
    <text x="30" y="26" fill="var(--words-ink)">s</text><text x="60" y="26" fill="var(--words-ink)">u</text><text x="90" y="26" fill="var(--words-ink)">n</text>
    <rect x="8" y="36" width="104" height="10" rx="5" fill="var(--water)"/><circle cx="30" cy="41" r="8" fill="var(--star)"/></svg>`,
};

export const ROUNDS = 4;
// Sounds that can be held and stretched ("sss", "mmm"), which are the easiest to blend.
const STRETCHY = 'aeioufmnlrsvz';
export const isStretchy = (word) => [...word].every((letter) => STRETCHY.includes(letter));

/** The words that can be played: every letter has a recording. */
export function usable(words, letters) {
  const have = new Set(letters);
  return words.filter(({ word }) => [...word].every((letter) => have.has(letter)));
}

// What the app hands to generate (after the seed and level), and whether there is enough to play.
export const data = async () => [await loadWords(), [...await recorded()]];
export const available = async () => usable(...await data()).length >= ENOUGH;

/**
 * The day's rounds: each is { word, choices }, where choices are 3
 * pictures ({ word, picture }), one of them the word's. Level 1 uses
 * stretchy words (then others, if there aren't 4), and its wrong pictures
 * start with a different letter; level 2 uses any word.
 */
export function generate(seed, level = 1, words = [], letters = []) {
  const random = createRandom(seed);
  const can = random.shuffle(usable(words, letters));
  const order = level === 1 ? [...can.filter((entry) => entry.stretchy), ...can.filter((entry) => !entry.stretchy)] : can;
  const rounds = order.slice(0, ROUNDS).map((right) => {
    // A wrong picture is never one the player might call by the right word.
    const wrong = words.filter((other) => !names(other).some((name) => names(right).includes(name))
      && (level > 1 || other.word[0] !== right.word[0]));
    const choices = random.shuffle([right, ...random.shuffle(wrong).slice(0, 2)]);
    return { word: right.word, choices: choices.map(({ word, picture }) => ({ word, picture })) };
  });
  return { level, rounds };
}

export const check = (round, answer) => answer === round.word;

/** Confirm every round can be answered: a three-letter word, and 3 different pictures, one of them right. */
export function verify(puzzle) {
  const problems = [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ word, choices }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const before = puzzle.rounds.slice(0, i).map((round) => round.word);
    if (!/^[a-z]{3}$/.test(word)) say(`"${word}" is not three letters`);
    if (before.includes(word)) say(`"${word}" comes twice`);
    if (new Set(choices.map((choice) => choice.word)).size !== 3 || new Set(choices.map((choice) => choice.picture)).size !== 3) say('the choices are not 3 different pictures');
    if (choices.filter((choice) => check({ word }, choice.word)).length !== 1) say('not exactly one right picture');
    if (puzzle.level === 1 && isStretchy(word) && !before.every(isStretchy)) say(`a stretchy word comes after one that isn't`);
    if (puzzle.level === 1 && choices.some((choice) => choice.word !== word && choice.word[0] === word[0])) say('a wrong picture starts like the word');
  });
  return { ok: problems.length === 0, problems };
}

const LINE = 'Slide the duckling. What is the word?';
const END = 4; // the duckling's stops: 0 is the start, 1 to 3 are under the letters, 4 is the end

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: () => LINE,
    check,
    draw(stage, round, answer) {
      const letters = [...round.word];
      const word = make('div', 'sld-word');
      const tiles = letters.map((letter) => word.appendChild(button('sld-letter', letter, () => play(letter))));
      const track = make('div', 'sld-track');
      const duck = track.appendChild(button('sld-duck'));
      duck.innerHTML = '<img src="assets/duck.svg" alt="" draggable="false">';
      duck.setAttribute('aria-label', 'Slide to the next letter');
      const cards = pictureCards(round.choices, answer);
      cards.sleep();

      let stop = 0;
      let at = 0; // how far along the duckling is, 0 to 1
      let over = false; // the round has been answered
      let sounding = Promise.resolve(); // done when the last letter's sound ends
      const show = (place) => {
        at = place;
        duck.style.setProperty('--at', place);
        tiles.forEach((tile, i) => tile.classList.toggle('sld-lit', i === stop - 1 || stop === END));
      };
      /** Put the duckling `place` of the way along (0 to 1). Coming to a letter says its sound; the end says the word. */
      function moveTo(place) {
        if (over) return;
        const now = Math.round(place * END);
        const arrived = now !== stop;
        stop = now;
        show(place);
        if (!arrived || stop === 0) return;
        if (stop < END) sounding = play(letters[stop - 1]);
        else {
          sounding.then(() => {
            if (over) return;
            speak(round.word);
            cards.wake(); // the pictures wake up once the word has been slid
          });
        }
      }

      // Slide with a finger, or tap the duckling to hop to the next stop (after the end, back to the start).
      // Everything is a part of the track's width, never pixels, so it is right at any zoom (tablets, styles.css).
      const room = () => 1 - duck.getBoundingClientRect().width / track.getBoundingClientRect().width; // how far the duckling can go
      let from = null; // while a finger is down: where it landed, and how far along the track from the duckling's left edge
      let slid = false;
      duck.addEventListener('pointerdown', (event) => {
        from = { x: event.clientX, grip: across(track, event.clientX) - at * room() };
        slid = false;
        try { duck.setPointerCapture(event.pointerId); } catch { /* fine without it */ }
      });
      duck.addEventListener('pointermove', (event) => {
        if (!from) return;
        if (Math.abs(event.clientX - from.x) >= DRAG_START) slid = true;
        if (!slid) return;
        moveTo(Math.min(1, Math.max(0, (across(track, event.clientX) - from.grip) / room())));
      });
      for (const type of ['pointerup', 'pointercancel']) duck.addEventListener(type, () => { from = null; });
      duck.addEventListener('click', () => {
        if (slid) slid = false; // the end of a slide, not a tap
        else moveTo(stop === END ? 0 : (stop + 1) / END);
      });

      stage.append(word, track, cards.node);
      return () => {
        over = true;
        stop = END;
        show(1);
        cards.markRight(round.word);
        return round.word;
      };
    },
  });
}
