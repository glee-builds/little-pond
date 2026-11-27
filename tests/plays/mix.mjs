// How tests/screens.mjs plays a mixed game (src/mix.js): each round is
// played the way its part's own plays file says. G.round.part names the
// part. (Not a plays file itself: screens.mjs only opens files named in NAMES.)

export async function mixPlays(names) {
  const plays = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await import(`./${name}.mjs`)])));
  const each = (key) => `switch (G.round.part) { ${names.map((name) => `case '${name}': { ${plays[name][key] ?? ''} } break;`).join(' ')} }`;
  return {
    ready: `(${names.map((name) => `(G.round.part === '${name}' && (${plays[name].ready}))`).join(' || ')})`,
    right: each('right'),
    wrong: each('wrong'),
    extra: each('extra'),
    setup: names.map((name) => plays[name].setup ?? '').join('\n'),
  };
}
