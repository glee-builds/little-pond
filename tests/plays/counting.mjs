// How tests/screens.mjs plays How Many: as each round's part says (see mix.mjs).
import { mixPlays } from './mix.mjs';

export const { ready, right, wrong, extra, setup } = await mixPlays(['how-many', 'match-the-number']);
