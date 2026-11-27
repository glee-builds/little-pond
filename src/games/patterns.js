// patterns.js: Patterns.
//
// A row of pond things repeats (duckling, flower, duckling, flower, ...) with
// an empty slot: at the end, or at the top levels anywhere in the row. The
// player taps the picture card that belongs there, and it hops into the slot.
// It builds seeing a repeating pattern and carrying it on.

import { createRandom } from '../seed.js';
import { make } from '../ui.js';
import { answerCards } from '../scene.js';

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
  title: 'Patterns', kind: 'numbers', levels: 4, css: true,
  art: `<span class="art-ducks">${[PICTURES.duckling, PICTURES.flower, PICTURES.duckling].join('')}</span>`
    .replaceAll('<svg ', '<svg width="34" height="34" '),
};

export const ROUNDS = 4;
// At each level: the parts that repeat, how many cards, and whether the gap can be anywhere (not only at the end).
const LEVELS = [
  { units: ['AAB', 'ABB', 'ABC'], cards: 3, inside: false },
  { units: ['AABB', 'ABAC', 'ABCC', 'AABC'], cards: 4, inside: false },
  { units: ['AABB', 'ABAC', 'ABCC', 'AABC'], cards: 4, inside: true },
  { units: ['ABCD', 'ABCB', 'ABBC', 'ABAC'], cards: 4, inside: true },
];

/** The day's rounds: each is { row, gap, answer, choices }; the slot goes at place `gap` in the row. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { units, cards, inside } = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    const unit = random.pick(units);
    const kinds = random.shuffle(THINGS);
    // Two full repeats and the slot, and sometimes one thing more, so the gap isn't always at the same place.
    const all = Array.from({ length: unit.length * 2 + 1 + random.int(0, 1) }, (_, place) => kinds['ABCD'.indexOf(unit[place % unit.length])]);
    const gap = inside ? random.int(0, all.length - 1) : all.length - 1;
    rounds.push({
      row: all.filter((_, place) => place !== gap),
      gap,
      answer: all[gap],
      // Cards not in the pattern fill up to the level's number of cards.
      choices: random.shuffle(kinds.slice(0, cards)),
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

/** The repeating part as letters, A for the first kind seen, B for the next: "AAB". */
const lettersOf = (things) => things.map((kind) => 'ABCD'[[...new Set(things)].indexOf(kind)]).join('');

/** Confirm every round shows its pattern twice over and has exactly one card that fits the gap. */
export function verify(puzzle) {
  const problems = [];
  const { units = [], cards, inside } = LEVELS[puzzle.level - 1] ?? {};
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ row, gap, answer, choices }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const filled = (kind) => [...row.slice(0, gap), kind, ...row.slice(gap)];
    const all = filled(answer);
    const p = period(all);
    if (!units.includes(lettersOf(all.slice(0, p)))) say(`repeats ${lettersOf(all.slice(0, p))}, not a pattern at this level`);
    if (all.length < p * 2 + 1) say('fewer than two full repeats are shown');
    if (all.length > 10) say(`${all.length} things is too many to show`);
    if (!inside && gap !== row.length) say('the gap is not at the end');
    // A card fits if the row, with it in the gap, repeats at least twice over.
    const fits = choices.filter((kind) => { const q = period(filled(kind)); return q > 0 && q * 2 <= all.length; });
    if (fits.length !== 1 || fits[0] !== answer) say(`${fits.length} cards fit the gap`);
    if (choices.length !== cards || new Set(choices).size !== cards) say('the wrong number of different cards');
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

/** What playRounds needs to play these rounds, for the mixed game this is part of (src/mix.js). */
export function rules() {
  return {
    prompt: (round) => (round.gap === round.row.length ? 'What comes next?' : 'What goes in the gap?'),
    check,
    draw(stage, round, answer) {
      const row = make('div', 'pat-row');
      const cells = round.row.length + 1;
      // Always one line, so the pattern reads straight across; long rows make each thing smaller.
      row.style.setProperty('--columns', cells);
      for (const kind of round.row) row.append(picture(kind, 'pat-thing'));
      const slot = make('span', 'pat-thing pat-slot', '?');
      row.insertBefore(slot, row.children[round.gap] ?? null);
      const cards = answerCards(round.choices, (card, kind) => card.append(picture(kind, 'pat-card')), answer);
      stage.append(row, cards.node);
      return () => {
        cards.markRight(round.answer);
        slot.replaceChildren(picture(round.answer, 'pat-hop'));
        slot.classList.add('pat-filled');
        return round.gap === round.row.length ? `A ${round.answer} comes next` : `A ${round.answer} goes in the gap`;
      };
    },
  };
}
