// Tests for sw.js, the service worker that lets the app open offline.
// Run all tests with: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');

// The FILES list in sw.js, read as text: every quoted path between "FILES = [" and "];".
const listed = sw.slice(sw.indexOf('const FILES = ['), sw.indexOf('];', sw.indexOf('const FILES = [')))
  .match(/'[^']+'/g).map((quoted) => quoted.slice(1, -1));

test('sw.js saves every file the app needs for offline', () => {
  const needed = [
    'index.html', 'styles.css', 'manifest.webmanifest',
    // data/ arrives with the sound games; Git doesn't keep an empty folder.
    ...['src/', 'data/', 'assets/'].filter((folder) => existsSync(new URL(folder, root))).flatMap((folder) =>
      readdirSync(new URL(folder, root), { recursive: true })
        .map((name) => `${folder}${name}`)
        .filter((path) => /\.(js|json|css|html|svg|png|woff2)$/.test(path))),
  ];
  const missing = needed.filter((path) => !listed.includes(path));
  assert.deepEqual(missing, [], `add these to FILES in sw.js: ${missing.join(', ')}`);
});

test('every file in the sw.js list exists', () => {
  const gone = listed.filter((path) => path !== './' && !existsSync(new URL(path, root)));
  assert.deepEqual(gone, [], `these are in FILES in sw.js but don't exist: ${gone.join(', ')}`);
});

test('the list has no file twice, and includes the app itself', () => {
  assert.equal(new Set(listed).size, listed.length);
  assert.ok(listed.includes('./'));
  assert.ok(listed.includes('index.html'));
});

// The owner's other apps share this web address, so their caches are in the same
// browser storage. The activate step may only delete caches with this app's prefix.
test('sw.js deletes only old caches with its own prefix', () => {
  assert.match(sw, /const PREFIX = 'little-pond-';/);
  assert.match(sw, /const CACHE = PREFIX \+ 'v1';/);
  assert.ok(sw.includes('names.filter((name) => name.startsWith(PREFIX) && name !== CACHE)'), 'the activate filter must check the prefix');
});
