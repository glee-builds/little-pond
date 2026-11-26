// How tests/screens.mjs plays More or Fewer (see tests/plays/how-many.mjs
// for how these pieces are used).

// True once a round is drawn.
export const ready = `Boolean(G.querySelector('.mof-pad'))`;

const tapPad = (right) => `
  const want = Math[G.round.ask === 'more' ? 'max' : 'min'](...G.round.pads);
  [...G.querySelectorAll('.mof-pad')].find((pad, i) => (G.round.pads[i] === want) === ${right}).click();`;
// Make the second pad match the first by adding or sending away, one at a time.
const makeSame = `
  const [goal, start] = G.round.pads;
  for (let n = start; n < goal; n++) G.querySelector('.mof-add').click();
  for (let n = start; n > goal; n--) G.querySelector('.mof-mine .duckling').click();`;
const checkIt = `G.querySelector('.mof-check').click();`;

// Answer the round on screen correctly.
export const right = `if (G.round.ask === 'same') { ${makeSame} ${checkIt} } else { ${tapPad(true)} }`;
// One miss: the other pad, or the check while the pads still differ.
export const wrong = `if (G.round.ask === 'same') { ${checkIt} } else { ${tapPad(false)} }`;

// On a "make the same" round: adding and sending away each change the pad by one.
export const extra = `
  if (G.round.ask !== 'same') return '';
  const held = () => G.querySelectorAll('.mof-mine .duckling').length;
  const before = held();
  if (before !== G.round.pads[1]) return 'the second pad does not start with its ducklings';
  G.querySelector('.mof-mine .duckling').click();
  if (held() !== before - 1) return 'tapping a duckling did not send it away';
  G.querySelector('.mof-add').click();
  return held() === before ? '' : 'the add button did not add a duckling';`;
