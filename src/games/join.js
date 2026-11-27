// join.js: Join.
//
// Two groups of ducklings sit on two lily pads. The player pushes the pads
// together (a slide or a tap), they become one group, and the answer cards
// wake up: how many in all? The joined ducklings can be tapped to count.
// At level 2 it runs the other way: one group waits on the bank, and the
// player splits it between two pads, any way that leaves neither empty.
// Level 3 joins again, past 10. Splitting stays at 10 or under: moving 20
// ducklings one at a time would be a chore.
// It builds adding as joining two groups, and the ways to make a number.
// Nothing is written as a sum; the numbers are only said, and shown beside
// the ducklings.

import { createRandom } from '../seed.js';
import { make, range } from '../ui.js';
import { ducklings, tapToCount, dotCards, nearChoices, bank } from '../scene.js';

const duckAt = (x) => `<image href="assets/duck.svg" x="${x}" y="6" width="24" height="22"/>`;
const padAt = (x) => `<ellipse cx="${x}" cy="34" rx="30" ry="14" style="fill:var(--pad)"/>`;

export const meta = {
  title: 'Join', kind: 'numbers', levels: 3, css: true,
  art: `<svg viewBox="0 0 120 52" width="120" height="52" aria-hidden="true">${padAt(40)}${padAt(80)}${[14, 38, 74].map(duckAt).join('')}</svg>`,
};

export const ROUNDS = 4;
// Each level: join (the fewest and most in all) or split (the sizes of the group to split).
const LEVELS = [{ join: [4, 10] }, { split: [5, 10] }, { join: [11, 20] }];
const GROUP = 10; // the most on one pad when joining
const rule = (level) => LEVELS[level - 1] ?? LEVELS.at(-1);

/**
 * The day's rounds. Joining: { a, b, choices }, two groups and 3
 * answer cards. Splitting: { whole }, a group to split, a different size
 * every round, so no way of splitting one comes up twice in a day.
 */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { join, split } = rule(level);
  if (split) {
    return { level, rounds: random.shuffle(range(...split)).slice(0, ROUNDS).map((whole) => ({ whole })) };
  }
  const [low, high] = join;
  const rounds = [];
  let last = 0;
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number in all twice in a row.
    const total = random.pick(range(low, high).filter((n) => n !== last));
    const a = random.int(Math.max(1, total - GROUP), Math.min(GROUP, total - 1));
    rounds.push({ a, b: total - a, choices: nearChoices(random, total, 1, high) });
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
  const { join, split } = rule(puzzle.level);
  const [low, high] = split ?? join;
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const total = split ? round.whole : round.a + round.b;
    const before = puzzle.rounds[i - 1];
    if (!(total >= low && total <= high)) say(`${total} is outside ${low} to ${high}`);
    if (split) {
      if (!check(round, [1, total - 1])) say('a split into two groups is not accepted');
      if (puzzle.rounds.findIndex(({ whole }) => whole === total) !== i) say(`${total} was already split today`);
      return;
    }
    const { a, b, choices = [] } = round;
    if (!(a >= 1 && b >= 1)) say('a pad is empty');
    if (a > GROUP || b > GROUP) say(`a pad has more than ${GROUP}`);
    if (new Set(choices).size !== 3) say('the choices are not 3 different numbers');
    if (choices.filter((choice) => check(round, choice)).length !== 1) say('not exactly one right choice');
    if (choices.some((choice) => choice < 1 || choice > high)) say(`a choice is outside 1 to ${high}`);
    if (before && total === before.a + before.b) say('the same number as the round before');
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
  const cards = dotCards(round.choices, answer);
  cards.sleep();
  function join() {
    if (pond.classList.contains('join-joined')) return;
    pond.classList.add('join-joined', 'to-count');
    // After the slide, so the tap that pushed the pads doesn't also count a duckling.
    setTimeout(() => {
      tapToCount([...pond.querySelectorAll('.duckling')]);
      cards.wake();
    }, BEAT);
  }
  for (const count of [round.a, round.b]) {
    const pad = pond.appendChild(make('div', 'long-pad'));
    ducklings(count, pad);
    // A slide ends in pointerup, a tap (or a key press) in click: either pushes.
    pad.addEventListener('pointerup', join);
    pad.addEventListener('click', join);
  }
  stage.append(pond, cards.node);
  return () => {
    cards.markRight(total);
    return makes(round.a, round.b);
  };
}

/** One group on the bank and two empty pads; checked as soon as the bank is empty. */
function drawSplit(stage, round, answer) {
  const pond = make('div', 'join-pond join-pond-split');
  const pads = [0, 1].map(() => pond.appendChild(make('div', 'long-pad')));
  const counts = () => pads.map((pad) => pad.querySelectorAll('.duckling').length);
  const waiting = bank(round.whole, pads, () => waiting.isEmpty() && answer(counts(), pond));
  stage.append(waiting.node, pond);
  return () => {
    waiting.close();
    if (!check(round, counts())) waiting.share();
    const [a, b] = counts();
    pads.forEach((pad, i) => pad.append(make('span', 'count-badge', String([a, b][i]))));
    return makes(a, b);
  };
}

/** What playRounds needs to play these rounds, for the mixed game this is part of (src/mix.js). */
export function rules() {
  return {
    prompt: (round) => (round.whole ? SPLIT_LINE : JOIN_LINE),
    check,
    draw: (stage, round, answer) => (round.whole ? drawSplit : drawJoin)(stage, round, answer),
  };
}
