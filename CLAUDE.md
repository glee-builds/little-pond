# little-pond: working rules for Claude Code

Shared rules for all coding projects are in `../CLAUDE.md`, and they apply here. This file adds this project's rules. The full decision history is in `docs/decisions.md`; when a decision changes, update that file and note why.

## Workflow

- **Never commit directly to `main`.** The first commit was the only exception. All work goes on a branch and reaches `main` through a pull request that the owner merges.
- Each game is its own pull request. (The one exception: the 12 games after How Many arrived together, at the owner's request. See `docs/decisions.md`.)
- This repo is public. Write "the player", never a name, age, or pronoun, in files, commit messages, branch names, and pull requests.

## Locked decisions

- **Code:** plain HTML, CSS, and JavaScript ES modules. No framework, no build step, no npm packages.
- **Repo:** public, named `little-pond`. Players see "Little Pond".
- **Hosting:** GitHub Pages from the root of `main`. Installable to the home screen; works offline (`sw.js`).
- **Data:** progress in `localStorage` under `little-pond.progress`. One player, no accounts.
- **Testing:** Node's built-in test runner (`node --test`), one test file per game, checking every day for two years at every level. `node tests/screens.mjs` opens every screen in headless Chrome at phone size, plays each game, and checks it works offline; add a file for each new game to `tests/plays/`. GitHub Actions runs both on every pull request.
- **Shared with Lily Pad:** files copied from `../kids-puzzles` and trimmed (seed, progress, stickers, voice, pond, rounds, the service worker). Two repos with no build step cannot share files, so a fix in one is copied to the other by hand.
- **Game modules:** each game is one file in `src/games/` that exports `meta` (`{ title, kind, levels, css, art }`: its name, its group, how many levels, whether it has its own `.css` file beside it, and the picture on its card), `generate(seed, level)`, `check(round, answer)`, `verify(puzzle)` (which returns `{ ok, problems }`), and `render(container, puzzle, onDone, session)`. A game registers itself: add its name to `NAMES` in `src/games/index.js`, and its files to `FILES` in `sw.js`. Nothing in `src/app.js` changes.
- **Styles:** `styles.css` holds the colors (variables at the top), the app's screens, and every piece `src/scene.js` makes. A game's own `.css` file holds only what that game alone needs, with its own short prefix (`grp-`, `hop-`, `mof-`), and is loaded when the game is first opened. Colors always come from the variables.
- **Old iPads:** the app must run on Safari 15.4. Nothing newer in CSS or JavaScript without a fallback (`color-mix()` sits inside `@supports`, under "Soft colors" in `styles.css`).
- **Character:** a duckling (`assets/duck.svg`), drawn for this app in the style of Lily Pad's frog. The app icon is the duckling on a lily pad at sunrise.
- **Scene:** `src/scene.js` has the pieces games are made of: ducklings, tap-to-count, answer cards (`dotCards` for numbers, `pictureCards` for words; they can sleep until the player has counted or watched), the round check button, drag-or-tap (`draggable`), the bank of ducklings to move onto pads, and `playRounds`, which runs a game's rounds (the spoken line, the speaker button, the round dots, misses, and the player's place if the phone locks). A game describes each round as data and gives `playRounds` three things: `prompt`, `check`, and `draw`. A piece moves into `src/scene.js` (and its styles into `styles.css`) once two games use it.
- **Sound games:** letter sounds are recorded on the grown-up page and kept in IndexedDB by `src/sounds.js`; the words and their pictures are in `data/words.json`. A game that needs them exports two more things: `data()`, which gives what `generate` needs after the seed and level (the word list and the recorded letters), and `available()`, which says whether enough is recorded to play. Until it is, the game stays out of today's set.
- **Daily set:** `src/today.js` picks up to 4 games a day: 3 from Numbers and 1 from Sounds (all Numbers until a sound game exists). The 7 days before today can be played from the home screen (`?day=2026-11-20`).
- **Levels:** each game has `levels` in its `meta`; up after 3 easy days in a row, down after 2 hard ones (`src/progress.js`). No level is shown to the player.
- **Stickers:** the first finish of each game each day gives a gift (`src/stickers.js`, the same book as Lily Pad).
- **Grown-up page:** opened by holding its button for 2 seconds.
- **Spoken instructions:** the device's built-in voice (`src/voice.js`), only voices stored on the device. A speaker button repeats the line.
- **Letter sounds:** recorded by a grown-up on the grown-up page and kept on the phone (IndexedDB). Never in the repo.
- **Kind to a miss:** right moves on; the third miss shows the answer and moves on. Tap-to-count is never a miss or a hint.

## Design rules

Kids' app rules in `../CLAUDE.md` apply. This project adds:

- Tap targets at least 64px; things to drag at least 56px.
- Every drag also works as two taps.
- No text the player must read. No system keyboard, no number pad.
- Numerals sit beside objects; they don't replace them.
- A miss gets a gentle wiggle and the spoken line again. Never a buzzer or a lost reward.
- Sound never starts before the first touch.
- Always light: the app does not follow the device's dark mode.

## Repo layout

```
index.html          home screen: the pond, today's games, and the end-of-game card
styles.css
sw.js               service worker: offline play, newest files when online
assets/             the duckling, the icon, the Andika font
data/words.json     the sound games' words and pictures
src/app.js          screens, starting games, stickers, the grown-up page
src/scene.js        the pieces games are made of: ducklings, answer cards,
                    tap-to-count, drag-or-tap, the bank, playRounds
src/games/          one .js file per game, with its .css beside it
src/games/index.js  the list of games
src/sounds.js       recording and playing letter sounds; the word list
src/sounds.css      the "Record sounds" part of the grown-up page
src/today.js        which games make up today's set
src/voice.js        saying lines aloud with the device's own voice
src/ui.js           small helpers (make, button, wiggle, round dots, plural, range)
src/seed.js progress.js stickers.js pond.js rounds.js   shared with Lily Pad
tests/              one test file per game; screens.mjs opens every screen
                    in headless Chrome, playing each game as its file in
                    tests/plays/ says
docs/decisions.md   decisions log
```

## Preview locally

`python3 -m http.server 8010`, then open http://localhost:8010.
