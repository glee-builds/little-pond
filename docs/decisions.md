# Decisions log

Every project decision, when it was made, and why. When a decision changes, don't delete the old row: mark it as replaced and add a new row explaining what changed and why.

| Date | Area | Decision | Reason |
|---|---|---|---|
| 2026-11-26 | Code | Plain HTML, CSS, JavaScript ES modules. No framework, no build step | Every file stays readable for a beginner |
| 2026-11-26 | Workflow | After the first commit, never commit directly to `main`; every change goes through a branch and a pull request | Gives the owner a review step before anything reaches `main` |
| 2026-11-26 | Shape | A separate app from Lily Pad, not a mode inside it | Lily Pad's screens assume a reader; a separate app can't break it |
| 2026-11-26 | Balance | Mostly number sense, with a few sound and word games | The owner's call |
| 2026-11-26 | Adding | Taught by joining groups and by splitting a group in different ways, not as written sums | Ideas the player can see and handle, not memorized facts |
| 2026-11-26 | Repo and hosting | Public repo `little-pond`, GitHub Pages from `main` | Free hosting; nothing in the repo describes a person |
| 2026-11-26 | Reuse | Copy and trim Lily Pad's shared files instead of linking to them | Two repos with no build step cannot share files |
| 2026-11-26 | Daily set | "Today's 4": 3 number games and 1 sound game (4 number games until the sound games exist) | About 5 minutes |
| 2026-11-26 | Rounds | 4 rounds per game. The third miss shows the answer and moves on | Short and kind |
| 2026-11-26 | Pond | One frog hop per day played. Days in a row show only on the grown-up page | No streak pressure for a young player |
| 2026-11-26 | Instructions | Spoken by the device's built-in voice, with a speaker button to hear it again | Nothing has to be read; no network request |
| 2026-11-26 | Letter sounds | Recorded by a grown-up on the grown-up page; kept on the phone, never in the repo | The built-in voice can't say single sounds, and a voice recording is personal |
| 2026-11-26 | Grown-up page | Opened by holding the link for 2 seconds | Keeps "Start over" out of a young player's reach |
| 2026-11-26 | Tap to count | Tapping a frog says the next number and marks it. Never a miss or a hint | Counting is the method |
| 2026-11-26 | Open rounds | Rounds with several right answers accept any correct arrangement | They are about finding a way, not the way |
| 2026-11-26 | Character and icon | The app's character is a duckling, and the icon is the duckling on a lily pad at sunrise. Number games count ducklings | The owner asked for a different character and icon from Lily Pad's frog, in a similar style, so the two apps are easy to tell apart |
| 2026-11-26 | Shell | Home screen, pond, today's set, earlier days, sticker book, grown-up page, Refresh, and offline play are copied from Lily Pad and trimmed: no "how to play" cards, weekly note, or review lists | Those rely on reading, or on games this app doesn't have |
| 2026-11-26 | Today's set while there are few games | The set is up to 4 games; with fewer games than that, it is every game there is | The app ships one game at a time |
| 2026-11-26 | playRounds | One helper in `src/scene.js` runs every game's rounds: the spoken line, the speaker button, round dots, misses, showing the answer after the third miss, and the player's place | Keeps each game to one short file |
| 2026-11-26 | How Many | First game. Ducklings on a lily pad; pick the card with the same number of dots. Levels: 1 to 3, 1 to 5, 4 to 10. Never the same number twice in a row; the two wrong cards are within 2 of the right one | Seeing a small amount at a glance |
| 2026-11-26 | Scene, for now | `src/scene.js` has no drag-or-tap yet; it arrives with Groups, the first game that drags | Nothing uses it yet |
| 2026-11-26 | No voice | If the device has no English voice stored on it, the home screen says so to a grown-up. The games still open | The app should say why it is silent |
| 2026-11-27 | How Many counts first (replaces "Tap to count" being optional there) | The player taps each duckling and the app counts up aloud with every tap. The answer cards are faded and can't be tapped until the last duckling is counted; then the app asks "How many ducklings?" Ducklings still to count bob a little | The owner wants the player to count each one, with the app counting along, before answering |
