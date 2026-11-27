// shapes.js: Shapes.
//
// Flat colored shapes float on the pond, and the player taps the one that
// is asked for: "Tap the triangle." From level 2 the shapes are turned and
// stretched, so the player learns the shape and not one picture of it: a
// triangle pointing down is still a triangle. Levels 3 and 4 add the oval and
// the diamond, and at the top the shape asked for always floats beside its
// look-alike (circle and oval, square and rectangle or diamond). It builds
// early geometry.
// Color never tells the answer: colors are random and can repeat.

import { createRandom } from '../seed.js';
import { make, button } from '../ui.js';

const SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'star', 'oval', 'diamond'];
const COLORS = ['pad', 'go', 'words', 'star', 'blush', 'here']; // variables in styles.css
const SIZES = [0.65, 0.8, 1];

// What a shape may look like once turned and stretched, and still be that shape.
// (A stretched circle or square would be a different shape, so they never stretch;
// a square turned far looks like a diamond, so it turns only a little.)
const TURNS = { circle: [0], square: [0, 10, 20], triangle: [0, 90, 180, 270], rectangle: [0, 30, 90], star: [0, 18, 36], oval: [0, 30, 90], diamond: [0, 90] };
const STRETCHES = { triangle: [0.5, 1, 1.6], rectangle: [1.6, 2.2], oval: [1.5, 1.8] };
// Before shapes turn and stretch, a rectangle and an oval are always this long.
const PLAIN = { rectangle: 1.8, oval: 1.6 };
// The shapes each one is easy to mix up with.
const LOOKALIKES = { circle: ['oval'], oval: ['circle'], square: ['rectangle', 'diamond'], rectangle: ['square'], diamond: ['square'] };

const starPoints = Array.from({ length: 10 }, (_, i) => {
  const reach = i % 2 ? 18 : 42;
  return `${(reach * Math.sin(Math.PI * i / 5)).toFixed(1)},${(-reach * Math.cos(Math.PI * i / 5)).toFixed(1)}`;
}).join(' ');
// Each shape drawn around the middle (0,0) of a 100x100 box. A rectangle is a square, stretched; an oval is a circle, stretched.
const SQUARE = '<rect x="-32" y="-32" width="64" height="64" rx="3"/>';
const DRAWN = {
  circle: '<circle r="36"/>',
  square: SQUARE,
  triangle: '<polygon points="0,-42 38,22 -38,22"/>',
  rectangle: SQUARE,
  star: `<polygon points="${starPoints}"/>`,
  oval: '<circle r="36"/>',
  diamond: '<polygon points="0,-44 30,0 0,44 -30,0"/>',
};

/** A tile's picture: its shape, turned, sized, and stretched sideways (kept inside the box). */
function drawing({ shape, color, size, turn, stretch }) {
  const fit = size / Math.max(stretch, 1);
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="var(--${color})" transform="rotate(${turn}) scale(${fit * stretch} ${fit})">${DRAWN[shape]}</g></svg>`;
}

export const meta = {
  title: 'Shapes', kind: 'numbers', levels: 4, css: true,
  art: ['circle', 'square', 'triangle'].map((shape, i) => drawing({ shape, color: COLORS[i], size: 1, turn: 0, stretch: 1 })
    .replace('<svg ', '<svg width="40" height="40" ')).join(''),
};

export const ROUNDS = 4;
// At each level: which shapes, the fewest and most tiles, whether they turn and stretch, and whether look-alikes always come along.
const LEVELS = [
  { shapes: SHAPES.slice(0, 5), tiles: [4, 4], turned: false, alike: false },
  { shapes: SHAPES.slice(0, 5), tiles: [4, 5], turned: true, alike: false },
  { shapes: SHAPES, tiles: [5, 6], turned: true, alike: false },
  { shapes: SHAPES, tiles: [6, 6], turned: true, alike: true },
];

/** The day's rounds: each is { ask, tiles }, one tile per shape, each { shape, color, size, turn, stretch }. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const { shapes, tiles: [fewest, most], turned, alike } = LEVELS[level - 1] ?? LEVELS.at(-1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    // Never the same shape asked for twice in a row.
    const ask = random.pick(shapes.filter((shape) => shape !== rounds.at(-1)?.ask));
    const along = alike ? LOOKALIKES[ask] ?? [] : [];
    const others = random.shuffle(shapes.filter((shape) => shape !== ask && !along.includes(shape)));
    const picked = random.shuffle([ask, ...along, ...others].slice(0, random.int(fewest, most)));
    const tiles = picked.map((shape) => ({
      shape,
      color: random.pick(COLORS),
      size: random.pick(SIZES),
      turn: turned ? random.pick(TURNS[shape]) : 0,
      stretch: turned ? random.pick(STRETCHES[shape] ?? [1]) : PLAIN[shape] ?? 1,
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
  const { shapes = [], tiles: [fewest, most] = [], turned, alike } = LEVELS[puzzle.level - 1] ?? {};
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach(({ ask, tiles }, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    if (!(tiles.length >= fewest && tiles.length <= most)) say(`${tiles.length} tiles, not ${fewest} to ${most}`);
    if (tiles.filter((tile) => tile.shape === ask).length !== 1) say(`not exactly one ${ask}`);
    if (new Set(tiles.map((tile) => tile.shape)).size !== tiles.length) say('the same shape twice');
    if (alike && (LOOKALIKES[ask] ?? []).some((shape) => !tiles.some((tile) => tile.shape === shape))) say(`a ${ask} without its look-alikes`);
    if (i > 0 && ask === puzzle.rounds[i - 1].ask) say('the same shape as the round before');
    for (const { shape, color, size, turn, stretch } of tiles) {
      if (!shapes.includes(shape)) say(`${shape} is not a shape at this level`);
      if (!COLORS.includes(color)) say(`${color} is not a color`);
      if (!(size >= 0.6 && size <= 1)) say(`a ${shape} of size ${size}`);
      if (shape in PLAIN ? !(stretch >= 1.5) : shape !== 'triangle' && stretch !== 1) say(`a ${shape} stretched ${stretch} times is not a ${shape}`);
      if (!(stretch >= 0.5 && stretch <= 2.2)) say(`a ${shape} stretched ${stretch} times is too thin to see`);
      if (shape === 'square' && Math.min(turn % 90, 90 - (turn % 90)) > 20) say(`a square turned ${turn} looks like a diamond`);
      if (shape === 'diamond' && turn % 90 !== 0) say(`a diamond turned ${turn} is lopsided`);
      if (!turned && (turn !== 0 || stretch !== (PLAIN[shape] ?? 1))) say(`a ${shape} that is turned or stretched at this level`);
    }
  });
  return { ok: problems.length === 0, problems };
}

/** What playRounds needs to play these rounds, for the mixed game this is part of (src/mix.js). */
export function rules() {
  return {
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
  };
}
