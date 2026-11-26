// scene.js: the pieces every number game is made of.
//
// A game describes each round as data and draws it with these: ducklings,
// answer cards with dots, tap-to-count, and playRounds, which runs a game's
// rounds from the first spoken line to the last check mark.

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
 * it is never a miss or a hint.
 */
export function tapToCount(things) {
  let count = 0;
  for (const thing of things) {
    thing.addEventListener('click', () => {
      if (thing.querySelector('.count-badge')) return;
      count += 1;
      thing.append(make('span', 'count-badge', String(count)));
      speak(String(count));
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
