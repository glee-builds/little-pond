// How tests/screens.mjs plays Slide (see tests/plays/how-many.mjs for what
// each piece is).

// Headless Chrome has no microphone, so put a short silent recording for
// every letter straight onto the "phone" before the game is opened.
export const setup = `
  const { save } = await import('./src/sounds.js');
  const wav = new Uint8Array(44 + 800); // 0.1 seconds of silence: a WAV header, then zeros
  const view = new DataView(wav.buffer);
  [['RIFF', 0], ['WAVE', 8], ['fmt ', 12], ['data', 36]].forEach(([text, at]) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0))));
  [[4, 836, 4], [16, 16, 4], [20, 1, 2], [22, 1, 2], [24, 8000, 4], [28, 8000, 4], [32, 1, 2], [34, 8, 2], [40, 800, 4]]
    .forEach(([at, value, size]) => (size === 4 ? view.setUint32(at, value, true) : view.setUint16(at, value, true)));
  wav.fill(128, 44); // silence, for 8-bit sound
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') await save(letter, new Blob([wav], { type: 'audio/wav' }));`;

export const ready = `Boolean(G.querySelector('.sld-duck')) && G.querySelectorAll('.choice').length === 3`;

// Slide the way a tap does: hop the duckling along until the pictures wake up.
const slide = `for (let hops = 0; hops < 8 && G.querySelector('.choices-waiting'); hops++) { G.querySelector('.sld-duck').click(); await wait(600); }`;
const card = (right) => `[...G.querySelectorAll('.choice')].find((card) => (card.getAttribute('aria-label') === G.round.word) === ${right}).click();`;

export const right = `${slide} ${card(true)}`;
export const wrong = `${slide} ${card(false)}`;

export const extra = `
  if (!G.querySelector('.choices-waiting')) return 'the pictures can be tapped before the word is slid';
  if (G.querySelectorAll('.sld-letter').length !== 3) return 'the word is not three letters';
  const duck = G.querySelector('.sld-duck');
  duck.click(); await wait(600);
  if (!G.querySelectorAll('.sld-letter')[0].classList.contains('sld-lit') || G.querySelectorAll('.sld-lit').length !== 1) return 'the first hop did not light the first letter';
  // A real slide: press the duckling and move to the far end of the track.
  const box = G.querySelector('.sld-track').getBoundingClientRect();
  const at = duck.getBoundingClientRect();
  const finger = (type, x) => duck.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: at.top + 10, pointerId: 1, bubbles: true }));
  finger('pointerdown', at.left + 10);
  for (let x = at.left + 10; x < box.right; x += 20) { finger('pointermove', x); await wait(30); }
  finger('pointermove', box.right);
  finger('pointerup', box.right);
  await wait(900);
  if (G.querySelectorAll('.sld-lit').length !== 3) return 'sliding to the end did not light every letter';
  return G.querySelector('.choices-waiting') ? 'the pictures did not wake up after the slide' : '';`;
