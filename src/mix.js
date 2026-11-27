// mix.js: one game made of the rounds of a few smaller games ("parts").
//
// A part is a game file in src/games/ that is not in NAMES. Besides
// generate, check, and verify, it exports rules(): the { prompt, check,
// draw } that playRounds needs, made fresh for each game. A mixed game
// takes the first EACH rounds of every part's puzzle and takes turns
// between the parts, so no two rounds in a row are the same kind.

import { playRounds } from './scene.js';
import { hashString } from './seed.js';

const EACH = 2; // rounds from each part

/**
 * A game (meta, generate, check, verify, render) made of `parts`, an object
 * of part name -> part module. `meta` is the game's own title, art, and so on;
 * its levels are the most any part has, and its styles are its parts' styles.
 */
export function mix(meta, parts) {
  const names = Object.keys(parts);
  const levels = Math.max(...names.map((name) => parts[name].meta.levels));
  const levelOf = (name, level) => Math.min(level, parts[name].meta.levels);

  /** The day's rounds: each is a part's round, with `part` saying whose it is. Each part's whole puzzle is kept to verify. */
  function generate(seed, level = 1) {
    const puzzles = Object.fromEntries(names.map((name) => [name, parts[name].generate((seed ^ hashString(name)) >>> 0, levelOf(name, level))]));
    const rounds = [];
    for (let i = 0; i < EACH; i++) for (const name of names) rounds.push({ part: name, ...puzzles[name].rounds[i] });
    return { level, puzzles, rounds };
  }

  const check = (round, answer) => parts[round.part].check(round, answer);

  /** Confirm every part's puzzle is good, and every round is one of its part's first rounds, taking turns. */
  function verify(puzzle) {
    const problems = [];
    for (const name of names) {
      const part = puzzle.puzzles?.[name];
      if (!part) { problems.push(`no rounds from ${name}`); continue; }
      if (part.level !== levelOf(name, puzzle.level)) problems.push(`${name} is at level ${part.level}, not ${levelOf(name, puzzle.level)}`);
      problems.push(...parts[name].verify(part).problems.map((problem) => `${name}: ${problem}`));
    }
    if (puzzle.rounds.length !== EACH * names.length) problems.push(`${puzzle.rounds.length} rounds, not ${EACH * names.length}`);
    puzzle.rounds.forEach(({ part, ...round }, i) => {
      const name = names[i % names.length];
      const want = puzzle.puzzles?.[name]?.rounds[Math.floor(i / names.length)];
      if (part !== name || JSON.stringify(round) !== JSON.stringify(want)) problems.push(`round ${i + 1} is not ${name}'s next round`);
    });
    return { ok: problems.length === 0, problems };
  }

  function render(container, puzzle, onDone, session) {
    const rules = Object.fromEntries(names.map((name) => [name, parts[name].rules()]));
    playRounds(container, puzzle, onDone, session, {
      prompt: (round) => rules[round.part].prompt(round),
      check,
      draw: (stage, round, answer) => rules[round.part].draw(stage, round, answer),
    });
  }

  const css = names.filter((name) => parts[name].meta.css);
  return { meta: { ...meta, kind: 'numbers', levels, css }, generate, check, verify, render };
}
