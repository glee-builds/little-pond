// index.js: every game, by name, in the order of the cards under "All games".
//
// A game's name is its file in src/games/ (counting.js), its address
// (#counting), and its name in saved progress. To add a game: add its file
// (and its .css file, if it has one), add its name here, and add both
// files to FILES in sw.js.
//
// Most games here are mixed (src/mix.js): they take turns between the
// rounds of smaller games, their parts, which are the other files in this
// folder (how-many.js, join.js, …) and are not listed here.

export const NAMES = [
  'counting',
  'add-take',
  'compare',
  'share-sort',
  'shapes-patterns',
  'slide',
];
