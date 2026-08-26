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

## Deployment

The app is hosted free on GitHub Pages at https://wmcnicho.github.io/kanjiswap. `.github/workflows/ci.yml` tests and builds every pull request; `.github/workflows/deploy.yml` repeats that on `main` and publishes `build/` via the official Pages actions (OIDC — no `gh-pages` branch, no deploy key). The `homepage` field in `package.json` is what makes assets resolve under the `/kanjiswap` project-page path; renaming the repo means changing it.

## Architecture

React 18 + MUI v5 (Material UI with Emotion). Entry is `src/index.js` → `src/App.js`.

`src/theme.js` builds the MUI theme around whichever Japanese face is selected (`FONTS`: Noto Sans JP, Klee One, Noto Serif JP, Zen Maru Gothic — loaded from Google Fonts in `public/index.html`, which serves them split by unicode range so only rendered glyphs download). The palette is deliberately quiet — paper ground, near-black text, one green and one red — so the passage is the only thing with visual weight. The selected font is a *setting event* in the log, not separate state.

The flow: `App.js` renders a sidebar of the learning path plus the passage on screen, and owns the event log for every passage.

- `src/utils/curriculum.js` — groups the flat passage list into the chapters the sidebar shows, and normalizes the section labels for display. The extracted data has three spellings of "Reading Practice (Sentences)" and puts Discourse Practice under two chapters; `exerciseTypeOf` canonicalizes them and `chapterOf` reads the leading number. **This is a display-side patch — the real fix belongs in the extractor in the j201 repo**, and this code costs nothing once that lands. `previewOf` takes the opening kana of a passage, which is what distinguishes ten passages sharing one section name.
- `src/utils/passage.js` — `parsePassage(withFurigana)` turns a passage string with inline furigana into lines of segments (`{type: 'text'}` / `{type: 'swap', kanji, reading}`), merging adjacent pairs like `田(た)中(なか)` into one word. It accepts both ASCII and full-width parentheses (the data mixes them) and requires pure-hiragana readings so real parenthetical text like `(flower)` is left alone. `buildSwapOptions` builds each word's shuffled choice list, drawing distractors from other kanji words in the same passage.
- `src/utils/progress.js` — the browser-side **event log** (`localStorage`, key `kanjiswap.progress.v2`). Every solve, miss, attempt start, and completion is one append-only row carrying `id`, `seq`, `at`, `msSincePrevious`, `passageId`, `attemptId`, `wordKey`, `kanji`, and — for a miss — the `chosen` distractor. Nothing is overwritten, because this data is headed for a database later; `exportStore` dumps it as JSON for that. The log is capped at `MAX_EVENTS` with the oldest rows pruned and counted (`prunedEvents`). `passageKey` hashes the passage text so history survives passages.json being regenerated or reordered; `wordKey` is `line.segment.kanji`. Reads are defensive — storage access itself throws in Safari private mode, and stored JSON is untrusted. A v1 store is replayed into events marked `imported: true`.

  **Everything derived is folded, never stored.** `deriveState(store)` reduces the log into `{passages, kanji, totals}`; score, streaks, per-kanji miss counts, and attempt history all come out of that fold, so changing the scoring rules reprices existing history instead of stranding it. Scoring is points-based: `pointsFor(firstTry, streakBefore)` pays a base for any solve, a bonus for a first-try solve, and a streak bonus that caps out — persistence alone shouldn't score like recall.
- `SwapPassage.jsx` — parses a passage once (memoized so options don't reshuffle), attaches each swap word's progress key, and renders text segments inline with `SwapWord`s. With `vertical`, the container switches to `writing-mode: vertical-rl`: block flow turns with the writing mode, so lines stack right-to-left with no per-line work, and the overflow axis turns with it. Tooltips move to the left of the word in that mode.
- `SwapWord.jsx` — shows a word's hiragana reading (dotted underline) wrapped in a MUI `Tooltip` of swap choices; state-driven flash green/replace-with-kanji on success, flash red on failure. Multiple instances coexist (state is per-component, no DOM ids). Reports every click up via `onAttempt`. A swapped-in word renders as `<ruby>` with its reading in an `<rt>` that holds for ~2.2s then fades over 900ms — the `rt` stays in the layout at `opacity: 0` so the line doesn't reflow, and ruby positions itself correctly in both writing modes. A word restored from saved history gets neither flash nor furigana: both belong to the click that earned them.
- `SwapOptions.jsx` — the tooltip content: a grid of candidate kanji; clicking one validates against `correctItem` and calls the success/failure handler.
- `ReadingControls.jsx` — the reading settings parked bottom-right at 45% opacity until hovered: the font picker (each face naming itself in its own type) and the 縦/横 writing-direction toggle. Both are `setting_changed` events, so they restore on reload and are timestamped in the log.
- `PassageNav.jsx` — the sidebar: chapters that collapse, each passage a progress bar over its opening kana. A tick means finished at least once; the bar tracks the attempt in progress, so it resets when the student tries again. Rendered into two MUI `Drawer`s — permanent from `md` up, temporary behind a ☰ button below it.
- `PassageProgress.jsx` — the tally under a passage (solved/total, points, streak, wrong guesses) and, once the passage is finished, the **Try again** button and how it has gone before. Try again is deliberately absent mid-passage: it starts a fresh attempt rather than erasing anything, since the finished run stays in history.

`App.js` owns the log and appends to it; it remounts `SwapPassage` with `key={passageId:attemptId}` — component-local swap state has to be discarded when the student switches passages or starts a new attempt, or the previous passage's solved words bleed through. Two effects keep the log honest: opening a passage with no attempt starts one, and solving the last word closes the attempt out.

`src/data/passages.json` is generated from `extracted_exercise_data/j201_reading_passages.jsonl` (same objects, as a JSON array, so CRA can import it). Regenerate it if the JSONL changes.

## Exercise Data

`extracted_exercise_data/` holds reading passages extracted from a textbook (Genki-style, J201 level), which serve as the reference format for generated exercises:

- `j201_reading_passages.jsonl` — one passage per line with keys `section`, `with_furigana`, `without_furigana`, `ruby_pairs`. Furigana is inline in parentheses after the kanji (e.g. `私(わたし)`), and `ruby_pairs` is a list of `[kanji, reading]` pairs in passage order.
- `sample_snippet_reading_passages.jsonl` — same idea but each line is a single variant (`variant` key: `with_furigana`/…) with a `text` field.
- `reading_with_furigana.txt` / `reading_no_furigana.txt` — plain-text passage samples.

`src/components/extraction_test.py` is a standalone BeautifulSoup script (not part of the React app) used to extract greeting/audio/meaning data from an Anki-style HTML export; it references a hard-coded local file path.
