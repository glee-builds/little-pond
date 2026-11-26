// index.js: every game, by name, in the order of the cards under "All games".
//
// A game's name is its file in src/games/ (how-many.js), its address
// (#how-many), and its name in saved progress. To add a game: add its file
// (and its .css file, if it has one), add its name here, and add both
// files to FILES in sw.js.

export const NAMES = [
  'how-many',
  'groups',
  'join',
  'hop-away',
  'one-more',
  'more-or-fewer',
  'sort',
  'order',
  'patterns',
  'match-the-number',
  'shapes',
  'slide',
  'sounds',
];
