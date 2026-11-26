// scene.js: the pieces every number game is made of.
//
// A game describes each round as data and draws it with these: ducklings,
// answer cards with dots, tap-to-count, drag-or-tap, and playRounds, which
// runs a game's rounds from the first spoken line to the last check mark.

import { make, button, wiggle, progressDots } from './ui.js';
import { nextRound } from './rounds.js';
import { speak } from './voice.js';

/** One duckling. */
export function duckling() {
  const node = make('span', 'duckling');
  const picture = make('img');
  picture.src = 'assets/duck.svg';
  picture.alt = '';
  node.append(picture);
  return node;
}

/**
 * Tap to count: tapping one of `things` says the next number aloud and
 * pins that number on it. Counting is how the player finds the answer, so
 * it is never a miss or a hint. `onAll` is called once every one is counted.
 */
export function tapToCount(things, onAll) {
  let count = 0;
  for (const thing of things) {
    thing.addEventListener('click', () => {
      if (thing.querySelector('.count-badge')) return;
      count += 1;
      thing.append(make('span', 'count-badge', String(count)));
      speak(String(count));
      if (count === things.length) onAll?.();
    });
  }
}

/** An answer card: `count` dots in rows of 5, with the numeral beside them. */
export function dotCard(count, onPick) {
  const card = button('choice', '', () => onPick(card));
  const dots = make('span', 'choice-dots');
  for (let i = 0; i < count; i++) dots.append(make('i'));
  card.append(dots, make('span', 'choice-number', String(count)));
  card.setAttribute('aria-label', String(count));
  return card;
}

// ---------- Drag, or tap twice ----------

const DRAG_START = 8; // pixels a finger must move before a tap becomes a drag
// The thing that was tapped and is waiting for a tap on where it goes.
let picked = null;

function unpick() {
  picked?.item.classList.remove('picked');
  picked = null;
}

// The second tap: on one of the picked thing's targets, it lands there.
// (Listened for from the first draggable on, so this file also loads in tests, where there is no page.)
let listening = false;
function listenForSecondTap() {
  if (listening) return;
  listening = true;
  document.addEventListener('click', (event) => {
    if (!picked || picked.item.contains(event.target)) return;
    const { targets, onDrop } = picked;
    const index = targets().findIndex((box) => box.contains(event.target));
    unpick();
    if (index !== -1) onDrop(index);
  });
}

/**
 * Let `item` be moved onto one of the boxes in `targets()`, two ways:
 * drag it there, or tap it (it gets the class .picked) and then tap the
 * box. Either way `onDrop(index)` is called with the box's place in
 * targets(). `canMove()` can say no (for example, once the round is over).
 * While dragging, a copy follows the finger (.drag-ghost), the item itself
 * gets .lifted, and the box under the finger gets .drop-over.
 */
export function draggable(item, { targets, onDrop, canMove = () => true }) {
  listenForSecondTap();
  let drag = null;
  const boxAt = ({ clientX, clientY }) => {
    const hit = document.elementFromPoint(clientX, clientY);
    return targets().findIndex((box) => box.contains(hit));
  };
  const stop = () => {
    drag?.ghost?.remove();
    item.classList.remove('lifted');
    for (const box of targets()) box.classList.remove('drop-over');
    drag = null;
  };

  item.addEventListener('pointerdown', (event) => {
    if (!canMove()) return;
    event.preventDefault();
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId, ghost: null };
    try { item.setPointerCapture(event.pointerId); } catch { /* fine without it */ }
  });

  item.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_START) return;
      unpick();
      drag.ghost = item.cloneNode(true);
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.style.width = `${item.offsetWidth}px`;
      document.body.append(drag.ghost);
      item.classList.add('lifted');
    }
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
    const over = boxAt(event);
    targets().forEach((box, i) => box.classList.toggle('drop-over', i === over));
  });

  item.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const over = drag.ghost ? boxAt(event) : -1;
    const dragged = Boolean(drag.ghost);
    stop();
    if (dragged && over !== -1) onDrop(over);
  });
  item.addEventListener('pointercancel', stop);

  // A tap (or a keyboard press) picks the item up; tapping it again puts it down.
  item.addEventListener('click', () => {
    if (!canMove()) return;
    const again = picked?.item === item;
    unpick();
    if (again) return;
    picked = { item, targets, onDrop };
    item.classList.add('picked');
  });
}

const PAUSE = 1400; // time to enjoy a right answer before the next round

/**
 * Run a game's rounds in `container`. The game gives:
 *   prompt(round)               the line to say (also shown small, for a grown-up)
 *   check(round, answer)        true if the answer is right
 *   draw(stage, round, answer)  draw the round; call answer(value, node) when
 *                               the player answers. Returns a function that
 *                               marks the right answer and returns the words
 *                               for it ("3 ducklings").
 * A right answer moves on. A miss wiggles and says the line again; the
 * third miss shows the answer and moves on (src/rounds.js). `session`
 * keeps the player's place if the phone locks partway through.
 */
export function playRounds(container, puzzle, onDone, session, { prompt, check, draw }) {
  let state = { puzzle, round: 0, tries: 0, shown: [], status: 'playing', ...session.saved };
  let misses = session.saved?.misses ?? 0;
  let busy = false;
  let showRight = () => '';

  const round = () => puzzle.rounds[state.round];
  const dots = progressDots(puzzle.rounds.length);
  const again = button('speaker', '🔊', () => speak(prompt(round())));
  again.setAttribute('aria-label', 'Hear it again');
  const line = make('p', 'scene-line');
  const stage = make('div', 'scene-stage');
  const top = make('div', 'scene-top');
  top.append(again, dots.node);
  container.classList.add('scene');
  container.replaceChildren(top, line, stage);

  function start() {
    busy = false;
    container.round = round(); // the round on screen, for tests/screens.mjs
    dots.update(state.round);
    line.textContent = prompt(round());
    stage.replaceChildren();
    showRight = draw(stage, round(), answer);
    speak(prompt(round()));
  }

  function answer(value, node) {
    if (busy) return;
    const asked = round();
    const correct = check(asked, value);
    state = nextRound(state, correct);
    if (!correct) misses += 1;
    if (!correct && !state.last.shown) {
      wiggle(node ?? stage);
      speak(prompt(asked));
      return;
    }
    busy = true;
    const words = showRight();
    speak(correct ? `Yes! ${words}.` : `${words}.`);
    const { round: at, tries, shown, status } = state;
    session.save?.({ round: at, tries, shown, status, misses });
    setTimeout(() => {
      if (state.status !== 'won') return start();
      dots.update(puzzle.rounds.length);
      container.classList.add('finished');
      onDone({ status: 'won', misses, helped: state.shown.length });
    }, PAUSE);
  }

  start();
}
