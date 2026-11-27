// shapes-patterns.js: Shapes and Patterns. Takes turns between finding a
// shape (shapes.js) and finishing a pattern (patterns.js). See src/mix.js.

import { mix } from '../mix.js';
import * as shapes from './shapes.js';
import * as patterns from './patterns.js';

export const { meta, generate, check, verify, render } = mix(
  { title: 'Shapes & Patterns', art: shapes.meta.art },
  { shapes, patterns },
);
