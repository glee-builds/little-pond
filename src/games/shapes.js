// shapes.js: Shapes.
//
// Flat colored shapes float on the pond, and the player taps the one that
// is asked for: "Tap the triangle." At the top level the shapes are turned
// and stretched, so the player learns the shape and not one picture of it:
// a triangle pointing down is still a triangle. It builds early geometry.
// Color never tells the answer: colors are random and can repeat.

import { createRandom } from '../seed.js';
import { make, button } from '../ui.js';
import { playRounds } from '../scene.js';

const SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'star'];
const COLORS = ['pad', 'go', 'words', 'star', 'blush', 'here']; // variables in styles.css
const SIZES = [0.65, 0.8, 1];
const LONG = 1.8; // a rectangle is this many times as wide as it is tall

// What a shape may look like at the top level and still be that shape.
// (A stretched circle or square would be a different shape, so they never stretch.)
const TURNS = { circle: [0], square: [0, 20, 45], triangle: [0, 90, 180, 270], rectangle: [0, 30, 90], star: [0, 18, 36] };
const STRETCHES = { triangle: [0.5, 1, 1.6], rectangle: [1.6, 2.2] };

const starPoints = Array.from({ length: 10 }, (_, i) => {
  const reach = i % 2 ? 18 : 42;
  return `${(reach * Math.sin(Math.PI * i / 5)).toFixed(1)},${(-reach * Math.cos(Math.PI * i / 5)).toFixed(1)}`;
}).join(' ');
// Each shape drawn around the middle (0,0) of a 100x100 box. A rectangle is a square, stretched.
const SQUARE = '<rect x="-32" y="-32" width="64" height="64" rx="3"/>';
const DRAWN = {
  circle: '<circle r="36"/>',
  square: SQUARE,
  triangle: '<polygon points="0,-42 38,22 -38,22"/>',
  rectangle: SQUARE,
  star: `<polygon points="${starPoints}"/>`,
};

/** A tile's picture: its shape, turned, sized, and stretched sideways (kept inside the box). */
function drawing({ shape, color, size, turn, stretch }) {
  const fit = size / Math.max(stretch, 1);
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="var(--${color})" transform="rotate(${turn}) scale(${fit * stretch} ${fit})">${DRAWN[shape]}</g></svg>`;
}

export const meta = {
  title: 'Shapes', kind: 'numbers', levels: 3, css: true,
  art: ['circle', 'square', 'triangle'].map((shape, i) => drawing({ shape, color: COLORS[i], size: 1, turn: 0, stretch: 1 })
    .replace('<svg ', '<svg width="40" height="40" ')).join(''),
};

export const ROUNDS = 4;
// At each level: which shapes, and the fewest and most tiles.
const LEVELS = [
  { shapes: SHAPES.slice(0, 3), tiles: [3, 3] },
  { shapes: SHAPES, tiles: [4, 4] },
  { shapes: SHAPES, tiles: [4, 5] },
];

/** The day's rounds: each is { ask, tiles }, one tile per shape, each { shape, color, size, turn, stretch }. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { shapes, tiles: [fewest, most] } = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    const picked = random.shuffle(shapes).slice(0, random.int(fewest, most));
    // Never the same shape asked for twice in a row.
    const ask = random.pick(picked.filter((shape) => shape !== rounds.at(-1)?.ask));
    const tiles = picked.map((shape) => ({
      shape,
      color: random.pick(COLORS),
      size: level === 1 ? 0.9 : random.pick(SIZES),
      turn: level < 3 ? 0 : random.pick(TURNS[shape]),
      stretch: level < 3 ? (shape === 'rectangle' ? LONG : 1) : random.pick(STRETCHES[shape] ?? [1]),
    }));
    rounds.push({ ask, tiles });
  }
  return { level, rounds };
}

/** `answer` is the place of the tapped tile in round.tiles. */
export const check = (round, answer) => round.tiles[answer]?.shape === round.ask;

/** Confirm every round has exactly one tile of the shape asked for, and every tile is truly its shape. */
export function verify(puzzle) {
  const problems = [];
  const { shapes = [], tiles: [fewest, most] = [] } = LEVELS[puzzle.level - 1] ?? {};
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ ask, tiles }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (!(tiles.length >= fewest && tiles.length <= most)) say(`${tiles.length} tiles, not ${fewest} to ${most}`);
    if (tiles.filter((tile) => tile.shape === ask).length !== 1) say(`not exactly one ${ask}`);
    if (new Set(tiles.map((tile) => tile.shape)).size !== tiles.length) say('the same shape twice');
    if (puzzle.level === 1 && new Set(tiles.map((tile) => tile.size)).size !== 1) say('the tiles are not one size');
    if (i > 0 && ask === puzzle.rounds[i - 1].ask) say('the same shape as the round before');
    for (const { shape, color, size, turn, stretch } of tiles) {
      if (!shapes.includes(shape)) say(`${shape} is not a shape at this level`);
      if (!COLORS.includes(color)) say(`${color} is not a color`);
      if (!(size >= 0.6 && size <= 1)) say(`a ${shape} of size ${size}`);
      if (shape === 'rectangle' ? !(stretch >= 1.5) : shape !== 'triangle' && stretch !== 1) say(`a ${shape} stretched ${stretch} times is not a ${shape}`);
      if (!(stretch >= 0.5 && stretch <= 2.2)) say(`a ${shape} stretched ${stretch} times is too thin to see`);
      if (puzzle.level < 3 && (turn !== 0 || (shape === 'triangle' && stretch !== 1))) say(`a ${shape} that is turned or stretched below level 3`);
    }
  });
  return { ok: problems.length === 0, problems };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: (round) => `Tap the ${round.ask}.`,
    check,
    draw(stage, round, answer) {
      const pond = make('div', `shp-pond shp-pond-${round.tiles.length}`);
      const tiles = round.tiles.map((tile, place) => {
        const node = button('shp-tile', '', () => answer(place, node));
        node.innerHTML = drawing(tile);
        node.setAttribute('aria-label', tile.shape);
        return pond.appendChild(node);
      });
      stage.append(pond);
      return () => {
        tiles[round.tiles.findIndex((tile) => tile.shape === round.ask)].classList.add('right');
        return `The ${round.ask}`;
      };
    },
  });
}
