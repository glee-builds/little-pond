// order.js: Order.
//
// Ducklings of different sizes wait below a log with a row of empty spots.
// The player drags each one onto the log (or taps it, then a spot) to line
// them up from smallest to biggest. A duckling on the log can be moved
// again, or swapped with another. When the log is full the order is checked
// by itself: any in the wrong spot wiggle and go back to wait.
// It builds comparing sizes and putting things in sequence.

import { createRandom } from '../seed.js';
import { make, wiggle } from '../ui.js';
import { duckling, draggable, playRounds } from '../scene.js';

export const meta = {
  title: 'Order', kind: 'numbers', levels: 3, css: true,
  art: '<span class="art-ducks" style="align-items:flex-end"><img src="assets/duck.svg" alt="" style="width:18px"><img src="assets/duck.svg" alt="" style="width:29px"><img src="assets/duck.svg" alt="" style="width:42px"></span>',
};

export const ROUNDS = 4;
// How many ducklings at each level. The top level also asks for biggest first.
const COUNTS = [3, 4, 5];

/** The sizes in the order asked for. */
const lineUp = ({ sizes, down }) => [...sizes].sort((a, b) => (down ? b - a : a - b));
const same = (a, b) => a.join() === b.join();
/** Mixed up: not already in order, either way. */
const mixed = (sizes) => !same(sizes, lineUp({ sizes })) && !same(sizes, lineUp({ sizes, down: true }));

/** The day's rounds: each is { sizes, down }: sizes 1 (smallest) to n as they wait, and whether biggest goes first. */
export function generate(seed, level = 1) {
  const random = createRandom(seed);
  const count = COUNTS[level - 1] ?? COUNTS.at(-1);
  const all = Array.from({ length: count }, (_, i) => i + 1);
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) {
    let sizes;
    // Never the same mix twice in a row.
    do sizes = random.shuffle(all); while (!mixed(sizes) || same(sizes, rounds.at(-1)?.sizes ?? []));
    rounds.push({ sizes, down: level >= 3 && random.next() < 0.5 });
  }
  return { level, rounds };
}

/** `answer` lists the sizes on the log, left to right (null for an empty spot). */
export const check = (round, answer) => same(answer, lineUp(round));

/** Confirm every round can be lined up: sizes 1 to n, mixed up, and one right order. */
export function verify(puzzle) {
  const problems = [];
  const count = COUNTS[puzzle.level - 1];
  if (puzzle.rounds.length !== ROUNDS) problems.push(`${puzzle.rounds.length} rounds, not ${ROUNDS}`);
  puzzle.rounds.forEach((round, i) => {
    const say = (problem) => problems.push(`round ${i + 1}: ${problem}`);
    const { sizes, down } = round;
    if (!same(lineUp({ sizes }), Array.from({ length: count }, (_, n) => n + 1))) say(`the sizes are not 1 to ${count}`);
    if (!mixed(sizes)) say('the ducklings start in order');
    if (down && puzzle.level < 3) say('biggest first is for the top level');
    if (!check(round, lineUp(round))) say('the right order is not accepted');
    if (check(round, sizes) || check(round, lineUp({ sizes, down: !down }))) say('a wrong order is accepted');
  });
  return { ok: problems.length === 0, problems };
}

export function render(container, puzzle, onDone, session) {
  playRounds(container, puzzle, onDone, session, {
    prompt: ({ down }) => `Line them up from ${down ? 'biggest to smallest' : 'smallest to biggest'}.`,
    check,
    draw(stage, round, answer) {
      const count = round.sizes.length;
      let over = false;
      const row = (className, boxClass) => {
        const node = make('div', className);
        node.style.setProperty('--ord-count', count);
        const boxes = round.sizes.map(() => node.appendChild(make('div', boxClass)));
        return [node, boxes];
      };
      const [log, slots] = row('ord-log', 'ord-slot');
      const [tray, spots] = row('ord-tray', 'ord-spot');
      const boxes = [...slots, ...spots];
      // A dot under each spot, growing the way the line should, shows which end is which.
      lineUp(round).forEach((size, i) => slots[i].style.setProperty('--ord-mark', `${4 + size * 3}px`));

      /** Put a duckling in a box (swapping with one already there), then check the log if it is full. */
      function move(duck, box) {
        const other = box.firstElementChild;
        if (other && other !== duck) duck.parentNode.append(other);
        box.append(duck);
        const line = slots.map((slot) => Number(slot.firstElementChild?.dataset.size) || null);
        if (line.includes(null)) return;
        // Any in the wrong spot go back to wait, so a full log is always a fresh try.
        const right = lineUp(round);
        const off = slots.filter((_, i) => line[i] !== right[i]).map((slot) => slot.firstElementChild);
        for (const wrong of off) {
          spots.find((spot) => !spot.firstElementChild).append(wrong);
          wiggle(wrong);
        }
        answer(line, off[0]);
      }

      const ducks = round.sizes.map((size, i) => {
        const duck = spots[i].appendChild(duckling());
        duck.classList.add('ord-duck');
        duck.dataset.size = size;
        // The smallest is drawn at 40% of its box, the biggest fills it.
        duck.style.setProperty('--ord-width', `${40 + (60 * (size - 1)) / (count - 1)}%`);
        // Tapping one duckling, then another, swaps them. (Without this the second tap would pick up the second one.)
        duck.addEventListener('click', (event) => {
          const held = stage.querySelector('.picked');
          if (over || !held || held === duck) return;
          event.stopImmediatePropagation();
          held.click(); // puts it down
          move(held, duck.parentNode);
        });
        draggable(duck, { targets: () => boxes, canMove: () => !over, onDrop: (to) => move(duck, boxes[to]) });
        return duck;
      });

      stage.append(log, tray);
      return () => {
        over = true;
        lineUp(round).forEach((size, i) => slots[i].append(ducks[round.sizes.indexOf(size)]));
        log.classList.add('ord-done');
        return round.down ? 'Biggest to smallest' : 'Smallest to biggest';
      };
    },
  });
}
