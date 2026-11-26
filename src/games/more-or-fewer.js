// more-or-fewer.js: More or Fewer.
//
// Two lily pads each hold some ducklings, lined up in rows of 5 so the
// amounts can be compared by eye. The player taps the pad with more (or
// fewer). At the top level the player makes the pads the same instead:
// adding a duckling, or tapping one to send it away, then tapping the check.
// It builds comparing amounts: more, fewer, and the same.

import { createRandom } from '../seed.js';
import { make, button, plural } from '../ui.js';
import { duckling, playRounds } from '../scene.js';

export const meta = {
  title: 'More or Fewer', kind: 'numbers', levels: 3, css: true,
  art: '<span class="art-ducks"><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt="" style="margin-left:16px"></span>',
};

export const ROUNDS = 4;
const MOST = 10; // a pad never holds more than this
// Each level: the most ducklings on a pad, and how far apart the two pads may be.
const LEVELS = [
  { most: 6, apart: (gap) => gap >= 2 },
  { most: 10, apart: (gap) => gap === 1 },
  { most: MOST, apart: (gap) => gap >= 1 && gap <= 3 },
];
const TOP = LEVELS.length; // the level where the player makes the pads the same

const range = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);
const rule = (level) => LEVELS[level - 1] ?? LEVELS.at(-1);
const pairs = ({ most, apart }) => range(1, most).flatMap((a) => range(1, most).filter((b) => apart(Math.abs(a - b))).map((b) => [a, b]));

/**
 * The day's rounds: each is { ask, pads: [a, b] }. `ask` is 'more' or
 * 'fewer' (both, every day), or 'same' at the top level, where the first
 * pad is fixed and the player changes the second.
 */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const asks = level >= TOP ? Array(ROUNDS).fill('same') : random.shuffle(['more', 'more', 'fewer', 'fewer']);
  const all = pairs(rule(level));
  const rounds = [];
  for (const ask of asks) {
    // Never the same two pads twice in a row.
    rounds.push({ ask, pads: random.pick(all.filter((pads) => String(pads) !== String(rounds.at(-1)?.pads))) });
  }
  return { level, rounds };
}

/** The pad (0 or 1) that answers a 'more' or 'fewer' round. */
const answerPad = ({ ask, pads }) => pads.indexOf(Math[ask === 'more' ? 'max' : 'min'](...pads));

/** The answer is the pad tapped (0 or 1), or for 'same', how many are now on the second pad. */
export const check = (round, answer) => answer === (round.ask === 'same' ? round.pads[0] : answerPad(round));

/** Confirm every round can be answered and fits its level. */
export function verify(puzzle) {
  const problems = [];
  const { most, apart } = rule(puzzle.level);
  const top = puzzle.level >= TOP;
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  if (!top && !['more', 'fewer'].every((ask) => puzzle.rounds.some((round) => round.ask === ask))) problems.push('not both "more" and "fewer"');
  puzzle.rounds.forEach((round, i) => {
    const { ask, pads } = round;
    const at = `round ${i + 1}`;
    if ((ask === 'same') !== top || !['more', 'fewer', 'same'].includes(ask)) problems.push(`${at}: "${ask}" does not belong at level ${puzzle.level}`);
    if (pads.length !== 2 || pads.some((count) => !(count >= 1 && count <= most))) problems.push(`${at}: a pad is outside 1 to ${most}`);
    if (!apart(Math.abs(pads[0] - pads[1]))) problems.push(`${at}: ${pads[0]} and ${pads[1]} are the wrong distance apart`);
    // 'same' can always be reached, because both pads are within 0 to MOST.
    const answers = ask === 'same' ? range(0, MOST) : [0, 1];
    if (answers.filter((answer) => check(round, answer)).length !== 1) problems.push(`${at}: not exactly one right answer`);
    if (ask === 'same' && check(round, pads[1])) problems.push(`${at}: the pads start the same`);
  });
  return { ok: problems.length === 0, problems };
}

const LINES = { more: 'Which pad has more?', fewer: 'Which pad has fewer?', same: 'Make the pads the same.' };

/** Tap a pad: the round where one pad has more. */
function drawChoice(stage, round, answer) {
  const pads = round.pads.map((count, i) => {
    const pad = button('mof-pad', '', () => answer(i, pad));
    pad.setAttribute('aria-label', plural(count, 'duckling'));
    for (let n = 0; n < count; n++) pad.append(duckling());
    return pad;
  });
  stage.append(...pads);
  return () => {
    pads[answerPad(round)].classList.add('choice-right');
    const [few, many] = [...round.pads].sort((a, b) => a - b);
    return round.ask === 'more' ? `${many} is more than ${few}` : `${few} is fewer than ${many}`;
  };
}

/** Add or send away ducklings on the second pad until it matches the first. */
function drawSame(stage, round, answer) {
  const [goal, start] = round.pads;
  let open = true; // false once the round is over
  const fixed = make('div', 'mof-pad');
  const mine = make('div', 'mof-pad mof-mine');
  const held = () => mine.querySelectorAll('.duckling').length;
  const add = () => {
    if (!open || held() >= MOST) return;
    const duck = mine.appendChild(duckling());
    duck.addEventListener('click', () => open && duck.remove());
  };
  for (let n = 0; n < goal; n++) fixed.append(duckling());
  for (let n = 0; n < start; n++) add();

  const more = button('mof-add', '', add);
  more.append(duckling(), make('span', '', '➕'));
  more.setAttribute('aria-label', 'Add a duckling');
  const done = button('mof-check', '✓', () => answer(held(), mine));
  done.setAttribute('aria-label', 'Check');
  const tools = make('div', 'mof-tools');
  tools.append(more, done);
  stage.append(fixed, mine, tools);

  return () => {
    while (held() > goal) mine.querySelector('.duckling').remove();
    while (held() < goal) add();
    open = false;
    fixed.classList.add('choice-right');
    mine.classList.add('choice-right');
    return `${plural(goal, 'duckling')} on each pad`;
  };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: (round) => LINES[round.ask],
    check,
    draw: (stage, round, answer) => (round.ask === 'same' ? drawSame : drawChoice)(stage, round, answer),
  });
}
