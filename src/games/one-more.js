// one-more.js: One More, One Less.
//
// A group of ducklings sits on a lily pad. After a short beat, one more
// hops on (it arrives with a sparkle, so it's clear which is new) or one
// hops off (it stays in view, faded, in the water). The player then taps
// the card for how many are on the pad now. The cards are always the
// starting number and its two neighbours. It builds the step between
// counting and adding: one more is the next number, one less the one before.

import { createRandom } from '../seed.js';
import { make, plural, range } from '../ui.js';
import { duckling, ducklings, tapToCount, dotCards, playRounds } from '../scene.js';

export const meta = {
  title: 'One More, One Less', kind: 'numbers', levels: 3, css: true,
  art: '<span class="art-ducks"><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt="" style="transform:translateY(-10px)"></span>',
};

export const ROUNDS = 4;
// At each level: the most ducklings there can be, and whether one can hop away too.
// Every card is 1 or more, so a round never starts with fewer than 2.
const LEVELS = [{ most: 5, less: false }, { most: 5, less: true }, { most: 10, less: true }];

const now = (round) => round.start + round.step;

/** The day's rounds: each is { start, step, choices }; step is 1 (one more) or -1 (one less). */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { most, less } = LEVELS[level - 1] ?? LEVELS.at(-1);
  // Mixed levels have two rounds of each kind.
  const steps = less ? random.shuffle([1, 1, -1, -1]) : [1, 1, 1, 1];
  const rounds = [];
  for (const step of steps) {
    // Never the same number twice in a row.
    const start = random.pick(range(2, most - 1).filter((n) => n !== rounds.at(-1)?.start));
    rounds.push({ start, step, choices: random.shuffle([start - 1, start, start + 1]) });
  }
  return { level, rounds };
}

export const check = (round, answer) => answer === now(round);

/** Confirm every round can be answered and is in range for its level. */
export function verify(puzzle) {
  const problems = [];
  const { most, less } = LEVELS[puzzle.level - 1] ?? {};
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const { start, step, choices } = round;
    if (step !== 1 && !(less && step === -1)) say(`a step of ${step} is not allowed at this level`);
    if (!(start >= 2 && start <= most - 1)) say(`starting with ${start} is outside 2 to ${most - 1}`);
    if ([...choices].sort((a, b) => a - b).join() !== [start - 1, start, start + 1].join()) say(`the choices are not ${start} and its two neighbours`);
    if (choices.filter((choice) => choice === now(round)).length !== 1) say('not exactly one right choice');
    if (i > 0 && start === puzzle.rounds[i - 1].start) say('the same number as the round before');
  });
  return { ok: problems.length === 0, problems };
}

const LINES = { 1: 'One more duckling hops on. How many now?', [-1]: 'One duckling hops away. How many now?' };
const BEAT = 1500; // time to see the group before one hops
const HOP = 600;   // how long the hop takes (one-more.css)

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: (round) => LINES[round.step],
    check,
    draw(stage, round, answer) {
      const pad = make('div', `big-pad om-pad${Math.max(round.start, now(round)) > 5 ? ' big-pad-full' : ''}`);
      const ducks = ducklings(round.start, pad);
      const cards = dotCards(round.choices, answer);
      cards.sleep();
      setTimeout(() => {
        if (round.step === 1) {
          ducks.push(pad.appendChild(duckling()));
          ducks.at(-1).classList.add('om-new');
        } else {
          ducks.pop().classList.add('away');
        }
        tapToCount(ducks);
        setTimeout(cards.wake, HOP);
      }, BEAT);
      stage.append(pad, cards.node);
      return () => {
        cards.markRight(now(round));
        return plural(now(round), 'duckling');
      };
    },
  });
}
