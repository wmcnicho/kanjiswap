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

The flow: `App.js` lets the student pick a passage (from `src/data/passages.json`), renders it as a `SwapPassage`, and owns the progress state for every passage.

- `src/utils/passage.js` — `parsePassage(withFurigana)` turns a passage string with inline furigana into lines of segments (`{type: 'text'}` / `{type: 'swap', kanji, reading}`), merging adjacent pairs like `田(た)中(なか)` into one word. It accepts both ASCII and full-width parentheses (the data mixes them) and requires pure-hiragana readings so real parenthetical text like `(flower)` is left alone. `buildSwapOptions` builds each word's shuffled choice list, drawing distractors from other kanji words in the same passage.
- `src/utils/progress.js` — the browser-side progress store (`localStorage`, key `kanjiswap.progress.v1`). Shape is `{[passageKey]: {[wordKey]: {solved, misses}}}`. `passageKey` hashes the passage text so progress survives passages.json being regenerated or reordered; `wordKey` is `line.segment.kanji`. Every read is defensive — storage access itself throws in Safari private mode, and stored JSON is untrusted. Updates are pure functions returning new objects (`recordAttempt`, `resetPassage`, `passageStats`).
- `SwapPassage.jsx` — parses a passage once (memoized so options don't reshuffle), attaches each swap word's progress key, and renders text segments inline with `SwapWord`s.
- `SwapWord.jsx` — shows a word's hiragana reading (dotted underline) wrapped in a MUI `Tooltip` of swap choices; state-driven flash green/replace-with-kanji on success, flash red on failure. Multiple instances coexist (state is per-component, no DOM ids). A word restored from saved progress renders as kanji immediately, with no flash. Reports every click up via `onAttempt`.
- `SwapOptions.jsx` — the tooltip content: a grid of candidate kanji; clicking one validates against `correctItem` and calls the success/failure handler.
- `PassageProgress.jsx` — the tally under a passage (solved/total, wrong guesses, accuracy) plus its reset button.

`App.js` remounts `SwapPassage` with `key={passageKey:resetCount}` — component-local swap state has to be discarded when the student switches passages or resets one, or the previous passage's solved words bleed through.

`src/data/passages.json` is generated from `extracted_exercise_data/j201_reading_passages.jsonl` (same objects, as a JSON array, so CRA can import it). Regenerate it if the JSONL changes.

## Exercise Data

`extracted_exercise_data/` holds reading passages extracted from a textbook (Genki-style, J201 level), which serve as the reference format for generated exercises:

- `j201_reading_passages.jsonl` — one passage per line with keys `section`, `with_furigana`, `without_furigana`, `ruby_pairs`. Furigana is inline in parentheses after the kanji (e.g. `私(わたし)`), and `ruby_pairs` is a list of `[kanji, reading]` pairs in passage order.
- `sample_snippet_reading_passages.jsonl` — same idea but each line is a single variant (`variant` key: `with_furigana`/…) with a `text` field.
- `reading_with_furigana.txt` / `reading_no_furigana.txt` — plain-text passage samples.

`src/components/extraction_test.py` is a standalone BeautifulSoup script (not part of the React app) used to extract greeting/audio/meaning data from an Anki-style HTML export; it references a hard-coded local file path.
