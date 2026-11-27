// add-take.js: Add and Take Away. Takes turns between one more or one
// less (one-more.js), joining and splitting groups (join.js), and some
// hopping away (hop-away.js). See src/mix.js.

import { mix } from '../mix.js';
import * as oneMore from './one-more.js';
import * as join from './join.js';
import * as hopAway from './hop-away.js';

export const { meta, generate, check, verify, render } = mix(
  { title: 'Add and Take Away', art: join.meta.art },
  { 'one-more': oneMore, join, 'hop-away': hopAway },
);
