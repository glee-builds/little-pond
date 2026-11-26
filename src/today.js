// today.js: which games make up "Today's set".
//
// A day's set is 4 games: 3 number games and 1 sound game. Until there is
// a sound game to play, all 4 are number games; with fewer than 4 games in
// all, the set is every game there is. Each group comes around in a fixed
// shuffled order, so no game is left out.

import { dealForDay } from './seed.js';

export const SET_SIZE = 4;

/**
 * Today's games, in playing order. `groups` has the names of the games
 * that can be played in each group: { numbers, sounds }. `dayNumber`
 * counts days from a fixed start date.
 */
export function todaysSet({ numbers, sounds = [] }, dayNumber) {
  const sound = sounds.length ? dealForDay(sounds, 1, dayNumber, 'sounds') : [];
  const count = Math.min(SET_SIZE - sound.length, numbers.length);
  return [...dealForDay(numbers, count, dayNumber, 'numbers'), ...sound];
}
