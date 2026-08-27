# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KanjiSwap is a Japanese language learning app prototype. Students read passages written in hiragana and swap in the appropriate kanji. The long-term goal is to generate exercises dynamically; reference exercises extracted from a real textbook live in `extracted_exercise_data/`.

## Commands

Standard Create React App (react-scripts 5):

- `npm start` — dev server at http://localhost:3000
- `npm test` — Jest in interactive watch mode
- `npm test -- --watchAll=false App.test.js` — run a single test file once
- `npm run build` — production build to `build/`

There is no separate lint command; ESLint (react-app config) runs as part of `npm start`/`npm run build`. On CI, `CI=true` makes those lint warnings fail the build, so keep the build warning-free.

## Experimental features

`src/features.js` gates unfinished work behind build flags, read at call time so a test can turn one on around the code it exercises. Nothing is on unless a build sets it.

`REACT_APP_TYPED_READING` gates the 漢字 → かな exercise. **It is off on main**: typing doesn't work properly yet. With it off the direction toggle is absent, the rail shows one bar per passage, and a saved `direction` setting asking for the reading exercise is ignored rather than stranding someone in a broken mode.

The Pages workflow publishes two builds from one deployment: `main` at `/`, and the branch named by `EXPERIMENTAL_BRANCH` (currently `experimental/typed-reading`) at **`/next`**, built with `PUBLIC_URL=/kanjiswap/next` and the flag on. That build is `continue-on-error` — unfinished work must never block the release — and the branch is allowed not to exist. Pushing to either branch rebuilds both.

## Two directions

Every passage is two exercises, tracked separately:

- **かな → 漢字** (`DIRECTION.toKanji`) — the original: read the kana, pick the kanji from a tooltip of choices.
- **漢字 → かな** (`DIRECTION.toReading`) — the kanji is on the page and the reader types its reading. Typing happens in **one field** (`ReadingComposer`), pinned above the passage, showing the word being answered at size; what's typed is mirrored small over that word where its furigana belongs. An input per word turned the line into a row of boxes and the passage stopped reading like text — `TypeWord` holds no field of its own. A correct reading is recognised the moment it's complete — there's nothing to submit, since only one string can be right. `Enter` offers a wrong answer deliberately (that's what counts a miss); `Tab` walks to the next word.

Every event row carries `direction`, and derived state keys each passage by it, so finishing one direction says nothing about the other. Rows logged before the reading exercise existed have no `direction` and count as `to_kanji`.

`src/utils/kana.js` converts romaji to hiragana on every keystroke. Kana typed with an IME passes straight through — **that's the expected path**, since students are meant to have a kana keyboard; romaji is the fallback for anyone who hasn't. Conversion runs over the whole string each time rather than per keypress, which is what lets the two mix and half-typed syllables stay visible.

The rail gives each passage two bars, labelled 漢 and か for what you're being asked to produce; clicking one opens that passage in that direction. A passage ticks as finished only when it's been read both ways.

## The mark

The app icon and the mark in the sidebar are 漢字 caught mid-rotation inside a sweep arrow, black on paper. `tools/make_icon.py` generates everything from one definition: `public/icon.svg` (an SVG favicon that follows the reader's light/dark setting), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, a multi-size `favicon.ico`, and `src/components/KanjiMark.jsx`.

The glyphs are **real outlines**, extracted from Noto Sans JP (OFL 1.1) via the Google Fonts subsets that carry those two characters — not `<text>`, so the mark renders identically with no font loaded. The script needs network, fontTools, Pillow, and macOS `qlmanage`; it is not part of the app build, and its output is committed. Edit the mark by changing the layout constants at the top of the script and re-running it — don't hand-edit the generated files.

## Deployment

The app is hosted free on GitHub Pages at https://wmcnicho.github.io/kanjiswap. `.github/workflows/ci.yml` tests and builds every pull request; `.github/workflows/deploy.yml` repeats that on `main` and publishes `build/` via the official Pages actions (OIDC — no `gh-pages` branch, no deploy key). The `homepage` field in `package.json` is what makes assets resolve under the `/kanjiswap` project-page path; renaming the repo means changing it.

## Architecture

React 18 + MUI v5 (Material UI with Emotion). Entry is `src/index.js` → `src/App.js`.

`src/theme.js` builds the MUI theme around whichever Japanese face is selected (`FONTS`: Noto Sans JP, Klee One, Noto Serif JP — the default — and Zen Maru Gothic — loaded from Google Fonts in `public/index.html`, which serves them split by unicode range so only rendered glyphs download). The palette is deliberately quiet — paper ground, near-black text, one green and one red — so the passage is the only thing with visual weight. The selected font is a *setting event* in the log, not separate state.

The flow: `App.js` renders a sidebar of the learning path plus the passage on screen, and owns the event log for every passage.

- `src/utils/curriculum.js` — builds the two-level path the rail shows: stages (`Stage 1`, `Stage 2`) holding chapters (`1-3`, `1-4`) holding passages. `stageGroupOf` and `chapterOf` split the passage's own `stage` field; both levels sort numerically, so `2-10` follows `2-9`. An exercise is named on a row **only when it differs from the commonest one** in the set — `note` carries the distinguishing word (`sentences`) — because labelling twelve of fifteen rows "discourse practice" says nothing. Earlier data had neither field, and the sidebar parsed a chapter number out of the section string — which turned out to be the *exercise* number, so ten passages from ten different chapters all grouped under one "Chapter 3". `titleOf` gives each passage its one-word name and an emoji from `src/data/passageTitles.js`, keyed by `passageKey` so regenerating passages.json doesn't detach a title from what it names. **Titles are kana, never kanji** — the rail must not show a character the exercise is asking the student to produce. A passage with no entry falls back to its preview, and a test asserts none of the shipped fourteen rely on that. `previewOf` renders the passage's opening line the way the app does — readings in place of the swappable words — which is what distinguishes ten passages sharing one section name. **Do not preview `without_furigana`**: despite the name it is the *kanji* text with the readings stripped, not the kana text, so showing it in the sidebar prints the answers. It also carries a textbook instruction line in English on some passages, which `previewOf` skips.
- `src/utils/passage.js` — `parsePassage(withFurigana)` turns a passage string with inline furigana into lines of segments (`{type: 'text'}` / `{type: 'swap', kanji, reading}`), merging adjacent pairs like `田(た)中(なか)` into one word. It accepts both ASCII and full-width parentheses (the data mixes them) and requires pure-hiragana readings so real parenthetical text like `(flower)` is left alone. `buildSwapOptions` builds each word's shuffled choice list, drawing distractors from other kanji words in the same passage.
- `src/utils/progress.js` — the browser-side **event log** (`localStorage`, key `kanjiswap.progress.v2`). Every solve, miss, attempt start, and completion is one append-only row carrying `id`, `seq`, `at`, `msSincePrevious`, `passageId`, `attemptId`, `wordKey`, `kanji`, and — for a miss — the `chosen` distractor. Nothing is overwritten, because this data is headed for a database later; `exportStore` dumps it as JSON for that. The log is capped at `MAX_EVENTS` with the oldest rows pruned and counted (`prunedEvents`). `passageKey` hashes the passage text so history survives passages.json being regenerated or reordered; `wordKey` is `line.segment.kanji`. Reads are defensive — storage access itself throws in Safari private mode, and stored JSON is untrusted. A v1 store is replayed into events marked `imported: true`.

  **Everything derived is folded, never stored.** `deriveState(store)` reduces the log into `{passages, kanji, totals}`; score, streaks, per-kanji miss counts, and attempt history all come out of that fold, so changing the scoring rules reprices existing history instead of stranding it. Scoring is points-based: `pointsFor(firstTry, streakBefore)` pays a base for any solve, a bonus for a first-try solve, and a streak bonus that caps out — persistence alone shouldn't score like recall.
- `SwapPassage.jsx` — parses a passage once (memoized so options don't reshuffle), attaches each swap word's progress key, and renders text segments inline with `SwapWord`s. With `vertical`, the container switches to `writing-mode: vertical-rl`: block flow turns with the writing mode, so lines stack right-to-left with no per-line work, and the overflow axis turns with it. Tooltips move to the left of the word in that mode.
- `SwapWord.jsx` — shows a word's hiragana reading (dotted underline) wrapped in a MUI `Tooltip` of swap choices; state-driven flash green/replace-with-kanji on success, flash red on failure. Multiple instances coexist (state is per-component, no DOM ids). Reports every click up via `onAttempt`. A swapped-in word renders as `<ruby>` with its reading in an `<rt>` that holds for ~2.2s then fades over 900ms — the `rt` stays in the layout at `opacity: 0` so the line doesn't reflow, and ruby positions itself correctly in both writing modes. A word restored from saved history gets neither flash nor furigana: both belong to the click that earned them.
- `SwapOptions.jsx` — the tooltip content: a grid of candidate kanji, each carrying `data-option` and a key hint. It no longer validates anything; it reports the clicked option through `onChoose` so the click and the keyboard take exactly the same path. `KEY_TO_INDEX` maps both `a s d f` and `1 2 3 4` to option positions.
- `ReadingControls.jsx` — the reading settings parked bottom-right at 45% opacity until hovered: the font picker (each face naming itself in its own type) and the 縦/横 writing-direction toggle. Both are `setting_changed` events, so they restore on reload and are timestamped in the log.
- `PassageNav.jsx` — the sidebar: chapters that collapse, each passage a progress bar over its opening kana. A tick means finished at least once; the bar tracks the attempt in progress, so it resets when the student tries again. Rendered into two MUI `Drawer`s — permanent from `md` up, temporary behind a ☰ button below it.
- `Score.jsx` — a running score that says when it moved: the figure sits in a faint well with tabular numerals, takes a warmer tone for ~800ms when it rises, and (with `showDelta`) shows the gain in parentheses before it fades. A falling value — a fresh attempt resetting to zero — deliberately does nothing.
- `PassageProgress.jsx` — how the current passage is going (solved/total, points, streak, wrong guesses) and, once it's finished, the **Try again** button and how it has gone before. Try again is deliberately absent mid-passage: it starts a fresh attempt rather than erasing anything, since the finished run stays in history. It sits *beside* the passage in a sticky column from `md` up, and in the sticky header (`compact`) below that — under the passage it scrolled out of sight exactly when a long passage made it most useful.

**On a phone.** Below `md` the rail becomes a temporary drawer capped at `min(280px, 85vw)`, and a sticky header carries what the hidden rail would otherwise hold — the mark, the name, and the running score. `SwapWord` takes a tap to open its choices: MUI only opens a tooltip on touch after a ~700ms long press, which nobody would guess, and tapping the open word again dismisses it. Option cells get 44px minimums on `xs`. Key hints are suppressed on `(pointer: coarse)` — there are no keys to hint at. Heights prefer `dvh` where supported so a phone's address bar doesn't crop the passage, and `ReadingControls` clears the home indicator with `env(safe-area-inset-bottom)`.

**Playing by keyboard.** `SwapPassage` always aims at a word — the next one still to be solved, until the reader picks another — so `active` (a faint highlight, always on something) is separate from `choicesOpen` (the tooltip). A new passage opens its own choices after `AUTO_OPEN_MS` (2s) — long enough to read the text first — and any earlier move (hover, tap, key) brings them up immediately and cancels that timer, so it can't reopen choices the reader has just dismissed. The tooltip fades rather than grows, since it now arrives unprompted. `q`/`e` and the arrow keys step between unsolved words, wrapping; the arrows follow the writing direction, so in vertical mode Down and Left are forwards. The first option key press opens the choices rather than answering blind; a correct answer hands off to the next unsolved word after the success flash, while a wrong one stays put. A passage can be finished from the keyboard alone, and a test does exactly that. `SwapWord` exposes `choose()` through a ref so a key press runs the same path as a click, and the active word is scrolled into view. Key hints fade in after 3s of hovering one word, and once revealed they stay revealed — that's a `setting_changed` row (`keyHints`), so it survives a reload.

`App.js` owns the log and appends to it; it remounts `SwapPassage` with `key={passageId:attemptId}` — component-local swap state has to be discarded when the student switches passages or starts a new attempt, or the previous passage's solved words bleed through. Two effects keep the log honest: opening a passage with no attempt starts one, and solving the last word closes the attempt out.

`src/data/passages.json` is copied from the j201 repo's `data/reading_passages.json` — 15 passages, 62 lines. Each carries `stage` ("Stage 2-3", the real textbook chapter), `exercise` (normalized to two values), `section` (the two combined), `id`, `source_section`, plus `with_furigana` / `without_furigana` / `ruby_pairs`.

**Do not re-run the extractor to regenerate this.** `extract_reading_passage_v2.py` in the j201 repo reads past the end of each passage and swallows the "New vocabulary / Kanji / Kana / Meaning" table that follows — that contamination is what made a 62-line set into 604 lines, with table words becoming swap targets. The file here derives from a hand-repaired source. Teaching the extractor where a passage ends is the durable fix and lives in the j201 repo.

## Attribution

The passages are from *The Japanese Stage-Step Course* by **Wako Tawa（多和わ子）**, Japanese Language Program, Department of Asian Languages and Civilizations, Amherst College. The app credits this in its footer. The source carries "Copyright © 2026 by Wako Tawa. All rights reserved" — worth knowing before the passage set is widened or the site is promoted.

## Exercise Data

`extracted_exercise_data/` holds reading passages extracted from a textbook (Genki-style, J201 level), which serve as the reference format for generated exercises:

- `j201_reading_passages.jsonl` — one passage per line with keys `section`, `with_furigana`, `without_furigana`, `ruby_pairs`. Furigana is inline in parentheses after the kanji (e.g. `私(わたし)`), and `ruby_pairs` is a list of `[kanji, reading]` pairs in passage order.
- `sample_snippet_reading_passages.jsonl` — same idea but each line is a single variant (`variant` key: `with_furigana`/…) with a `text` field.
- `reading_with_furigana.txt` / `reading_no_furigana.txt` — plain-text passage samples.

`src/components/extraction_test.py` is a standalone BeautifulSoup script (not part of the React app) used to extract greeting/audio/meaning data from an Anki-style HTML export; it references a hard-coded local file path.
