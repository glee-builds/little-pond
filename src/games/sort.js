// sort.js: Sort.
//
// A handful of things wait at the bottom. Each lily pad at the top shows a
// picture of what belongs on it. The player drags each thing to its pad (or
// taps the thing, then the pad). It builds noticing what things have in
// common, the idea every group depends on.

import { createRandom } from '../seed.js';
import { make } from '../ui.js';
import { duckling, draggable, playRounds } from '../scene.js';

export const meta = {
  title: 'Sort', kind: 'numbers', levels: 3, css: true,
  art: '<span class="art-ducks" style="align-items:center;font-size:28px;line-height:1"><img src="assets/duck.svg" alt="">🐟🐸</span>',
};

export const ROUNDS = 4;

// Kinds that are not ducklings. Each differs from the others in shape as well as color.
const EMOJI = { fish: '🐟', frog: '🐸', bug: '🐞' };
const ANIMALS = ['duck', 'fish', 'frog', 'bug'];
// Each level: the kinds its pads are picked from, how many pads, and the fewest and most things.
const LEVELS = [
  { kinds: ['big', 'small'], pads: 2, things: [4, 5] },
  { kinds: ANIMALS, pads: 2, things: [5, 6] },
  { kinds: ANIMALS, pads: 3, things: [6, 6] },
];

/** The day's rounds: each is { pads, things }, both lists of kinds; a thing belongs on the pad of its kind. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { kinds, pads: padCount, things: [low, high] } = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = Array.from({ length: ROUNDS }, () => {
    const pads = random.shuffle(kinds).slice(0, padCount);
    // Shared out as evenly as they go, so every pad gets a group.
    const things = random.shuffle(Array.from({ length: random.int(low, high) }, (_, i) => pads[i % padCount]));
    return { pads, things };
  });
  return { level, rounds };
}

/** `answer` lists the pad each thing is on (null while it waits): right when every thing is on its own kind's pad. */
export const check = (round, answer) => round.things.every((kind, i) => round.pads[answer[i]] === kind);

/** Confirm every round can be sorted: pads of different kinds, and every thing has a pad. */
export function verify(puzzle) {
  const problems = [];
  const { kinds = [], pads: padCount, things: [low, high] = [] } = LEVELS[puzzle.level - 1] ?? {};
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const { pads, things } = round;
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (pads.length !== padCount || new Set(pads).size !== padCount) say(`not ${padCount} different pads`);
    if (pads.some((kind) => !kinds.includes(kind))) say('a pad is not one of this level\'s kinds');
    if (!(things.length >= low && things.length <= high)) say(`${things.length} things, not ${low} to ${high}`);
    if (things.some((kind) => !pads.includes(kind))) say('a thing has no pad');
    if (pads.some((kind) => !things.includes(kind))) say('a pad gets nothing');
    const sorted = things.map((kind) => pads.indexOf(kind));
    if (!check(round, sorted)) say('the right sorting is not accepted');
    if (check(round, sorted.map((pad, at) => (at === 0 ? (pad + 1) % pads.length : pad)))) say('a wrong sorting is accepted');
  });
  return { ok: problems.length === 0, problems };
}

/** A picture of one thing of a kind. */
function picture(kind) {
  const node = EMOJI[kind] ? make('span', '', EMOJI[kind]) : duckling();
  node.classList.add('sort-thing', `sort-${kind}`);
  node.dataset.kind = kind;
  return node;
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: () => 'Put each one on its pad.',
    check,
    draw(stage, round, answer) {
      const placed = round.things.map(() => null); // the pad each thing is on
      let over = false;
      const row = make('div', 'sort-pads');
      const pads = round.pads.map((kind) => {
        const pad = row.appendChild(make('div', 'sort-pad'));
        pad.dataset.kind = kind;
        pad.appendChild(make('span', 'sort-label')).append(picture(kind));
        return pad;
      });
      const tray = make('div', 'sort-tray');
      const put = (i, pad) => {
        placed[i] = pad;
        pads[pad].append(things[i]);
      };
      const things = round.things.map((kind, i) => {
        const thing = tray.appendChild(picture(kind));
        draggable(thing, {
          targets: () => pads,
          canMove: () => !over && placed[i] === null,
          onDrop(pad) {
            // A wrong pad is a miss, and the thing stays where it was.
            if (round.pads[pad] !== kind) return answer(placed.map((at, j) => (j === i ? pad : at)), thing);
            put(i, pad);
            if (!placed.includes(null)) answer(placed);
          },
        });
        return thing;
      });
      stage.append(row, tray);
      return () => {
        over = true;
        round.things.forEach((kind, i) => put(i, round.pads.indexOf(kind)));
        for (const pad of pads) pad.classList.add('right');
        return 'Every one is on its pad';
      };
    },
  });
}
