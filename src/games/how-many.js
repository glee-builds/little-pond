// how-many.js: How Many.
//
// Some ducklings sit on a lily pad. The player taps the card with the same
// number of dots. It builds seeing a small amount at a glance; tapping the
// ducklings counts them aloud for anyone who wants to check.

import { createRandom } from '../seed.js';
import { make, plural } from '../ui.js';
import { duckling, dotCard, tapToCount, playRounds } from '../scene.js';

export const ROUNDS = 4;
// The fewest and most ducklings at each level.
const RANGES = [[1, 3], [1, 5], [4, 10]];

const range = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);

/** The day's rounds: each is { count, choices }, with 3 choices close together. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const [low, high] = RANGES[level - 1] ?? RANGES.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number twice in a row.
    const count = random.pick(range(low, high).filter((n) => n !== rounds.at(-1)?.count));
    const near = range(Math.max(1, count - 2), Math.min(high, count + 2)).filter((n) => n !== count);
    rounds.push({ count, choices: random.shuffle([count, ...random.shuffle(near).slice(0, 2)]) });
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
    if (!(count >= low && count <= high)) problems.push(`round ${i + 1}: ${count} is outside ${low} to ${high}`);
    if (new Set(choices).size !== 3) problems.push(`round ${i + 1}: the choices are not 3 different numbers`);
    if (choices.filter((choice) => choice === count).length !== 1) problems.push(`round ${i + 1}: not exactly one right choice`);
    if (choices.some((choice) => choice < 1 || choice > high)) problems.push(`round ${i + 1}: a choice is outside 1 to ${high}`);
    if (i > 0 && count === puzzle.rounds[i - 1].count) problems.push(`round ${i + 1}: the same number as the round before`);
  });
  return { ok: problems.length === 0, problems };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: () => 'How many ducklings?',
    check,
    draw(stage, round, answer) {
      const pad = make('div', `big-pad${round.count > 5 ? ' big-pad-full' : ''}`);
      tapToCount(Array.from({ length: round.count }, () => pad.appendChild(duckling())));
      const row = make('div', 'choices');
      const cards = round.choices.map((count) => row.appendChild(dotCard(count, (card) => answer(count, card))));
      stage.append(pad, row);
      return () => {
        cards[round.choices.indexOf(round.count)].classList.add('choice-right');
        return plural(round.count, 'duckling');
      };
    },
  });
}
