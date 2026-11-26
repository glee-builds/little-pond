// app.js: the home screen, moving between screens, starting games, the
// pond, the sticker book, the grown-up page, and the end-of-game card.
//
// Each screen has its own address after the #, like #how-many. An empty
// address shows the home screen, so the phone's back gesture goes home too.

import { dateKey, seedFor, hashString } from './seed.js';
import * as progressStore from './progress.js';
import { pondPads } from './pond.js';
import { make, button, plural } from './ui.js';
import { PAGES, STICKERS, nextSticker } from './stickers.js';
import { todaysSet } from './today.js';
import { speak, unlockVoice, voiceMissing } from './voice.js';

const today = dateKey();
let progress = progressStore.load();

// Earlier days: the home screen has a row of the 7 days before today. Each
// opens ?day=2026-11-20 (for example), which plays that day's games
// instead of today's. Finishing one fills in that day (see progress.js).
const now = new Date();
const PAST_DAYS = [1, 2, 3, 4, 5, 6, 7].map((ago) => dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago)));
const askedDay = new URLSearchParams(location.search).get('day');
const playDay = PAST_DAYS.includes(askedDay) ? askedDay : today; // the day whose games are shown
const playingPast = playDay !== today;
/** "yesterday", or the day of the week ("Thursday"). */
const dayName = (key, style = 'long') => (key === PAST_DAYS[0] && style === 'long' ? 'yesterday' : new Date(`${key}T12:00`).toLocaleDateString('en-US', { weekday: style }));
const capital = (text) => text[0].toUpperCase() + text.slice(1);
// Games are dealt from a deck counted from this date (src/today.js).
const DAY = progressStore.daysBetween('2026-01-01', playDay);

// ---------- The games ----------

// The groups on the home screen, in order. Each has its own color and
// shape (styles.css, .kind-...).
const GROUPS = [
  { kind: 'numbers', title: 'Numbers' },
  { kind: 'sounds', title: 'Sounds' },
];

// Every game, by the name used in its address (#how-many), its file in
// src/games/, and saved progress. Each has:
//   title    its name, for a grown-up
//   kind     which group it's in (see GROUPS)
//   levels   how many levels it has
//   art      the little picture on its card (styled in styles.css)
// Adding a game: add its file in src/games/ and one entry here (and the
// file to FILES in sw.js). Its card and its screen are built from the entry.
const GAMES = {
  'how-many': {
    title: 'How Many', kind: 'numbers', levels: 3,
    art: '<span class="art-ducks"><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""><img src="assets/duck.svg" alt=""></span>',
  },
};

const isDone = (game) => progressStore.isFinished(progress, playDay, game);
const gamesIn = (kind) => Object.keys(GAMES).filter((name) => GAMES[name].kind === kind);
const todaysGames = () => todaysSet(Object.fromEntries(GROUPS.map(({ kind }) => [kind, gamesIn(kind)])), DAY);
// A game's level goes up after 3 easy days in a row and down after 2 hard
// ones (src/progress.js), starting the next day.
const levelFor = (game) => Math.min(progressStore.levelOf(progress, game, playDay), GAMES[game].levels);

// ---------- The home screen ----------

// Set when the duckling hops while the app is open, so the home screen can
// show the hop when the player comes back to it.
let justHopped = false;

function drawPond() {
  const at = progress.totalDays;
  const doneToday = progress.lastDay === today;
  const pond = document.getElementById('pond');
  pond.replaceChildren();
  for (const { number, kind } of pondPads(at, doneToday)) {
    const spot = make('span', `pad pad-${kind}`);
    if (kind === 'frog') { // pond.js calls the pad the character is on 'frog'
      const duck = make('img', 'pond-duck' + (justHopped ? ' pond-duck-hop' : ''));
      duck.src = 'assets/duck.svg';
      duck.alt = '';
      spot.append(duck);
    }
    if (number > 0) spot.append(make('span', 'pad-number', String(number)));
    pond.append(spot);
  }
  justHopped = false;
  const where = at === 0 ? 'The duckling is on the bank of the pond.' : `The duckling is on lily pad ${at}.`;
  pond.setAttribute('aria-label', where);
  document.getElementById('pond-caption').textContent = playingPast
    ? `${capital(dayName(playDay))}'s games`
    : at === 0 ? 'Play a game and the duckling hops onto a lily pad!'
      : doneToday ? where : 'Play a game to hop to the next lily pad!';
  const back = document.getElementById('back-to-today');
  back.hidden = !playingPast;
}

/** The row of the last 7 days: tap one to play its games. ✓ means a game was finished that day. */
function drawPastDays() {
  document.getElementById('past-days').replaceChildren(...PAST_DAYS.map((key) => {
    const day = make('a', 'past-day', dayName(key, 'short'));
    day.href = `?day=${key}`;
    day.setAttribute('aria-label', capital(dayName(key)));
    if (key === playDay) day.setAttribute('aria-current', 'page');
    if (progressStore.isFinished(progress, key)) day.append(make('span', 'past-day-done', '✓'));
    return day;
  }));
}

/** A game's card: its picture, its name, and "Play" or "Done". `next` outlines the one to play now. */
function makeCard(name, next) {
  const { title, kind, art } = GAMES[name];
  const done = isDone(name);
  const card = make('a', `card kind-${kind}${done ? ' card-done' : ''}${name === next ? ' card-next' : ''}`);
  card.href = `#${name}`;
  const picture = make('span', 'card-art');
  picture.setAttribute('aria-hidden', 'true');
  picture.innerHTML = art;
  card.append(picture, make('span', 'card-name', title), make('span', 'card-status', done ? '✓ Done' : '▶ Play'));
  return card;
}

function drawCards() {
  const set = todaysGames();
  const done = set.filter(isDone).length;
  const next = set.find((game) => !isDone(game));
  document.getElementById('today-title').textContent = playingPast ? capital(dayName(playDay)) : 'Today';
  document.getElementById('today-count').textContent = done === set.length ? `★ All ${set.length} done!` : `${done} of ${set.length} done`;
  document.getElementById('today-list').replaceChildren(...set.map((game) => makeCard(game, next)));

  // Every game, by group, under "All games". A group with no games yet is left out.
  document.getElementById('groups').replaceChildren(...GROUPS.filter(({ kind }) => gamesIn(kind).length).map(({ kind, title }) => {
    const section = make('section', `group kind-${kind}`);
    const cards = make('nav', 'cards');
    cards.setAttribute('aria-label', `${title} games`);
    cards.append(...gamesIn(kind).map((game) => makeCard(game)));
    section.append(make('h2', 'group-title', title), cards);
    return section;
  }));
}

function drawStickerLink() {
  const count = progress.stickers.length;
  document.getElementById('sticker-link').textContent = count ? `My stickers (${count}) →` : 'My sticker book →';
}

function updateHome() {
  drawPond();
  drawPastDays();
  drawCards();
  drawStickerLink();
}

// ---------- Finishing a game ----------

/** A game was finished. `result` is how it went: { misses, helped }. */
function finishGame(game, result) {
  const before = progress.totalDays;
  // A game gives a gift, and counts toward its level, the first time it's
  // finished each day.
  const firstTime = !isDone(game);
  progress = progressStore.recordFinish(progress, playDay, game);
  if (firstTime) progress = progressStore.recordResult(progress, playDay, game, result, { maxLevel: GAMES[game].levels });
  progressStore.save(progress);
  justHopped = progress.totalDays > before;
  const hopped = justHopped;
  updateHome();
  justHopped = hopped; // show the hop when the home screen comes back

  const set = todaysGames();
  const next = set.includes(game) ? set.find((name) => !isDone(name)) : null;
  const allDone = firstTime && set.includes(game) && !next;
  document.getElementById('done-title').textContent = allDone ? 'All done for today!' : 'You did it!';
  document.getElementById('done-hop').textContent = hopped ? `The duckling hopped to lily pad ${progress.totalDays}!` : '';
  const nextButton = document.getElementById('done-next');
  nextButton.textContent = next ? '▶ Next game' : 'Home';
  nextButton.href = next ? `#${next}` : '#';
  document.getElementById('done').hidden = false;
  speak(allDone ? 'All done for today! Great work.' : 'You did it!');

  const sticker = firstTime ? nextSticker(progress.stickers, progress) : null;
  showGift(sticker);
  if (!sticker) celebrate(); // with a gift, the stars fall when it's opened
}

// ---------- Gifts and the sticker book ----------

// A gift that hasn't been opened yet. If the player leaves the card without
// opening it, the sticker still goes into the book (see show()).
let waitingGift = null;

function keepSticker(sticker) {
  progress = progressStore.addSticker(progress, sticker.id, sticker.tier);
  progressStore.save(progress);
  waitingGift = null;
}

/**
 * A sticker's picture. A shiny one gets a gold edge (styles.css). A rainbow
 * one is drawn as a small SVG picture, so its edge can follow the sticker's
 * shape in rainbow colors: the shape is made 6 units fatter all round,
 * filled with the colors, and the sticker is drawn on top.
 */
function stickerArt(picture, tier, extraClass = '') {
  const art = make('span', `${extraClass} sticker-art${tier ? ` sticker-${tier}` : ''}`.trim(), tier === 'rainbow' ? '' : picture);
  if (tier !== 'rainbow') return art;
  const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const stops = ['--go', '--star', '--pad', '--here', '--words', '--blush']
    .map((name, i, all) => `<stop offset="${i / (all.length - 1)}" stop-color="${color(name)}"/>`).join('');
  const text = `<text x="50" y="50" font-size="62" text-anchor="middle" dominant-baseline="central">${picture}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>
    <linearGradient id="colors" x1="0.15" y1="0.15" x2="0.85" y2="0.85">${stops}</linearGradient>
    <filter id="fatter" x="-30%" y="-30%" width="160%" height="160%"><feMorphology operator="dilate" radius="6"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -4"/></filter>
    <mask id="edge"><g filter="url(#fatter)">${text}</g></mask></defs>
    <rect width="100" height="100" fill="url(#colors)" mask="url(#edge)"/>${text}</svg>`;
  art.classList.add('rainbow-art');
  art.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return art;
}

/** Show a wrapped gift on the end-of-game card, or no gift (a replay, or every sticker already rainbow). */
function showGift(sticker) {
  const gift = document.getElementById('gift');
  const shown = document.getElementById('gift-sticker');
  const nextButton = document.getElementById('done-next');
  gift.hidden = !sticker;
  shown.hidden = true;
  nextButton.hidden = Boolean(sticker); // the gift comes first
  waitingGift = sticker;
  if (!sticker) return;
  gift.onclick = () => {
    keepSticker(sticker);
    nextButton.hidden = false;
    gift.hidden = true;
    const words = `A ${sticker.tier ?? 'new'} sticker: ${sticker.name}!`;
    shown.replaceChildren(stickerArt(sticker.picture, sticker.tier, 'gift-picture'), make('span', 'gift-name', words));
    shown.hidden = false;
    speak(words);
    drawStickerLink();
    celebrate();
  };
}

// Which page of the sticker book is open (a number), or null for the covers.
let stickerPage = null;
// How far each sticker in a row is turned, so they look stuck on by hand.
const TILTS = [-7, 4, -3, 6, -5, 3, -6, 5, -2, 7];

function drawStickers() {
  const area = document.getElementById('game-stickers');
  area.replaceChildren();
  const { stickers: owned, shiny, rainbow } = progress;
  const all = STICKERS.length;
  const newest = [rainbow, shiny, owned].find((list) => list.length)?.at(-1);
  // With a full book, gifts are shiny copies, then rainbow ones (see src/stickers.js).
  let count = `${owned.length} of ${all} stickers. Finish a game to open a gift!`;
  if (owned.length === all) count = `Your sticker book is full! ✨ ${shiny.length} of ${all} are shiny.`;
  if (shiny.length === all) count = `✨ Every sticker is shiny! 🌈 ${rainbow.length} of ${all} are rainbow.`;
  if (rainbow.length === all) count = '🌈 Every sticker is rainbow. Wow!';
  area.append(make('p', 'sb-count', count));
  const onPage = (p) => STICKERS.filter((s) => s.page === p);
  const haveOn = (p) => onPage(p).filter((s) => owned.includes(s.id)).length;
  const haveText = (p) => (haveOn(p) === onPage(p).length ? '★ All 15' : `${haveOn(p)} of ${onPage(p).length}`);
  const haveNode = (p) => make('span', `sb-have${haveOn(p) === onPage(p).length ? ' sb-have-all' : ''}`, haveText(p));

  // The covers: one tile for each page. Tap a tile to open its page.
  if (stickerPage === null) {
    const covers = make('div', 'sb-covers');
    PAGES.forEach((page, p) => {
      const isNew = onPage(p).some((s) => s.id === newest);
      const cover = button(`sb-cover sb-album-${p % 8}${isNew ? ' sb-cover-new' : ''}`, '', () => {
        stickerPage = p;
        drawStickers();
        window.scrollTo(0, 0);
      });
      // A taste of the page: its first 3 stickers (pale if not collected yet).
      const taste = make('span', 'sb-taste');
      for (const sticker of onPage(p).slice(0, 3)) {
        taste.append(make('span', `sticker-art${owned.includes(sticker.id) ? '' : ' sb-pale'}`, sticker.picture));
      }
      cover.append(make('span', 'sb-cover-name', page.name), taste, haveNode(p));
      cover.setAttribute('aria-label', `${page.name}: ${haveText(p)}${isNew ? ', with your newest sticker' : ''}`);
      covers.append(cover);
    });
    area.append(covers);
    return;
  }

  // One page of the album: a card in its own soft color, with the stickers
  // stuck on at slightly different angles.
  const p = stickerPage;
  area.append(button('plain-button sb-back', '← All pages', () => {
    stickerPage = null;
    drawStickers();
  }));
  const album = make('section', `sb-album sb-album-${p % 8}`); // 8 page colors, used in turn
  const heading = make('h2', 'sb-page', PAGES[p].name);
  heading.append(haveNode(p));
  const grid = make('div', 'sb-grid');
  onPage(p).forEach((sticker, i) => {
    const got = owned.includes(sticker.id);
    const tier = rainbow.includes(sticker.id) ? 'rainbow' : shiny.includes(sticker.id) ? 'shiny' : '';
    const spot = make('span', 'sb-sticker' + (got ? '' : ' sb-empty') + (tier ? ` sb-${tier}` : '') + (sticker.id === newest ? ' sb-new' : ''));
    const art = stickerArt(sticker.picture, tier);
    art.style.setProperty('--tilt', `${TILTS[i % TILTS.length]}deg`);
    spot.append(art);
    spot.setAttribute('role', 'img');
    spot.setAttribute('aria-label', tier ? `${sticker.name}, ${tier}` : got ? sticker.name : 'A sticker you don\'t have yet');
    grid.append(spot);
  });
  album.append(heading, grid);
  area.append(album);
}

// ---------- Celebration: falling stars ----------

const CONFETTI_COLORS = ['var(--star)', 'var(--here)', 'var(--words)', 'var(--go)'];

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.getElementById('confetti');
  layer.replaceChildren();
  for (let i = 0; i < 30; i++) {
    const piece = make('span', 'confetti-piece', i % 3 === 0 ? '★' : '●');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.fontSize = `${14 + Math.random() * 18}px`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    layer.append(piece);
  }
  setTimeout(() => layer.replaceChildren(), 3500);
}

// ---------- Screens ----------

/** A screen: a back button, its title, an optional line under it, and room for what it shows. */
function makeScreen(name, title, note) {
  const screen = make('section', 'view');
  screen.hidden = true;
  const top = make('header', 'top game-top');
  const back = make('a', 'back', '←');
  back.href = '#';
  back.setAttribute('aria-label', 'Back to the pond');
  top.append(back, make('h1', '', title));
  if (note) top.append(make('p', 'legend', note));
  const area = make('main', 'game');
  area.id = `game-${name}`;
  screen.append(top, area);
  return document.querySelector('.app').appendChild(screen);
}

// The screens that exist. Anything else in the address shows the home screen.
const VIEWS = { '': document.getElementById('home') };
for (const [name, { title }] of Object.entries(GAMES)) {
  VIEWS[name] = makeScreen(name, title, playingPast ? `${capital(dayName(playDay))}'s game` : '');
}
VIEWS.stickers = makeScreen('stickers', 'My Stickers', 'Every game you finish has a gift.');
VIEWS['grown-ups'] = makeScreen('grown-ups', 'For Grown-Ups', 'Everything here stays on this phone.');

// ---------- Half-done games ----------

// If the phone locks or the app reloads partway through a game, the game
// picks up where it left off. Each game saves a small snapshot as it goes
// (session.save) and is handed it back when it starts again (session.saved).
// Snapshots are kept for the day being played only, and only if the game
// is still exactly the same one.
const HALF_DONE_KEY = 'little-pond.half-done';

function readHalfDone() {
  try {
    const stored = JSON.parse(localStorage.getItem(HALF_DONE_KEY));
    if (stored && stored.day === playDay && typeof stored.games === 'object') return stored;
  } catch { /* nothing saved, or storage is off */ }
  return { day: playDay, games: {} };
}

function writeHalfDone(name, entry) {
  const stored = readHalfDone();
  if (entry) stored.games[name] = entry;
  else delete stored.games[name];
  try { localStorage.setItem(HALF_DONE_KEY, JSON.stringify(stored)); } catch { /* storage is off: nothing is kept */ }
}

// Games are started the first time they are opened, then kept, so leaving
// a game halfway and coming back keeps the player's place.
const started = new Set();

/** Load a game's file, make the day's rounds, and draw them. */
async function startGame(name) {
  const area = document.getElementById(`game-${name}`);
  area.replaceChildren(make('p', 'loading', 'Getting your game…'));
  try {
    const game = await import(`./games/${name}.js`);
    const puzzle = game.generate(seedFor(playDay, name), levelFor(name));
    // A fingerprint of the rounds: a snapshot of different rounds (a new level) is ignored.
    const fingerprint = hashString(JSON.stringify(puzzle));
    const entry = readHalfDone().games[name];
    const session = {
      saved: entry?.fingerprint === fingerprint ? entry.snapshot : undefined,
      save: (snapshot) => writeHalfDone(name, { fingerprint, snapshot }),
    };
    area.dataset.resumed = session.saved ? 'yes' : '';
    game.render(area, puzzle, (result) => {
      writeHalfDone(name, null); // finished: nothing left to pick up
      started.delete(name);      // opening it again starts a fresh go
      finishGame(name, result);
    }, session);
  } catch (error) {
    area.textContent = 'Oops, the game could not load. Try again in a moment.';
    console.error(error);
  }
}

// ---------- For grown-ups ----------

// A page with the last 4 weeks, which games get played and at what level,
// and a way to start over. Everything shown is read from this phone only.
function drawGrownUps() {
  const area = document.getElementById('game-grown-ups');
  area.replaceChildren();
  const days = progressStore.currentStreak(progress, today);
  area.append(
    make('p', 'gu-summary', `${plural(progress.totalDays, 'day')} played in all · ${plural(days, 'day')} in a row now`),
    make('p', 'gu-level', 'A game moves up a level after 3 easy days in a row, and down after 2 hard ones. Tapping the ducklings to count is never a miss.'),
  );

  // The last 4 weeks, oldest first, with today in the last square.
  area.append(make('h2', 'gu-heading', 'Last 4 weeks'));
  const dates = Array.from({ length: progressStore.KEEP_DAYS }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - (progressStore.KEEP_DAYS - 1 - i)));
  const weeks = make('div', 'gu-weeks');
  for (const date of dates.slice(0, 7)) {
    weeks.append(make('span', 'gu-weekday', date.toLocaleDateString('en-US', { weekday: 'narrow' })));
  }
  for (const date of dates) {
    const key = dateKey(date);
    const count = (progress.finished[key] || []).length;
    const square = make('div', 'gu-day' + (count ? ' gu-day-played' : '') + (key === today ? ' gu-today' : ''));
    square.append(make('span', 'gu-date', String(date.getDate())), make('span', 'gu-count', count ? `${count}✓` : '·'));
    square.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${count ? plural(count, 'game') : 'no games'}`);
    weeks.append(square);
  }
  area.append(weeks);

  // Which games get played: days each was finished, most first.
  area.append(make('h2', 'gu-heading', 'Games played'));
  const list = make('ul', 'gu-games');
  const rows = Object.entries(GAMES)
    .map(([name, { title, levels }]) => ({ name, title, levels, times: progress.plays[name] || 0 }))
    .sort((a, b) => b.times - a.times || a.title.localeCompare(b.title));
  for (const { name, title, levels, times } of rows) {
    const trend = progressStore.trend(progress, name);
    const notes = [
      `Level ${Math.min(progressStore.levelOf(progress, name, today), levels)} of ${levels}`,
      trend === 'well' ? '★ Going well' : trend === 'practice' ? '● Needs practice' : '',
    ].filter(Boolean).join(' · ');
    const about = make('span', 'gu-about');
    about.append(make('span', '', title), make('span', `gu-note${trend === 'practice' ? ' gu-note-practice' : ''}`, notes));
    const row = make('li', 'gu-game');
    row.append(about, make('span', 'gu-times', times ? plural(times, 'day') : 'not yet'));
    list.append(row);
  }
  area.append(list);

  // Start over: asks first, since it can't be undone.
  const ask = make('div', 'gu-confirm');
  ask.hidden = true;
  const startOver = button('plain-button gu-start-over', 'Start over…', () => { ask.hidden = false; startOver.hidden = true; });
  ask.append(
    make('p', '', 'This clears the lily pads, the stickers, and this page on this phone. It can\'t be undone.'),
    button('plain-button', 'Cancel', () => { ask.hidden = true; startOver.hidden = false; }),
    button('plain-button gu-reset', 'Yes, start over', () => {
      progressStore.save(progressStore.emptyProgress());
      try { localStorage.removeItem(HALF_DONE_KEY); } catch { /* storage is off */ }
      location.hash = '';
      location.reload();
    }),
  );
  area.append(startOver, ask);
}

// The grown-up page opens when its button is held for 2 seconds, so a
// young player's quick taps don't land on "Start over".
const HOLD_MS = 2000;
{
  const hold = document.getElementById('grown-ups-hold');
  let timer;
  const stop = () => {
    clearTimeout(timer);
    hold.classList.remove('holding');
  };
  hold.addEventListener('pointerdown', () => {
    hold.classList.add('holding');
    timer = setTimeout(() => { stop(); location.hash = 'grown-ups'; }, HOLD_MS);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(type, stop);
  hold.addEventListener('contextmenu', (event) => event.preventDefault()); // a long press must not open a menu
  // A keyboard press (no pointer) opens it right away.
  hold.addEventListener('click', (event) => { if (event.detail === 0) location.hash = 'grown-ups'; });
}

// ---------- Moving between screens ----------

function show() {
  const name = location.hash.slice(1);
  const current = name in VIEWS ? name : '';
  for (const [viewName, view] of Object.entries(VIEWS)) view.hidden = viewName !== current;
  // The end-of-game card belongs to the game that just finished.
  document.getElementById('done').hidden = true;
  if (waitingGift) keepSticker(waitingGift); // left without opening the gift: keep the sticker anyway
  window.scrollTo(0, 0);

  if (current === '') updateHome();
  if (current === 'grown-ups') drawGrownUps();
  if (current === 'stickers') {
    stickerPage = null; // the book always opens at its covers
    drawStickers();
  }
  if (current in GAMES && !started.has(current)) {
    started.add(current);
    startGame(current);
  }
}

window.addEventListener('hashchange', show);
unlockVoice();
show();

// With no voice on the phone the app would be silent, so say why (to a grown-up).
voiceMissing().then((missing) => { document.getElementById('no-voice').hidden = !missing; });

// ---------- A new day, and Refresh ----------

// A home-screen app is rarely closed: it sleeps in the background and
// wakes up still showing the day it was opened. So whenever the app comes
// back to the front (and once a minute while it's open), check the date.
// On a new day, start again on the home screen with the new day's games.
function startNewDayIfNeeded() {
  if (document.visibilityState !== 'visible' || dateKey() === today) return;
  location.replace(location.pathname);
}
document.addEventListener('visibilitychange', startNewDayIfNeeded);
window.addEventListener('pageshow', startNewDayIfNeeded);
window.addEventListener('focus', startNewDayIfNeeded);
setInterval(startNewDayIfNeeded, 60 * 1000);

// The Refresh button does the same by hand: it loads the app again, which
// gets the newest version (when online) and today's games. A half-done
// game is kept.
document.getElementById('refresh').addEventListener('click', async (event) => {
  event.target.textContent = 'Refreshing…';
  event.target.disabled = true;
  try {
    // Ask for the newest service worker too, so the offline copy is up to date.
    const worker = await navigator.serviceWorker?.getRegistration();
    await worker?.update();
  } catch { /* offline, or no service worker: loading again still works */ }
  location.replace(location.pathname);
});

// ---------- Started, and offline ----------

// Tells the check in index.html that the app's code loaded and ran. The
// splash fades out on its own (styles.css); this just tidies it away.
window.littlePondStarted = true;
setTimeout(() => document.getElementById('splash')?.remove(), 1500);

// The service worker (sw.js) saves the app's files so it opens without
// internet. If the phone can't run one, the app works as before, online.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Offline mode is off:', error));
}
