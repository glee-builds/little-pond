// How tests/screens.mjs plays Shapes and Patterns: as each round's part says (see mix.mjs).
import { mixPlays } from './mix.mjs';

export const { ready, right, wrong, extra, setup } = await mixPlays(['shapes', 'patterns']);
