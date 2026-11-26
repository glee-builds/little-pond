// How tests/screens.mjs plays One More, One Less (see
// tests/plays/how-many.mjs for what each piece is).

export const ready = `Boolean(G.querySelector('.choice'))`;

// Give the duckling time to hop and the cards to wake up.
const hop = `for (let i = 0; i < 40 && G.querySelector('.choices-waiting'); i++) await wait(100);`;
const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === String(G.round.start + G.round.step)) === ${right}).click();`;

export const right = `${hop} ${card(true)}`;
export const wrong = `${hop} ${card(false)}`;

export const extra = `
  const { start, step } = G.round;
  if (!G.querySelector('.choices-waiting')) return 'the cards can be tapped before the duckling hops';
  if (G.querySelectorAll('.duckling').length !== start) return 'the pad does not start with the starting group';
  ${hop}
  if (G.querySelector('.choices-waiting')) return 'the cards did not wake up after the hop';
  if (G.querySelectorAll(step === 1 ? '.om-new' : '.om-gone').length !== 1) return 'no duckling is marked as the one that hopped';
  for (const duck of G.querySelectorAll('.duckling')) duck.click();
  return G.querySelectorAll('.count-badge').length === start + step ? '' : 'tapping did not count just the ducklings on the pad';`;
