// screens.mjs: open every screen in a real browser and check it draws.
//
// The other tests check each game's rounds. This one checks the screens: it
// starts the app, opens the home screen, every game (at every level), the
// sticker book, and the grown-up page at phone size, and fails if a screen
// doesn't draw, logs an error, or (for a game) doesn't fit the screen. It
// plays each game to the end, with one miss, and leaves one halfway to see
// that it picks up again. At the end it turns its web server off and opens
// every screen again, to prove the app works with no internet.
//
// The check always plays the same date (2026-11-13), so it gives the same
// result every day. (The start of this file is shared with Lily Pad's.)
//
// Run it with:  node tests/screens.mjs
// It needs Google Chrome (GitHub's test computers have it) and nothing else.
// It is not a *.test.js file, so "node --test" doesn't run it.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PHONE = { width: 375, height: 667 };
const FIRST_DAY = [2026, 10, 13]; // year, month (0 = January), day
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

// ---------- A tiny web server for the app's files ----------

const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const file = join(ROOT, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---------- Start Chrome and talk to it ----------

const chromePath = [
  process.env.CHROME,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => path && existsSync(path));
if (!chromePath) {
  console.error('Could not find Google Chrome. Set CHROME to its path.');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'little-pond-screens-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', 'about:blank',
]);
const wsUrl = await new Promise((resolve, reject) => {
  let text = '';
  chrome.stderr.on('data', (chunk) => {
    text += chunk;
    const found = text.match(/DevTools listening on (ws:\/\/\S+)/);
    if (found) resolve(found[1]);
  });
  chrome.on('exit', () => reject(new Error(`Chrome stopped early:\n${text}`)));
  setTimeout(() => reject(new Error('Chrome did not start in 20 seconds')), 20000);
});

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 1;
const waiting = new Map();
const listeners = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && waiting.has(message.id)) {
    const { resolve, reject } = waiting.get(message.id);
    waiting.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else {
    for (const listener of listeners) listener(message);
  }
};
/** Send Chrome a command and wait for its answer. */
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  waiting.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
await page('Page.enable');
await page('Runtime.enable');
await page('Emulation.setDeviceMetricsOverride', { ...PHONE, deviceScaleFactor: 2, mobile: true });

/** Make every page think today is `offset` days after the first day (10 in the morning). */
let dateScript = null;
async function setDay(offset) {
  if (dateScript) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: dateScript });
  const [year, month, day] = FIRST_DAY;
  const source = `(() => {
    const Real = Date;
    const shift = new Real(${year}, ${month}, ${day + offset}, 10).getTime() - Real.now();
    window.Date = class extends Real {
      constructor(...args) { if (args.length) super(...args); else super(Real.now() + shift); }
      static now() { return Real.now() + shift; }
    };
  })();`;
  dateScript = (await page('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
}
await setDay(0);

// Errors the page logs or throws while a screen is open.
let errors = [];
listeners.push((message) => {
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    errors.push(details.exception?.description || details.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  }
});

/** Run JavaScript in the page and get its value back. */
async function evaluate(expression) {
  const { result, exceptionDetails } = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Open an address fresh, and wait until `ready` (a JavaScript test) is true. */
async function open(address, ready) {
  errors = [];
  await page('Page.navigate', { url: 'about:blank' });
  await page('Page.navigate', { url: `${origin}/${address}` });
  for (let tries = 0; tries < 100; tries++) {
    await sleep(100);
    try {
      if (await evaluate(`Boolean(window.littlePondStarted) && (${ready})`)) return true;
    } catch { /* the page is still loading */ }
  }
  return false;
}

// ---------- The checks ----------

// Every game in src/games/index.js is checked, played the way its file in
// tests/plays/ says (see tests/plays/how-many.mjs for what one holds).
// To check one game only:  node tests/screens.mjs --only=how-many
const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1];
const { NAMES } = await import('../src/games/index.js');
const GAMES = {};
for (const name of ONLY ? [ONLY] : NAMES) {
  GAMES[name] = { levels: (await import(`../src/games/${name}.js`)).meta.levels, ...await import(`./plays/${name}.mjs`) };
}

const problems = [];
let checked = 0;
let serverIsOff = false;

const PAUSE = 1700; // a right answer is enjoyed for a moment before the next round
/** Run code in the page with G as the game's area (G.round is the round on screen), and wait(ms). */
const inGame = (game, code) => evaluate(`(async () => {
  const G = document.getElementById('game-${game}');
  const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
  ${code}
})()`);
const drawn = (game) => `(() => { const G = document.getElementById('game-${game}'); return Boolean(G?.round) && (${GAMES[game].ready}); })()`;
const setProgress = (changes) => evaluate(`(() => {
  const saved = JSON.parse(localStorage.getItem('little-pond.progress') || 'null') || { streak: 0, totalDays: 0, lastDay: null, finished: {}, plays: {} };
  localStorage.setItem('little-pond.progress', JSON.stringify({ ...saved, ...${JSON.stringify(changes)} }));
})()`);

/** Open a screen and note a problem if it doesn't draw, logs an error, or (with `fits`) is taller than the phone. */
async function checkScreen(label, address, { ready, fits = false, then }) {
  checked++;
  let problem = '';
  try {
    if (!await open(address, ready)) problem = 'did not draw';
    else {
      if (then) problem = (await then()) || '';
      const over = await evaluate('document.documentElement.scrollHeight - innerHeight');
      if (!problem && fits && over > 0) problem = `is ${over}px taller than the screen`;
    }
  } catch (error) {
    problem = `broke: ${String(error.message).split('\n')[0]}`;
  }
  for (const error of errors) problem += `${problem ? '; ' : ''}logged an error: ${String(error).split('\n')[0]}`;
  if (problem) problems.push(`${label}: ${problem}`);
  console.log(`${problem ? '✗' : '✓'} ${label}`);
}

try {
  await open('', 'true');
  await evaluate('localStorage.clear()');
  await checkScreen('Home', '', { ready: 'document.querySelectorAll("#today-list a").length > 0 && document.querySelectorAll("#pond .pad").length === 7' });

  for (const [game, { levels, right, wrong, extra, setup }] of Object.entries(GAMES)) {
    const answer = `{ ${right} } await wait(${PAUSE});`;
    const miss = wrong ? `{ ${wrong} } await wait();` : '';
    await evaluate('localStorage.clear()');
    // A plays file may export `setup`: JavaScript run in the page before its game is
    // first opened (the sound games use it to put letter sounds on the "phone").
    if (setup) await evaluate(`(async () => { ${setup} })()`);
    // Half-done: play 2 rounds (with one miss), load the page again, and it picks up at round 3.
    await checkScreen(`${game} (left halfway, then loaded again, then finished)`, `#${game}`, {
      ready: drawn(game),
      fits: true,
      then: async () => {
        await inGame(game, `${miss} ${answer} ${answer}`);
        if (!await open(`#${game}`, drawn(game))) return 'did not draw after loading again';
        if (await evaluate(`document.getElementById('game-${game}').dataset.resumed`) !== 'yes') return 'started over instead of picking up';
        if (await evaluate(`document.querySelectorAll('#game-${game} .dot-done').length`) !== 2) return 'picked up, but not where it left off';
        // Finish it: the end card shows, with a gift, and the day is saved ("ok" after one miss).
        await inGame(game, `while (G.round && !G.classList.contains('finished')) { const before = G.round; ${answer} if (G.round === before) break; }`);
        await sleep(300);
        const end = await evaluate(`(() => {
          const progress = JSON.parse(localStorage.getItem('little-pond.progress'));
          return { card: !document.getElementById('done').hidden, gift: !document.getElementById('gift').hidden,
            score: progress.results?.['${game}']?.[0]?.score, days: progress.totalDays };
        })()`);
        if (!end.card || !end.gift) return 'finished, but the end card or its gift did not show';
        const score = wrong ? 'ok' : 'easy';
        if (end.score !== score || end.days !== 1) return `finished, but saved as ${end.score} on day ${end.days}`;
        await evaluate(`document.getElementById('gift').click()`);
        await sleep(200);
        return await evaluate(`JSON.parse(localStorage.getItem('little-pond.progress')).stickers.length`) === 1 ? '' : 'the gift did not give a sticker';
      },
    });
    // Three misses in a row: the answer is shown and the game moves on.
    if (wrong) {
      await setProgress({ finished: {} });
      await checkScreen(`${game} (3 misses: the answer is shown)`, `#${game}`, {
        ready: drawn(game),
        then: async () => {
          await inGame(game, `${miss} ${miss} ${miss} await wait(${PAUSE});`);
          return await evaluate(`document.querySelectorAll('#game-${game} .dot-done').length`) === 1 ? '' : 'did not move on after the third miss';
        },
      });
    }
    // Every level draws and fits the screen.
    for (let level = 1; level <= levels; level++) {
      await setProgress({ finished: {}, levels: { [game]: { now: level, was: level, since: null } } });
      await evaluate(`localStorage.removeItem('little-pond.half-done')`);
      await checkScreen(`${game} (level ${level})`, `#${game}`, {
        ready: drawn(game),
        fits: true,
        then: async () => {
          if (await evaluate(`document.getElementById('game-${game}').round && true`) !== true) return 'no round on screen';
          return extra ? inGame(game, extra) : '';
        },
      });
    }
    await checkScreen(`${game} (an earlier day)`, `?day=2026-11-12#${game}`, { ready: drawn(game), fits: true });
  }
  if (ONLY) throw new Error('only one game was asked for');

  await checkScreen('Sticker book', '#stickers', { ready: 'document.querySelectorAll(".sb-cover").length === 32' });
  await checkScreen('Grown-up page', '#grown-ups', { ready: 'document.querySelectorAll(".gu-day").length === 28 && document.querySelectorAll(".gu-game").length > 0 && document.querySelectorAll(".rec-letter").length === 26' });

  // The grown-up page opens only when its button is held for 2 seconds.
  await checkScreen('Grown-up button (a tap does nothing, a 2 second hold opens it)', '', {
    ready: 'Boolean(document.getElementById("grown-ups-hold"))',
    then: async () => {
      const press = (ms) => evaluate(`(async () => {
        const hold = document.getElementById('grown-ups-hold');
        hold.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, ${ms}));
        hold.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        return location.hash;
      })()`);
      if (await press(300) !== '') return 'a short tap opened it';
      return await press(2300) === '#grown-ups' ? '' : 'holding for 2 seconds did not open it';
    },
  });

  // The Refresh button: from an earlier day, it loads the app again on today's home screen.
  await checkScreen('Refresh button', '?day=2026-11-12', {
    ready: 'document.getElementById("today-title").textContent === "Yesterday"',
    then: async () => {
      await evaluate(`(() => { window.leftOpen = true; document.getElementById('refresh').click(); })()`);
      for (let tries = 0; tries < 50; tries++) {
        await sleep(100);
        try {
          if (await evaluate(`Boolean(window.littlePondStarted) && !window.leftOpen && !location.search && document.getElementById('today-title').textContent === 'Today'`)) return '';
        } catch { /* the page is loading */ }
      }
      return 'did not load the app again on today';
    },
  });

  // Offline: wait until the service worker has saved every file, turn the
  // web server off, and open the screens again. Nothing can come from the
  // network now, so each has to come from what was saved.
  await open('', 'true');
  const saved = await evaluate(`(async () => {
    await navigator.serviceWorker.ready;
    for (let tries = 0; tries < 100; tries++) {
      const names = await caches.keys();
      const count = names.length ? (await (await caches.open(names[0])).keys()).length : 0;
      if (count >= 20) return count;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return 0;
  })()`);
  if (!saved) problems.push('Offline: the service worker did not save the app\'s files');
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  serverIsOff = true;
  await setProgress({ finished: {} });
  await checkScreen('Home (offline)', '', { ready: 'document.querySelectorAll("#today-list a").length > 0' });
  await evaluate(`localStorage.removeItem('little-pond.half-done')`);
  for (const game of Object.keys(GAMES)) await checkScreen(`${game} (offline)`, `#${game}`, { ready: drawn(game) });
  await checkScreen('Sticker book (offline)', '#stickers', { ready: 'document.querySelectorAll(".sb-cover").length === 32' });
} catch (error) {
  if (!ONLY) throw error; // with --only, the checks stop after that game
} finally {
  socket.close();
  chrome.kill();
  if (!serverIsOff) server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold a file; the folder is temporary */ }
}

if (problems.length) {
  console.error(`\n${problems.length} of ${checked} screens have a problem:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nAll ${checked} screens draw, fit a phone, and log no errors.`);
