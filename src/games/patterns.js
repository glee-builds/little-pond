// patterns.js: Patterns.
//
// A row of pond things repeats (duckling, flower, duckling, flower, ...) and
// ends with an empty slot. The player taps the picture card that comes next,
// and it hops into the slot. It builds seeing a repeating pattern and
// carrying it on.

import { createRandom } from '../seed.js';
import { make } from '../ui.js';
import { answerCards, playRounds } from '../scene.js';

const svg = (inside) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inside}</svg>`;

// The pond things, each a different shape as well as a different color.
const PICTURES = {
  duckling: '<img src="assets/duck.svg" alt="">',
  flower: svg(`<ellipse cx="50" cy="84" rx="40" ry="11" fill="var(--pad)"/>
    <g fill="var(--blush)" stroke="var(--white)" stroke-width="2">${[-62, 62, -31, 31, 0].map((turn) => `<ellipse cx="50" cy="52" rx="11" ry="26" transform="rotate(${turn} 50 78)"/>`).join('')}</g>
    <circle cx="50" cy="74" r="10" fill="var(--star)"/>`),
  fish: svg(`<path d="M66 50 L96 26 L96 74 Z" fill="var(--words)"/>
    <ellipse cx="42" cy="50" rx="36" ry="24" fill="var(--words)"/>
    <path d="M46 38 Q56 50 46 62" fill="none" stroke="var(--white)" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
    <circle cx="24" cy="44" r="8" fill="var(--white)"/><circle cx="23" cy="45" r="4" fill="var(--on-go)"/>`),
  dragonfly: svg(`<g fill="var(--white)" stroke="var(--here)" stroke-width="3">
    <ellipse cx="27" cy="36" rx="24" ry="10" transform="rotate(-14 27 36)"/><ellipse cx="73" cy="36" rx="24" ry="10" transform="rotate(14 73 36)"/>
    <ellipse cx="30" cy="56" rx="20" ry="8" transform="rotate(16 30 56)"/><ellipse cx="70" cy="56" rx="20" ry="8" transform="rotate(-16 70 56)"/></g>
    <rect x="45" y="24" width="10" height="70" rx="5" fill="var(--here)"/><circle cx="50" cy="18" r="12" fill="var(--here)"/>
    <circle cx="44" cy="15" r="3.5" fill="var(--on-go)"/><circle cx="56" cy="15" r="3.5" fill="var(--on-go)"/>`),
  snail: svg(`<path d="M14 52 L10 38 M24 51 L27 37" stroke="var(--star)" stroke-width="4" stroke-linecap="round"/>
    <rect x="10" y="72" width="84" height="16" rx="8" fill="var(--star)"/><circle cx="20" cy="62" r="13" fill="var(--star)"/>
    <circle cx="60" cy="50" r="30" fill="var(--go)"/><circle cx="60" cy="50" r="17" fill="none" stroke="var(--on-go)" stroke-width="4"/>
    <circle cx="60" cy="50" r="5" fill="var(--on-go)"/><circle cx="16" cy="60" r="3" fill="var(--on-go)"/>`),
};
const THINGS = Object.keys(PICTURES);

export const meta = {
  title: 'Patterns', kind: 'numbers', levels: 3, css: true,
  art: `<span class="art-ducks">${[PICTURES.duckling, PICTURES.flower, PICTURES.duckling].join('')}</span>`
    .replaceAll('<svg ', '<svg width="34" height="34" '),
};

export const ROUNDS = 4;
// The part that repeats at each level: two kinds, two kinds unevenly, three kinds.
const UNITS = [['AB'], ['AAB', 'ABB'], ['ABC']];
const CHOICES = [2, 3, 3];

/** The day's rounds: each is { row, answer, choices }, all names of pond things. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const units = UNITS[level - 1] ?? UNITS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    const unit = random.pick(units);
    const kinds = random.shuffle(THINGS);
    const at = (place) => kinds['ABC'.indexOf(unit[place % unit.length])];
    // Two full repeats, and sometimes one thing more, so the gap isn't always at the same place.
    const length = unit.length * 2 + random.int(0, 1);
    rounds.push({
      row: Array.from({ length }, (_, place) => at(place)),
      answer: at(length),
      // Level 2 has one card that isn't in the pattern at all.
      choices: random.shuffle(kinds.slice(0, CHOICES[level - 1] ?? 3)),
    });
  }
  return { level, rounds };
}

export const check = (round, answer) => answer === round.answer;

/** How many things the row takes to repeat (0 if it never does). */
function period(row) {
  for (let p = 1; p < row.length; p++) if (row.every((kind, i) => i < p || kind === row[i - p])) return p;
  return 0;
}

/** Confirm every round shows its pattern twice over and has exactly one card that carries it on. */
export function verify(puzzle) {
  const problems = [];
  const unit = UNITS[puzzle.level - 1]?.[0].length;
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ row, answer, choices }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const p = period(row);
    if (p !== unit) say(`repeats every ${p} things, not every ${unit}`);
    if (row.length < p * 2) say('fewer than two full repeats are shown');
    if (row.length > 7) say(`${row.length} things is too many to show`);
    if (new Set(row).size !== new Set(UNITS[puzzle.level - 1]?.[0]).size) say('the wrong number of kinds');
    if (answer !== row[row.length - p]) say(`${answer} does not carry the pattern on`);
    if (new Set(choices).size !== CHOICES[puzzle.level - 1] || choices.length !== new Set(choices).size) say('the wrong number of different cards');
    if (!choices.includes(answer)) say('no right card');
    if ([...row, ...choices].some((kind) => !THINGS.includes(kind))) say('a thing that is not in the pond');
  });
  return { ok: problems.length === 0, problems };
}

/** One pond thing's picture. */
function picture(kind, className) {
  const node = make('span', className);
  node.innerHTML = PICTURES[kind];
  return node;
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: () => 'What comes next?',
    check,
    draw(stage, round, answer) {
      const row = make('div', 'pat-row');
      const cells = round.row.length + 1;
      // Up to 5 fit in one line; more wrap onto two even lines, read left to right.
      row.style.setProperty('--columns', cells <= 5 ? cells : Math.ceil(cells / 2));
      for (const kind of round.row) row.append(picture(kind, 'pat-thing'));
      const slot = row.appendChild(make('span', 'pat-thing pat-slot', '?'));
      const cards = answerCards(round.choices, (card, kind) => card.append(picture(kind, 'pat-card')), answer);
      stage.append(row, cards.node);
      return () => {
        cards.markRight(round.answer);
        slot.replaceChildren(picture(round.answer, 'pat-hop'));
        slot.classList.add('pat-filled');
        return `A ${round.answer} comes next`;
      };
    },
  });
}
