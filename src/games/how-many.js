// how-many.js: How Many.
//
// Ducklings sit on a lily pad. The player taps each one, and the app counts
// up aloud with every tap: "1, 2, 3". When the last one is counted, the
// answer cards wake up and the player taps the card for how many there are.
// It builds counting one at a time, and that the last number said is how
// many there are.

import { createRandom } from '../seed.js';
import { make, plural, range } from '../ui.js';
import { ducklings, tapToCount, dotCards, nearChoices, playRounds } from '../scene.js';
import { speak } from '../voice.js';

export const meta = {
  title: 'How Many', kind: 'numbers', levels: 3,
  art: '<span class="art-ducks"><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""></span>',
};

export const ROUNDS = 4;
// The fewest and most ducklings at each level.
const RANGES = [[1, 3], [1, 5], [4, 10]];


/** The day's rounds: each is { count, choices }, with 3 choices close together. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const [low, high] = RANGES[level - 1] ?? RANGES.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number twice in a row.
    const count = random.pick(range(low, high).filter((n) => n !== rounds.at(-1)?.count));
    rounds.push({ count, choices: nearChoices(random, count, 1, high) });
  }
  return { level, rounds };
}

export const check = (round, answer) => answer === round.count;

/** Confirm every round can be answered: 3 different choices, one of them right. */
export function verify(puzzle) {
  const problems = [];
  const [low, high] = RANGES[puzzle.level - 1] ?? [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ count, choices }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (!(count >= low && count <= high)) say(`${count} is outside ${low} to ${high}`);
    if (new Set(choices).size !== 3) say('the choices are not 3 different numbers');
    if (choices.filter((choice) => choice === count).length !== 1) say('not exactly one right choice');
    if (choices.some((choice) => choice < 1 || choice > high)) say(`a choice is outside 1 to ${high}`);
    if (i > 0 && count === puzzle.rounds[i - 1].count) say('the same number as the round before');
  });
  return { ok: problems.length === 0, problems };
}

const COUNT_LINE = 'Tap each duckling. Count with me!';
const ASK_LINE = 'How many ducklings?';
const BEAT = 900; // time for the last number to be said before the question

export function render(container, puzzle, onDone, session) {
  let counted = false; // has every duckling in this round been tapped?
  playRounds(container, puzzle, onDone, session, {
    prompt: () => (counted ? ASK_LINE : COUNT_LINE),
    check,
    draw(stage, round, answer) {
      counted = false;
      const pad = make('div', `big-pad to-count${round.count > 5 ? ' big-pad-full' : ''}`);
      const cards = dotCards(round.choices, answer);
      cards.sleep();
      tapToCount(ducklings(round.count, pad), () => {
        counted = true;
        setTimeout(() => {
          cards.wake();
          speak(ASK_LINE);
        }, BEAT);
      });
      stage.append(pad, cards.node);
      return () => {
        cards.markRight(round.count);
        return plural(round.count, 'duckling');
      };
    },
  });
}
