// compare.js: Compare. Takes turns between which pad has more or fewer
// (more-or-fewer.js) and putting ducklings in order of size (order.js).
// See src/mix.js.

import { mix } from '../mix.js';
import * as moreOrFewer from './more-or-fewer.js';
import * as order from './order.js';

export const { meta, generate, check, verify, render } = mix(
  { title: 'Compare', art: moreOrFewer.meta.art },
  { 'more-or-fewer': moreOrFewer, order },
);
