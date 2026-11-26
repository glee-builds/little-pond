// How tests/screens.mjs plays Patterns (see tests/plays/how-many.mjs).

export const ready = `Boolean(G.querySelector('.pat-slot')) && G.querySelectorAll('.choice').length > 1`;

const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === G.round.answer) === ${right}).click();`;

export const right = card(true);
export const wrong = card(false);

// The row shows every thing at a size that can be recognised, in reading order, and the cards are big enough to tap.
export const extra = `
  const things = [...G.querySelectorAll('.pat-thing')];
  if (things.length !== G.round.row.length + 1) return 'the row does not show the whole pattern and its gap';
  const boxes = things.map((thing) => thing.getBoundingClientRect());
  if (boxes.some((box) => box.width < 56)) return 'a thing in the row is smaller than 56px';
  if (boxes.some((box, i) => i > 0 && box.top === boxes[i - 1].top && box.left < boxes[i - 1].left)) return 'the row is out of reading order';
  if ([...G.querySelectorAll('.choice')].some((card) => Math.min(card.offsetWidth, card.offsetHeight) < 64)) return 'a card is smaller than 64px';
  ${right} await wait();
  return G.querySelector('.pat-slot img, .pat-slot svg') ? '' : 'the right card did not go into the gap';`;
