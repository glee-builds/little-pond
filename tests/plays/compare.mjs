// How tests/screens.mjs plays Compare: as each round's part says (see mix.mjs).
import { mixPlays } from './mix.mjs';

export const { ready, right, wrong, extra, setup } = await mixPlays(['more-or-fewer', 'order']);
