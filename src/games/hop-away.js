// hop-away.js: Hop Away.
//
// Ducklings sit on a log. The player taps the big go button, and some of
// them hop into the water, where they stay in view, faded. The player then
// taps the card for how many are left on the log (tapping those ducklings
// counts them aloud). It builds taking away: a group gets smaller when some
// leave, and what left can still be seen.

import { createRandom } from '../seed.js';
import { make, button, plural } from '../ui.js';
import { duckling, dotCard, tapToCount, playRounds } from '../scene.js';

export const meta = {
  title: 'Hop Away', kind: 'numbers', levels: 3, css: true,
  art: '<span class="art-ducks"><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt="" style="opacity:.35;transform:translateY(8px)"></span>',
};

export const ROUNDS = 4;
// At each level: how many start on the log, how many hop away, and the fewest that must stay.
const LEVELS = [
  { start: [2, 5], away: [1, 4], keep: 1 },
  { start: [4, 10], away: [1, 3], keep: 1 },
  { start: [4, 10], away: [3, 10], keep: 0 },
];

const range = (low, high) => Array.from({ length: high - low + 1 }, (_, i) => low + i);
const left = (round) => round.start - round.away;

/** The day's rounds: each is { start, away, choices }, with 3 choices close together. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { start: [low, high], away: [few, many], keep } = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same number on the log twice in a row.
    const start = random.pick(range(low, high).filter((n) => n !== rounds.at(-1)?.start));
    const away = random.int(few, Math.min(many, start - keep));
    const stay = start - away;
    const near = range(Math.max(keep, stay - 2), Math.min(high, stay + 2)).filter((n) => n !== stay);
    rounds.push({ start, away, choices: random.shuffle([stay, ...random.shuffle(near).slice(0, 2)]) });
  }
  return { level, rounds };
}

export const check = (round, answer) => answer === left(round);

/** Confirm every round can be answered and is in range for its level. */
export function verify(puzzle) {
  const problems = [];
  const { start: [low, high], away: [few, many], keep } = LEVELS[puzzle.level - 1] ?? { start: [], away: [] };
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const { start, away, choices } = round;
    if (!(start >= low && start <= high)) problems.push(`round ${i + 1}: starting with ${start} is outside ${low} to ${high}`);
    if (!(away >= few && away <= many)) problems.push(`round ${i + 1}: ${away} hopping away is outside ${few} to ${many}`);
    if (!(left(round) >= keep)) problems.push(`round ${i + 1}: ${left(round)} left is fewer than ${keep}`);
    if (new Set(choices).size !== 3) problems.push(`round ${i + 1}: the choices are not 3 different numbers`);
    if (choices.filter((choice) => choice === left(round)).length !== 1) problems.push(`round ${i + 1}: not exactly one right choice`);
    if (choices.some((choice) => choice < keep || choice > high)) problems.push(`round ${i + 1}: a choice is outside ${keep} to ${high}`);
    if (i > 0 && start === puzzle.rounds[i - 1].start) problems.push(`round ${i + 1}: the same number as the round before`);
  });
  return { ok: problems.length === 0, problems };
}

const LINE = 'Some ducklings hop away. How many are left?';
const STAGGER = 80; // each duckling hops a moment after the one before
const HOP = 600;    // how long one hop takes (hop-away.css)

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: () => LINE,
    check,
    draw(stage, round, answer) {
      const pond = make('div', 'hop-pond');
      const water = make('div', 'hop-water');
      // Logs of 5, like the rows of dots on the cards.
      const logs = range(1, Math.ceil(round.start / 5)).map(() => make('div', 'hop-log'));
      const ducks = range(0, round.start - 1).map((i) => logs[Math.floor(i / 5)].appendChild(duckling()));
      pond.append(...logs, water);

      const row = make('div', 'choices choices-waiting');
      const cards = round.choices.map((count) => row.appendChild(dotCard(count, (card) => answer(count, card))));
      const go = button('hop-go', '', () => {
        go.remove();
        ducks.slice(left(round)).forEach((duck, i) => {
          duck.style.animationDelay = `${i * STAGGER}ms`;
          water.append(duck);
        });
        tapToCount(ducks.slice(0, left(round)));
        setTimeout(() => row.classList.remove('choices-waiting'), round.away * STAGGER + HOP);
      });
      go.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      go.setAttribute('aria-label', 'Go');
      const answers = make('div', 'hop-answers');
      answers.append(row, go);

      stage.append(pond, answers);
      return () => {
        cards[round.choices.indexOf(left(round))].classList.add('choice-right');
        return plural(left(round), 'duckling');
      };
    },
  });
}
