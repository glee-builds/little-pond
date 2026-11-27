// match-the-number.js: Match the Number.
//
// Three lily pads each hold a different number of ducklings, and one big
// numeral tile waits below. The player drags the numeral (or taps it, then
// taps a pad) onto the pad with that many ducklings. Tapping the ducklings
// on any pad counts them aloud.
// It builds linking the written numeral to the amount it stands for.

import { createRandom } from '../seed.js';
import { make, button, plural, range } from '../ui.js';
import { ducklings, tapToCount, draggable } from '../scene.js';

export const meta = {
  title: 'Match the Number', kind: 'numbers', levels: 4, css: true,
  art: '<svg viewBox="0 0 120 52" width="120" height="52" aria-hidden="true">'
    + '<rect x="6" y="6" width="40" height="40" rx="10" style="fill:var(--surface);stroke:var(--numbers);stroke-width:3"/>'
    + '<text x="26" y="36" text-anchor="middle" style="font-size:28px;font-weight:800;fill:var(--text)">3</text>'
    + '<image href="assets/duck.svg" x="52" y="15" width="22" height="22"/><image href="assets/duck.svg" x="74" y="15" width="22" height="22"/><image href="assets/duck.svg" x="96" y="15" width="22" height="22"/>'
    + '</svg>',
};

export const ROUNDS = 4;
// The fewest and most ducklings at each level.
const RANGES = [[1, 6], [1, 10], [5, 15], [10, 20]];
const NEAR = 2; // from level NEAR_FROM, the other pads are within this of the answer
const NEAR_FROM = 2;

const isNear = (level) => level >= NEAR_FROM;

/** The day's rounds: each is { count, pads }, 3 different pads, one holding `count`. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const [low, high] = RANGES[level - 1] ?? RANGES.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number twice in a row.
    const count = random.pick(range(low, high).filter((n) => n !== rounds.at(-1)?.count));
    const others = range(low, high).filter((n) => n !== count && (!isNear(level) || Math.abs(n - count) <= NEAR));
    rounds.push({ count, pads: random.shuffle([count, ...random.shuffle(others).slice(0, 2)]) });
  }
  return { level, rounds };
}

/** The answer is the pad (0, 1, or 2) the numeral was put on. */
export const check = (round, answer) => round.pads[answer] === round.count;

/** Confirm every round can be answered: 3 different pads in range, one of them right. */
export function verify(puzzle) {
  const problems = [];
  const [low, high] = RANGES[puzzle.level - 1] ?? [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const { count, pads } = round;
    if (pads.length !== 3 || new Set(pads).size !== 3) say('the pads are not 3 different numbers');
    if (pads.some((n) => !(n >= low && n <= high))) say(`a pad is outside ${low} to ${high}`);
    if (pads.filter((_, pad) => check(round, pad)).length !== 1) say('not exactly one right pad');
    if (isNear(puzzle.level) && pads.some((n) => Math.abs(n - count) > NEAR)) say(`a pad is more than ${NEAR} from ${count}`);
    if (i > 0 && count === puzzle.rounds[i - 1].count) say('the same number as the round before');
  });
  return { ok: problems.length === 0, problems };
}

/** What playRounds needs to play these rounds, for the mixed game this is part of (src/mix.js). */
export function rules() {
  return {
    prompt: ({ count }) => `Put the ${count} on the pad with ${plural(count, 'duckling')}.`,
    check,
    draw(stage, round, answer) {
      let over = false;
      // Past 10, every pad in the round shows a ten (2 rows of 5) and the rest beside it.
      const teens = Math.max(...round.pads) > 10;
      const pads = round.pads.map((count) => {
        const pad = make('div', `mtn-pad${teens ? ' mtn-teens' : ''}`);
        const ducks = pad.appendChild(make('div', 'mtn-ducks'));
        const blocks = count > 10 ? [10, count - 10] : [count];
        tapToCount(blocks.flatMap((n) => ducklings(n, ducks.appendChild(make('div', 'rows-of-5')))));
        return pad;
      });
      const tile = button('mtn-tile', String(round.count));
      draggable(tile, { targets: () => pads, canMove: () => !over, onDrop: (pad) => answer(pad, pads[pad]) });
      const home = make('div', 'mtn-home');
      home.append(tile);
      stage.append(...pads, home);
      return () => {
        over = true;
        // The numeral lands beside the ducklings it stands for.
        const right = pads[round.pads.indexOf(round.count)];
        right.append(tile);
        right.classList.add('right');
        return plural(round.count, 'duckling');
      };
    },
  };
}
