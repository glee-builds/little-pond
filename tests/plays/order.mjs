// How tests/screens.mjs plays Order (see how-many.mjs for what each piece is).
// Ducklings are moved the two-tap way: tap the duckling, then tap a spot on the log.

export const ready = `Boolean(G.querySelector('.ord-duck'))`;

const setup = `
  const want = [...G.round.sizes].sort((a, b) => (G.round.down ? b - a : a - b));
  const slots = [...G.querySelectorAll('.ord-slot')];
  const place = (order) => order.forEach((size, i) => {
    const duck = G.querySelector('.ord-duck[data-size="' + size + '"]');
    if (duck.parentNode !== slots[i]) { duck.click(); slots[i].click(); }
  });`;

// Line them up the way the round asks.
export const right = `${setup} place(want);`;
// One miss: the right order, but with the first two the wrong way round.
export const wrong = `${setup} place([want[1], want[0], ...want.slice(2)]);`;

export const extra = `
  ${setup}
  const ducks = [...G.querySelectorAll('.ord-duck')];
  if (ducks.some((duck) => Math.min(duck.offsetWidth, duck.offsetHeight) < 56)) return 'a duckling is smaller than 56px to pick up';
  const widths = ducks.map((duck) => duck.querySelector('img').offsetWidth).sort((a, b) => a - b);
  if (widths.some((width, i) => i > 0 && width - widths[i - 1] < 8)) return 'two sizes are less than 8px apart: ' + widths;
  const [a, b] = [want[0], want[1]].map((size) => G.querySelector('.ord-duck[data-size="' + size + '"]'));
  a.click(); slots[0].click();
  b.click(); slots[1].click();
  a.click(); b.click();
  if (a.parentNode !== slots[1] || b.parentNode !== slots[0]) return 'tapping one duckling, then another, did not swap them';
  a.click(); slots[2].click();
  return a.parentNode === slots[2] && !G.querySelector('.picked') ? '' : 'a duckling on the log could not be moved again';`;
