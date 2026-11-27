// share-sort.js: Share and Sort. Takes turns between sharing ducklings
// equally onto pads (groups.js) and sorting things by kind (sort.js).
// See src/mix.js.

import { mix } from '../mix.js';
import * as groups from './groups.js';
import * as sort from './sort.js';

export const { meta, generate, check, verify, render } = mix(
  { title: 'Share and Sort', art: groups.meta.art },
  { groups, sort },
);
