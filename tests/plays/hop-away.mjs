// How tests/screens.mjs plays Hop Away (see tests/plays/how-many.mjs for
// what each piece is).

export const ready = `Boolean(G.querySelector('.choice'))`;

// Press go (it is gone after the first press), then give the ducklings time to hop and the cards to wake up.
const hop = `G.querySelector('.hop-go')?.click(); for (let i = 0; i < 30 && G.querySelector('.choices-waiting'); i++) await wait(100);`;
const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === String(G.round.start - G.round.away)) === ${right}).click();`;

export const right = `${hop} ${card(true)}`;
export const wrong = `${hop} ${card(false)}`;

export const extra = `
  const { start, away } = G.round;
  if (!G.querySelector('.choices-waiting')) return 'the cards can be tapped before the ducklings hop';
  if (G.querySelectorAll('.hop-log .duckling').length !== start) return 'the log does not start with every duckling';
  if (G.querySelector('.hop-go').offsetWidth < 64) return 'the go button is smaller than 64px';
  ${hop}
  if (G.querySelector('.choices-waiting')) return 'the cards did not wake up after the hop';
  if (G.querySelectorAll('.hop-log .duckling').length !== start - away) return 'the wrong number stayed on the log';
  if (G.querySelectorAll('.hop-water .away').length !== away) return 'the ducklings that hopped away are not in the water';
  for (const duck of G.querySelectorAll('.duckling')) duck.click();
  return G.querySelectorAll('.count-badge').length === start - away ? '' : 'tapping did not count just the ducklings on the log';`;
