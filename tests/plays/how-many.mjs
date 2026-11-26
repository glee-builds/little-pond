// How tests/screens.mjs plays How Many. Each piece is JavaScript that runs
// in the page, where G is the game's area, G.round is the round on screen
// (as made by generate), and wait(ms) pauses.

// True once a round is drawn.
export const ready = `Boolean(G.querySelector('.choice'))`;

// Count the ducklings, then give the cards time to wake up.
const count = `for (const duck of G.querySelectorAll('.duckling')) duck.click(); await wait(1100);`;
const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === String(G.round.count)) === ${right}).click();`;

// Answer the round on screen correctly.
export const right = `${count} ${card(true)}`;
// One miss on the round on screen.
export const wrong = `${count} ${card(false)}`;

// Anything else to check on a fresh round: return a problem, or ''.
export const extra = `
  if (!G.querySelector('.choices-waiting')) return 'the cards can be tapped before the ducklings are counted';
  ${count}
  if (G.querySelectorAll('.count-badge').length !== G.round.count) return 'tapping did not count every duckling';
  return G.querySelector('.choices-waiting') ? 'the cards did not wake up after counting' : '';`;
