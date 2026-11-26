// How tests/screens.mjs plays Shapes (see tests/plays/how-many.mjs).

export const ready = `G.querySelectorAll('.shp-tile').length > 2`;

const tile = (right) => `[...G.querySelectorAll('.shp-tile')].find((tile, place) => (G.round.tiles[place].shape === G.round.ask) === ${right}).click();`;

export const right = tile(true);
export const wrong = tile(false);

// Every shape on screen, each with a tap area of at least 64px that no other covers.
export const extra = `
  const boxes = [...G.querySelectorAll('.shp-tile')].map((tile) => tile.getBoundingClientRect());
  if (boxes.length !== G.round.tiles.length) return 'not one tile for each shape';
  if (boxes.some((box) => Math.min(box.width, box.height) < 64)) return 'a tap area is smaller than 64px';
  const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  return boxes.every((a, i) => boxes.every((b, j) => i === j || apart(a, b))) ? '' : 'two tap areas overlap';`;
