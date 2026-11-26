// How tests/screens.mjs plays Sounds (see tests/plays/how-many.mjs for what
// each piece is).

// The same silent recordings Slide's check uses.
export { setup } from './slide.mjs';

export const ready = `Boolean(G.querySelector('.snd-hear')) && G.querySelectorAll('.choice').length === G.round.choices.length`;

const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === G.round.word) === ${right}).click();`;

export const right = card(true);
export const wrong = card(false);

export const extra = `
  const expected = (JSON.parse(localStorage.getItem('little-pond.progress')).levels.sounds.now) + 1;
  if (G.querySelectorAll('.choice').length !== expected) return 'expected ' + expected + ' pictures';
  G.querySelector('.snd-hear').click(); await wait(600); // playing the sound must not break or hang
  return '';`;
