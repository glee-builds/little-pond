// join.js: Join.
//
// Two groups of ducklings sit on two lily pads. The player pushes the pads
// together (a slide or a tap), they become one group, and the answer cards
// wake up: how many in all? The joined ducklings can be tapped to count.
// At the top level it runs the other way: one group waits on the bank, and
// the player splits it between two pads, any way that leaves neither empty.
// It builds adding as joining two groups, and the ways to make a number.
// Nothing is written as a sum; the numbers are only said, and shown beside
// the ducklings.

import { createRandom } from '../seed.js';
import { make } from '../ui.js';
import { duckling, dotCard, tapToCount, draggable, playRounds } from '../scene.js';

const duckAt = (x) => `<image href="assets/duck.svg" x="${x}" y="6" width="24" height="22"/>`;
const padAt = (x) => `<ellipse cx="${x}" cy="34" rx="30" ry="14" style="fill:var(--pad)"/>`;

export const meta = {
  title: 'Join', kind: 'numbers', levels: 3, css: true,
  art: `<svg viewBox="0 0 120 52" width="120" height="52" aria-hidden="true">${padAt(40)}${padAt(80)}${[14, 38, 74].map(duckAt).join('')}</svg>`,
};

export const ROUNDS = 4;
// Levels 1 and 2: the fewest and most ducklings in all. Level 3: the sizes of the group to split.
const TOTALS = [[2, 5], [6, 10]];
const WHOLES = [5, 10];
const SPLIT = 3;

const range = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);

/**
 * The day's rounds. Levels 1 and 2: { a, b, choices }, two groups and 3
 * answer cards. Level 3: { whole }, a group to split, a different size
 * every round, so no way of splitting one comes up twice in a day.
 */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  if (level >= SPLIT) {
    return { level, rounds: random.shuffle(range(...WHOLES)).slice(0, ROUNDS).map((whole) => ({ whole })) };
  }
  const [low, high] = TOTALS[level - 1];
  const rounds = [];
  let last = 0;
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number in all twice in a row.
    const total = random.pick(range(low, high).filter((n) => n !== last));
    const a = random.int(1, total - 1);
    const near = range(Math.max(1, total - 2), Math.min(high, total + 2)).filter((n) => n !== total);
    rounds.push({ a, b: total - a, choices: random.shuffle([total, ...random.shuffle(near).slice(0, 2)]) });
    last = total;
  }
  return { level, rounds };
}

/** Joining: `answer` is the card's number. Splitting: how many are on each pad, e.g. [2, 3]. */
export const check = (round, answer) => (round.whole
  ? answer.length === 2 && answer.every((count) => count >= 1) && answer[0] + answer[1] === round.whole
  : answer === round.a + round.b);

/** Confirm every round can be answered and is in range for its level. */
export function verify(puzzle) {
  const problems = [];
  const split = puzzle.level >= SPLIT;
  const [low, high] = split ? WHOLES : TOTALS[puzzle.level - 1] ?? [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const total = split ? round.whole : round.a + round.b;
    const before = puzzle.rounds[i - 1];
    if (!(total >= low && total <= high)) problems.push(`round ${i + 1}: ${total} is outside ${low} to ${high}`);
    if (split) {
      if (!check(round, [1, total - 1])) problems.push(`round ${i + 1}: a split into two groups is not accepted`);
      if (puzzle.rounds.findIndex(({ whole }) => whole === total) !== i) problems.push(`round ${i + 1}: ${total} was already split today`);
      return;
    }
    const { a, b, choices = [] } = round;
    if (!(a >= 1 && b >= 1)) problems.push(`round ${i + 1}: a pad is empty`);
    if (new Set(choices).size !== 3) problems.push(`round ${i + 1}: the choices are not 3 different numbers`);
    if (choices.filter((choice) => check(round, choice)).length !== 1) problems.push(`round ${i + 1}: not exactly one right choice`);
    if (choices.some((choice) => choice < 1 || choice > high)) problems.push(`round ${i + 1}: a choice is outside 1 to ${high}`);
    if (before && total === before.a + before.b) problems.push(`round ${i + 1}: the same number as the round before`);
  });
  return { ok: problems.length === 0, problems };
}

const JOIN_LINE = 'Push the pads together. How many in all?';
const SPLIT_LINE = 'Make two groups.';
const BEAT = 700; // time for the pads to slide together before the cards wake up

/** "2 and 3 make 5": said, never written. */
const makes = (a, b) => `${a} and ${b} make ${a + b}`;

/** Two pads of ducklings to push together, then cards for how many in all. */
function drawJoin(stage, round, answer) {
  const total = round.a + round.b;
  const pond = make('div', `join-pond${total > 5 ? ' join-pond-full' : ''}`);
  const row = make('div', 'choices choices-waiting');
  const cards = round.choices.map((count) => row.appendChild(dotCard(count, (card) => answer(count, card))));
  function join() {
    if (pond.classList.contains('join-joined')) return;
    pond.classList.add('join-joined');
    // After the slide, so the tap that pushed the pads doesn't also count a duckling.
    setTimeout(() => {
      tapToCount([...pond.querySelectorAll('.duckling')]);
      row.classList.remove('choices-waiting');
    }, BEAT);
  }
  for (const count of [round.a, round.b]) {
    const pad = pond.appendChild(make('div', 'join-pad'));
    for (let i = 0; i < count; i++) pad.append(duckling());
    // A slide ends in pointerup, a tap (or a key press) in click: either pushes.
    pad.addEventListener('pointerup', join);
    pad.addEventListener('click', join);
  }
  stage.append(pond, row);
  return () => {
    cards[round.choices.indexOf(total)].classList.add('choice-right');
    return makes(round.a, round.b);
  };
}

/** One group on the bank and two empty pads; checked as soon as the bank is empty. */
function drawSplit(stage, round, answer) {
  let over = false;
  const bank = make('div', 'join-bank');
  const pond = make('div', 'join-pond join-pond-split');
  const pads = [0, 1].map(() => pond.appendChild(make('div', 'join-pad')));
  const counts = () => pads.map((pad) => pad.querySelectorAll('.duckling').length);
  const ducks = Array.from({ length: round.whole }, () => {
    const duck = bank.appendChild(duckling());
    draggable(duck, {
      targets: () => pads,
      canMove: () => !over,
      onDrop(i) {
        pads[i].append(duck);
        if (!bank.children.length) answer(counts(), pond);
      },
    });
    return duck;
  });
  stage.append(bank, pond);
  return () => {
    over = true;
    if (!check(round, counts())) ducks.forEach((duck, i) => pads[i % 2].append(duck));
    const [a, b] = counts();
    pads.forEach((pad, i) => pad.append(make('span', 'count-badge', String([a, b][i]))));
    return makes(a, b);
  };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: (round) => (round.whole ? SPLIT_LINE : JOIN_LINE),
    check,
    draw: (stage, round, answer) => (round.whole ? drawSplit : drawJoin)(stage, round, answer),
  });
}
