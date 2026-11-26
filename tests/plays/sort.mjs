// How tests/screens.mjs plays Sort (see how-many.mjs for what each piece is).
// Things are moved the two-tap way: tap the thing, then tap a pad.

export const ready = `Boolean(G.querySelector('.sort-tray .sort-thing'))`;

const pad = (right) => `[...G.querySelectorAll('.sort-pad')].find((pad) => (pad.dataset.kind === thing.dataset.kind) === ${right}).click();`;

// Put every waiting thing on its own pad.
export const right = `for (const thing of G.querySelectorAll('.sort-tray .sort-thing')) { thing.click(); ${pad(true)} }`;
// One miss: the first waiting thing goes to a pad that is not its own.
export const wrong = `const thing = G.querySelector('.sort-tray .sort-thing'); thing.click(); ${pad(false)}`;

export const extra = `
  const waiting = [...G.querySelectorAll('.sort-tray .sort-thing')];
  if (waiting.length !== G.round.things.length) return 'not every thing is waiting';
  if (waiting.some((thing) => Math.min(thing.offsetWidth, thing.offsetHeight) < 56)) return 'a thing is smaller than 56px';
  const thing = waiting[0];
  thing.click(); ${pad(false)}
  if (thing.parentNode !== G.querySelector('.sort-tray')) return 'a thing stayed on the wrong pad';
  thing.click(); ${pad(true)}
  return thing.closest('.sort-pad')?.dataset.kind === thing.dataset.kind ? '' : 'a thing did not land on its pad';`;
