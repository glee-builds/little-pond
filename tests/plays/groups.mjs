// How tests/screens.mjs plays Groups (see tests/plays/how-many.mjs for what
// each piece is). Ducklings are moved the tap-tap way: tap one, tap a pad.

export const ready = `Boolean(G.querySelector('.long-pad'))`;

// Put duckling i on the pad that `to` gives for it, then tap the check mark.
const place = (to) => `{
  const pads = [...G.querySelectorAll('.long-pad')];
  [...G.querySelectorAll('.duckling')].forEach((duck, i) => { duck.click(); pads[${to}].click(); });
  G.querySelector('.round-button').click();
}`;

// Deal them out one pad at a time: the same number lands on each.
export const right = place('i % pads.length');
// Every duckling on the first pad: one miss.
export const wrong = place('0');

export const extra = `
  const pads = [...G.querySelectorAll('.long-pad')];
  const ducks = [...G.querySelectorAll('.duckling')];
  const done = G.querySelector('.round-button');
  done.click();
  await wait();
  if (G.querySelector('.wiggle')) return 'the check mark worked before every duckling was on a pad';
  ducks.forEach((duck) => { duck.click(); pads[0].click(); });
  if (pads[0].children.length !== ducks.length) return 'tapping a duckling and then a pad did not move it';
  if (done.disabled) return 'the check mark did not wake up when the bank was empty';
  ducks[0].click(); pads[1].click();
  return pads[1].children.length === 1 ? '' : 'a duckling on a pad could not be moved again';`;
