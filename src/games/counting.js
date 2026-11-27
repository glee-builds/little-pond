// counting.js: How Many. Takes turns between counting ducklings
// (how-many.js) and putting a numeral on the pad it stands for
// (match-the-number.js). See src/mix.js.

import { mix } from '../mix.js';
import * as howMany from './how-many.js';
import * as matchTheNumber from './match-the-number.js';

export const { meta, generate, check, verify, render } = mix(
  { title: 'How Many', art: howMany.meta.art },
  { 'how-many': howMany, 'match-the-number': matchTheNumber },
);
