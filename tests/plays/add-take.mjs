// How tests/screens.mjs plays Add and Take Away: as each round's part says (see mix.mjs).
import { mixPlays } from './mix.mjs';

export const { ready, right, wrong, extra, setup } = await mixPlays(['one-more', 'join', 'hop-away']);
