// How tests/screens.mjs plays Join (see tests/plays/how-many.mjs for what
// each piece is). G.round.whole means a splitting round (level 3): its
// ducklings are moved the tap-tap way: tap one, tap a pad.

export const ready = `Boolean(G.querySelector('.long-pad'))`;

// Joining: push the pads together, let the cards wake up, and tap a card.
const card = (right) => `
  G.querySelector('.long-pad').click(); await wait(900);
  [...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === String(G.round.a + G.round.b)) === ${right}).click();`;

// Splitting: `to` gives the pad for duckling i. Only ducklings still on the
// bank move, and the first one, so it is one check however the round stands.
const split = (to) => `
  const pads = [...G.querySelectorAll('.long-pad')];
  [...G.querySelectorAll('.duckling')].forEach((duck, i) => {
    if (i === 0 || duck.closest('.bank')) { duck.click(); pads[${to}].click(); }
  });`;

// One duckling on the second pad, the rest on the first.
export const right = `if (G.round.whole) { ${split('i === 0 ? 1 : 0')} } else { ${card(true)} }`;
// Every duckling on the first pad, leaving the second empty: one miss.
export const wrong = `if (G.round.whole) { ${split('0')} } else { ${card(false)} }`;

export const extra = `
  if (/[+=]/.test(G.textContent)) return 'a sum is written on the screen';
  const pads = [...G.querySelectorAll('.long-pad')];
  const ducks = [...G.querySelectorAll('.duckling')];
  if (G.round.whole) {
    if (ducks.length !== G.round.whole || pads.some((pad) => pad.children.length)) return 'the round does not start as one group and two empty pads';
    ducks[0].click(); pads[0].click();
    ducks[0].click(); pads[1].click();
    return pads[1].children.length === 1 && !pads[0].children.length ? '' : 'a duckling on a pad could not be moved again';
  }
  if (!G.querySelector('.choices-waiting')) return 'the cards can be tapped before the pads are pushed together';
  ducks[0].click();
  if (G.querySelector('.count-badge')) return 'the tap that pushed the pads also counted a duckling';
  await wait(900);
  if (G.querySelector('.choices-waiting')) return 'the cards did not wake up after the pads joined';
  for (const duck of ducks) duck.click();
  return G.querySelectorAll('.count-badge').length === G.round.a + G.round.b ? '' : 'tapping did not count every joined duckling';`;
