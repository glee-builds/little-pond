// match-the-number.js: Match the Number.
//
// Three lily pads each hold a different number of ducklings, and one big
// numeral tile waits below. The player drags the numeral (or taps it, then
// taps a pad) onto the pad with that many ducklings. Tapping the ducklings
// on any pad counts them aloud.
// It builds linking the written numeral to the amount it stands for.

import { createRandom } from '../seed.js';
import { make, button, plural } from '../ui.js';
import { duckling, tapToCount, draggable, playRounds } from '../scene.js';

export const meta = {
  title: 'Match the Number', kind: 'numbers', levels: 3, css: true,
  art: '<svg viewBox="0 0 120 52" width="120" height="52" aria-hidden="true">'
    + '<rect x="6" y="6" width="40" height="40" rx="10" style="fill:var(--surface);stroke:var(--numbers);stroke-width:3"/>'
    + '<text x="26" y="36" text-anchor="middle" style="font-size:28px;font-weight:800;fill:var(--text)">3</text>'
    + '<image href="assets/duck.svg" x="52" y="15" width="22" height="22"/><image href="assets/duck.svg" x="74" y="15" width="22" height="22"/><image href="assets/duck.svg" x="96" y="15" width="22" height="22"/>'
    + '</svg>',
};

export const ROUNDS = 4;
// The fewest and most ducklings at each level.
const RANGES = [[1, 3], [1, 5], [1, 10]];
const NEAR = 2; // at the top level, the other pads are within this of the answer

const range = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);
const isTop = (level) => level >= RANGES.length;

/** The day's rounds: each is { count, pads }, 3 different pads, one holding `count`. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const [low, high] = RANGES[level - 1] ?? RANGES.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number twice in a row.
    const count = random.pick(range(low, high).filter((n) => n !== rounds.at(-1)?.count));
    const others = range(low, high).filter((n) => n !== count && (!isTop(level) || Math.abs(n - count) <= NEAR));
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
    const { count, pads } = round;
    const at = `round ${i + 1}`;
    if (pads.length !== 3 || new Set(pads).size !== 3) problems.push(`${at}: the pads are not 3 different numbers`);
    if (pads.some((n) => !(n >= low && n <= high))) problems.push(`${at}: a pad is outside ${low} to ${high}`);
    if (pads.filter((_, pad) => check(round, pad)).length !== 1) problems.push(`${at}: not exactly one right pad`);
    if (isTop(puzzle.level) && pads.some((n) => Math.abs(n - count) > NEAR)) problems.push(`${at}: a pad is more than ${NEAR} from ${count}`);
    if (i > 0 && count === puzzle.rounds[i - 1].count) problems.push(`${at}: the same number as the round before`);
  });
  return { ok: problems.length === 0, problems };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: ({ count }) => `Put the ${count} on the pad with ${plural(count, 'duckling')}.`,
    check,
    draw(stage, round, answer) {
      let open = true; // false once the round is over
      const pads = round.pads.map((count) => {
        const pad = make('div', 'mtn-pad');
        const ducks = pad.appendChild(make('div', 'mtn-ducks'));
        tapToCount(Array.from({ length: count }, () => ducks.appendChild(duckling())));
        return pad;
      });
      const tile = button('mtn-tile', String(round.count));
      draggable(tile, { targets: () => pads, onDrop: (pad) => answer(pad, pads[pad]), canMove: () => open });
      const home = make('div', 'mtn-home');
      home.append(tile);
      stage.append(...pads, home);
      return () => {
        open = false;
        // The numeral lands beside the ducklings it stands for.
        const right = pads[round.pads.indexOf(round.count)];
        right.append(tile);
        right.classList.add('choice-right');
        return plural(round.count, 'duckling');
      };
    },
  });
}
