// voice.js: saying things aloud with the device's own built-in voice.
//
// Every instruction in this app is spoken, so nothing has to be read.
//
// Devices come with several voices, and the first one offered is often a
// flat, robotic one. pickVoice chooses the most natural English voice the
// device has. Only voices that live on the device are used, so nothing is
// sent over the internet.

// Higher-quality voices say so in their name: "Ava (Premium)", "Samantha (Enhanced)".
const QUALITY = [[/premium/i, 40], [/enhanced/i, 30], [/natural/i, 30], [/siri/i, 20]];
// Clear, friendly voices found on phones, tablets, and computers.
const GOOD_NAMES = /^(ava|samantha|allison|zoe|evan|susan|nicky|joelle|noelle|nathan|tom|karen|moira|tessa|daniel|serena|aria|jenny|michelle)\b/i;
// Novelty and old-style synthetic voices: never pick these.
const SKIP_NAMES = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|fred|good news|jester|junior|kathy|organ|ralph|superstar|trinoids|whisper|zarvox|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|eloquence)\b/i;

/** How good a voice is for reading to a child. Higher is better; below 0 means don't use it. */
export function scoreVoice(voice) {
  const name = voice.name || '';
  const lang = (voice.lang || '').replace('_', '-').toLowerCase();
  if (!lang.startsWith('en')) return -1;
  if (voice.localService === false) return -1; // an online voice: would send the words away
  if (SKIP_NAMES.test(name)) return -1;
  let score = lang === 'en-us' ? 10 : 5;
  for (const [pattern, points] of QUALITY) if (pattern.test(name) || pattern.test(voice.voiceURI || '')) score += points;
  if (GOOD_NAMES.test(name)) score += 15;
  if (/compact/i.test(voice.voiceURI || '')) score -= 5; // the small, flatter version of a voice
  return score;
}

/** The best voice in a list (from speechSynthesis.getVoices()), or null to use the device's default. */
export function pickVoice(voices) {
  let best = null;
  let bestScore = 0;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) [best, bestScore] = [voice, score];
  }
  return best;
}

/** True if this device can read aloud. */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Read `parts` aloud one after another, with a short pause between them.
 * Each part is { text, rate }: rate 1 is normal speed, lower is slower.
 */
export function say(parts) {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = pickVoice(synth.getVoices());
    for (const { text, rate } of parts) {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = voice ? voice.lang : 'en-US';
      if (voice) speech.voice = voice;
      speech.rate = rate;
      synth.speak(speech); // they queue up and play in order
    }
  } catch { /* no voice on this device: the home screen says so (voiceMissing) */ }
}

// Some browsers load their list of voices a moment after the page opens.
// Asking early means the list is ready by the first game.
if (canSpeak()) window.speechSynthesis.getVoices();

/** Say one line, a little slower than normal speech. */
export function speak(text) {
  if (canSpeak()) say([{ text, rate: 0.9 }]);
}

/**
 * Phones only let a page talk after the player has touched it. The first
 * touch says nothing, out loud, which opens the way for every line after.
 */
export function unlockVoice() {
  if (!canSpeak()) return;
  document.addEventListener('pointerdown', () => {
    try { window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch { /* nothing to unlock */ }
  }, { once: true });
}

/**
 * True if this device has no English voice stored on it, so the app would
 * be silent. Voices can take a moment to load, so this waits up to 2 seconds.
 */
export async function voiceMissing() {
  if (!canSpeak()) return true;
  const synth = window.speechSynthesis;
  const found = () => pickVoice(synth.getVoices()) !== null;
  if (found()) return false;
  await new Promise((resolve) => {
    synth.addEventListener?.('voiceschanged', resolve, { once: true });
    setTimeout(resolve, 2000);
  });
  return !found();
}
