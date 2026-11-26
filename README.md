# little-pond (Little Pond)

**Little Pond** is the name players see. The repo and web address are `little-pond`.

A daily play app for a young pre-reader, played on a parent's phone. Each day serves a short set of games (about 5 minutes), mostly about number sense: seeing small amounts, making groups, joining and splitting groups, comparing, sorting, and patterns. Every instruction is spoken aloud and every answer is a tap or a drag on a picture, so nothing has to be read. It is the younger sibling of [Lily Pad](https://github.com/glee-builds/kids-puzzles) and is built the same way: plain HTML, CSS, and JavaScript, with no framework, no build step, no accounts, and no network requests. Progress is saved on the phone.

**Live:** https://glee-builds.github.io/little-pond/

## Preview locally

From this folder, run:

```bash
python3 -m http.server 8010
```

Then open http://localhost:8010 in a browser. Press `Ctrl+C` in the terminal to stop the server.

To preview on your phone, connect it to the same Wi-Fi as your Mac and open `http://[your-mac-name].local:8010`.

## Run the tests

From this folder, run:

```bash
node --test
```

This uses Node's built-in test runner. It finds every `*.test.js` file in `tests/` and reports which checks pass.

To open every screen in a real browser and play each game to the end (needs Google Chrome):

```bash
node tests/screens.mjs
```
