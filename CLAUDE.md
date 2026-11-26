# little-pond: working rules for Claude Code

Shared rules for all coding projects are in `../CLAUDE.md`, and they apply here. This file adds this project's rules. The full decision history is in `docs/decisions.md`; when a decision changes, update that file and note why.

## Workflow

- **Never commit directly to `main`.** The first commit was the only exception. All work goes on a branch and reaches `main` through a pull request that the owner merges.
- Each game is its own pull request.
- This repo is public. Write "the player", never a name, age, or pronoun, in files, commit messages, branch names, and pull requests.

## Locked decisions

- **Code:** plain HTML, CSS, and JavaScript ES modules. No framework, no build step, no npm packages.
- **Repo:** public, named `little-pond`. Players see "Little Pond".
- **Hosting:** GitHub Pages from the root of `main`. Installable to the home screen; works offline (`sw.js`).
- **Data:** progress in `localStorage` under `little-pond.progress`. One player, no accounts.
- **Testing:** Node's built-in test runner (`node --test`), one test file per game.
- **Shared with Lily Pad:** files copied from `../kids-puzzles` and trimmed (seed, progress, stickers, voice, pond, rounds, the service worker). Two repos with no build step cannot share files, so a fix in one is copied to the other by hand.
- **Game modules:** each game is one file in `src/games/` that exports `generate(seed, level)`, `check(round, answer)`, `verify(puzzle)`, and `render(container, puzzle, onDone, session)`, plus one entry in `GAMES` in `src/app.js`. Add any new file to `FILES` in `sw.js`.
- **Scene:** `src/scene.js` draws frogs, flies, pads, and logs, and handles drag-or-tap and tap-to-count. A game describes a round as data and calls it.
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

## Repo layout

```
index.html          home screen
styles.css
sw.js               service worker: offline play (Phase 1)
assets/             frog art, icon, the Andika font
src/app.js          the GAMES list, screens, navigation
src/scene.js        frogs, pads, logs; drag-or-tap; tap-to-count
src/games/          one file per game
data/               words and pictures for the sound games
tests/              one test file per game
docs/decisions.md   decisions log
```

## Preview locally

`python3 -m http.server 8010`, then open http://localhost:8010.
