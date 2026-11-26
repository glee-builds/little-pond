// How tests/screens.mjs plays Match the Number (see tests/plays/how-many.mjs
// for how these pieces are used).

// True once a round is drawn.
export const ready = `Boolean(G.querySelector('.mtn-home .mtn-tile'))`;

// Tap the numeral, then tap a pad: the same path as a drag.
const put = (right) => `
  G.querySelector('.mtn-tile').click();
  [...G.querySelectorAll('.mtn-pad')].find((pad, i) => (G.round.pads[i] === G.round.count) === ${right}).click();`;

// Answer the round on screen correctly.
export const right = put(true);
// One miss on the round on screen.
export const wrong = put(false);

// Tap-to-count works on a pad, and a tap picks the numeral up.
export const extra = `
  const pad = G.querySelector('.mtn-pad');
  for (const duck of pad.querySelectorAll('.duckling')) duck.click();
  if (pad.querySelectorAll('.count-badge').length !== G.round.pads[0]) return 'tapping did not count every duckling on a pad';
  G.querySelector('.mtn-tile').click();
  return G.querySelector('.mtn-tile.picked') ? '' : 'tapping the numeral did not pick it up';`;
