// groups.js: Groups.
//
// Ducklings wait on the bank beside some empty lily pads. The player moves
// them onto the pads (drag, or tap a duckling and then a pad) so every pad
// has the same number, then taps the big check mark. A duckling on a pad
// can be moved again. At the top level no number is given: the player
// shares the ducklings out fairly.
// It builds equal groups, the start of multiplying and dividing.

import { createRandom } from '../seed.js';
import { make, plural } from '../ui.js';
import { bank, checkButton, playRounds } from '../scene.js';

const duckAt = (x) => `<image href="assets/duck.svg" x="${x}" y="6" width="24" height="22"/>`;
const padAt = (x) => `<ellipse cx="${x}" cy="34" rx="28" ry="14" style="fill:var(--pad)"/>`;

export const meta = {
  title: 'Groups', kind: 'numbers', levels: 3, css: true,
  art: `<svg viewBox="0 0 120 52" width="120" height="52" aria-hidden="true">${padAt(30)}${padAt(90)}${[5, 31, 65, 91].map(duckAt).join('')}</svg>`,
};

export const ROUNDS = 4;
// Each level's rounds, as [pads, ducklings on each pad].
const LEVELS = [
  [[2, 1], [2, 2], [2, 3]],
  [[3, 1], [3, 2], [3, 3]],
  [[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 3]],
];
const FAIR = 3; // the level where the player works out how many go on each pad

const same = (round, [pads, each]) => round?.pads === pads && round.each === each;

/** The day's rounds: each is { pads, each, fair }. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const shapes = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same round twice in a row.
    const [pads, each] = random.pick(shapes.filter((shape) => !same(rounds.at(-1), shape)));
    rounds.push({ pads, each, fair: level >= FAIR });
  }
  return { level, rounds };
}

/** `answer` is how many ducklings are on each pad, e.g. [2, 2, 2]. */
export const check = (round, answer) => answer.length === round.pads && answer.every((count) => count === round.each);

/** Confirm every round is one of its level's, and that equal groups are accepted. */
export function verify(puzzle) {
  const problems = [];
  const shapes = LEVELS[puzzle.level - 1] ?? [];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (!shapes.some((shape) => same(round, shape))) say(`${round.pads} pads of ${round.each} is not a level ${puzzle.level} round`);
    if (round.pads * round.each > 10) say('more than 10 ducklings');
    if (round.fair !== (puzzle.level >= FAIR)) say(`asks the wrong way for level ${puzzle.level}`);
    if (!check(round, Array(round.pads).fill(round.each))) say('equal groups are not accepted');
    if (i > 0 && same(puzzle.rounds[i - 1], [round.pads, round.each])) say('the same as the round before');
  });
  return { ok: problems.length === 0, problems };
}

const prompt = (round) => (round.fair ? 'Share the ducklings fairly.' : `Put ${plural(round.each, 'duckling')} on each pad.`);

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt,
    check,
    draw(stage, round, answer) {
      const row = make('div', 'grp-pads');
      const pads = Array.from({ length: round.pads }, () => row.appendChild(make('div', 'long-pad')));
      // Asleep until the bank is empty, so a half-done round is never a miss.
      const done = checkButton(() => answer(pads.map((pad) => pad.children.length), row));
      done.disabled = true;
      const waiting = bank(round.pads * round.each, pads, () => { done.disabled = !waiting.isEmpty(); });
      stage.append(waiting.node, row, done);
      return () => {
        waiting.close();
        waiting.share();
        for (const pad of pads) pad.classList.add('right');
        return `${plural(round.each, 'duckling')} on each pad`;
      };
    },
  });
}
