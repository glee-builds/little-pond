// sounds.js: the letter sounds a grown-up records, and the word list the
// sound games share.
//
// The phone's built-in voice says whole words well, but it can't say one
// letter's sound ("mmm"). So a grown-up records each sound once, on the
// grown-up page. Recordings are kept on this phone only (in IndexedDB, the
// browser's own storage) and are never sent anywhere or put in the repo.

import { make, button } from './ui.js';

// Every letter, with a word for its sound: "m as in map". These are the
// common short sounds (a as in apple, hard c and g; x is "ks").
export const LETTERS = {
  a: 'apple', b: 'bat', c: 'cat', d: 'dog', e: 'egg', f: 'fox', g: 'goat', h: 'hat', i: 'igloo',
  j: 'jet', k: 'kite', l: 'leg', m: 'map', n: 'nut', o: 'octopus', p: 'pig', q: 'queen', r: 'run',
  s: 'sun', t: 'ten', u: 'up', v: 'van', w: 'web', x: 'box', y: 'yes', z: 'zip',
};

// A sound game can be played once it has this many words (or sounds) to choose from.
export const ENOUGH = 8;

// ---------- The word list ----------

// data/words.json: three-letter words (consonant, short vowel, consonant),
// each with a picture: { word, picture, stretchy, also }. `stretchy` says
// whether all its sounds can be stretched; `also` lists other names a young
// player might give the picture.
let words = null;
export const loadWords = () => (words ??= fetch('data/words.json').then((response) => response.json())
  .catch((error) => { words = null; throw error; }));

/** Every name a picture might be called: its word first. */
export const names = ({ word, also = [] }) => [word, ...also];

// ---------- Keeping recordings ----------

const STORE = 'sounds';
let opening = null;
const database = () => (opening ??= new Promise((resolve, reject) => {
  const request = indexedDB.open('little-pond.sounds', 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
}));

/** Do one thing with the store, and wait until it is safely done. */
async function store(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** The letters that have a recording: a Set. Empty if the phone has no storage. */
export async function recorded() {
  try {
    return new Set(await store('readonly', (sounds) => sounds.getAllKeys()));
  } catch {
    return new Set();
  }
}

/** Keep a recording (a Blob from the recorder) for a letter, in place of any before it. */
export async function save(letter, blob) {
  // Kept as plain bytes: some iPhones lose Blobs put in IndexedDB.
  const bytes = await blob.arrayBuffer();
  await store('readwrite', (sounds) => sounds.put(bytes, letter));
  decoded.delete(letter);
  navigator.storage?.persist?.().catch(() => {}); // ask the phone not to clear recordings when it tidies up
}

export async function remove(letter) {
  await store('readwrite', (sounds) => sounds.delete(letter));
  decoded.delete(letter);
}

// ---------- Playing ----------

// Sounds play through one AudioContext: once a touch has woken it, it can
// play at any moment (as the duckling slides), which an <audio> tag can't
// do on an iPhone.
let context = null;
const audio = () => (context ??= new (window.AudioContext ?? window.webkitAudioContext)());

if (typeof document !== 'undefined') {
  const wake = () => {
    try { if (audio().state !== 'running') audio().resume().catch(() => {}); } catch { /* this browser can't play sounds */ }
  };
  for (const type of ['pointerup', 'touchend', 'click']) document.addEventListener(type, wake, true);
}

const decoded = new Map(); // letter -> its sound, ready to play
let playing = null;

/**
 * Play a letter's recording, cutting off the one before it. The promise
 * is done when the sound ends. With no recording, or a phone that won't
 * play it, it is done right away, so a game never waits forever.
 */
export async function play(letter) {
  try {
    if (!decoded.has(letter)) {
      const bytes = await store('readonly', (sounds) => sounds.get(letter));
      if (!bytes) return;
      decoded.set(letter, await audio().decodeAudioData(bytes));
    }
    playing?.stop();
    const source = audio().createBufferSource();
    playing = source;
    source.buffer = decoded.get(letter);
    source.connect(audio().destination);
    await new Promise((resolve) => {
      source.onended = resolve;
      setTimeout(resolve, source.buffer.duration * 1000 + 300); // a page not touched yet plays nothing and never says "ended"
      source.start();
    });
  } catch { /* nothing to play, or it can't be played: carry on quietly */ }
}

// ---------- Recording ----------

// iPhones record audio/mp4; most other browsers record audio/webm.
const TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
const MAX_MS = 5000; // a letter sound is short: stop by itself, so the microphone is never left on

/**
 * Start recording from the microphone. Gives back a function that stops
 * it and gives the recording (a Blob). If it can't record, it throws an
 * Error whose message says why, in words for a grown-up.
 */
export async function record() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('This browser can\'t record sound. Try opening Little Pond in Safari or Chrome.');
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw new Error(['NotAllowedError', 'SecurityError'].includes(error.name)
      ? 'The microphone is turned off for Little Pond. Allow it in the phone\'s settings, then try again.'
      : 'No microphone was found on this device.');
  }
  const turnOff = () => stream.getTracks().forEach((track) => track.stop());
  try {
    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const done = new Promise((resolve) => {
      recorder.onstop = () => {
        turnOff();
        resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
    });
    recorder.start();
    return () => {
      if (recorder.state !== 'inactive') recorder.stop();
      return done;
    };
  } catch {
    turnOff();
    throw new Error('Recording could not start on this device.');
  }
}

// ---------- The "Record sounds" part of the grown-up page ----------

/**
 * The 26 letters as tiles (✓ on the ones recorded) and, for the tile that
 * was tapped, a small recorder: record, play, record again, delete.
 * `onChange` is called whenever a recording is saved or deleted.
 */
export function recordSection(onChange) {
  let have = new Set();
  let letter = null; // the tile that is open
  let stop = null;   // while recording: the function that stops it
  let timer;

  const section = make('div', 'rec');
  const grid = make('div', 'rec-grid');
  const panel = make('div', 'rec-panel');
  const title = make('p', 'rec-title');
  const status = make('p', 'rec-status');
  status.setAttribute('role', 'status');
  const recordButton = button('plain-button rec-record', '', toggle);
  const playButton = button('plain-button', '▶ Play', () => play(letter));
  const deleteButton = button('plain-button', 'Delete', async () => {
    await remove(letter);
    changed('Deleted.');
  });
  const tiles = Object.keys(LETTERS).map((name) => grid.appendChild(button('rec-letter', name, () => {
    cancel();
    letter = name;
    status.textContent = '';
    draw();
    panel.scrollIntoView({ block: 'nearest' });
  })));
  const buttons = make('div', 'rec-buttons');
  buttons.append(recordButton, playButton, deleteButton);
  panel.append(title, buttons, status);
  section.append(
    make('p', 'rec-about', 'Record each letter\'s sound, not its name: "mmm", not "em". Record only the ones already taught. Recordings stay on this phone.'),
    grid, panel,
  );

  function draw() {
    tiles.forEach((tile) => {
      const name = tile.textContent;
      tile.classList.toggle('rec-done', have.has(name));
      tile.setAttribute('aria-label', `${name}, ${have.has(name) ? 'recorded' : 'not recorded'}`);
      tile.setAttribute('aria-pressed', String(name === letter));
    });
    panel.hidden = !letter;
    if (!letter) return;
    const done = have.has(letter);
    title.textContent = `${letter} as in ${LETTERS[letter]}${done ? ' · ✓ recorded' : ''}`;
    recordButton.textContent = stop ? '■ Stop' : done ? '● Record again' : '● Record';
    recordButton.classList.toggle('rec-recording', Boolean(stop));
    playButton.hidden = deleteButton.hidden = !done || Boolean(stop);
  }

  async function changed(text) {
    have = await recorded();
    status.textContent = text;
    draw();
    onChange?.();
  }

  /** Stop a recording that is under way and throw it away. */
  function cancel() {
    clearTimeout(timer);
    stop?.();
    stop = null;
  }

  async function toggle() {
    if (stop) return finish();
    recordButton.disabled = true; // the phone may be asking to use the microphone
    try {
      stop = await record();
      timer = setTimeout(finish, MAX_MS);
      status.textContent = 'Recording… say the sound, then tap Stop.';
    } catch (error) {
      status.textContent = error.message;
    }
    recordButton.disabled = false;
    draw();
  }

  async function finish() {
    clearTimeout(timer);
    const [ending, name] = [stop, letter];
    stop = null;
    try {
      const blob = await ending();
      if (!blob.size) throw new Error('empty');
      await save(name, blob);
      changed('Saved. Tap Play to hear it.');
    } catch {
      changed('That one wasn\'t saved. Try again.');
    }
  }

  recorded().then((letters) => {
    have = letters;
    draw();
  });
  draw();
  return section;
}
