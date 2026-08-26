# KanjiSwap

A prototype for practising kanji in context. Instead of drilling characters on
flashcards, you read a short passage written entirely in hiragana and swap each
word back to the kanji it should be written with.

**Try it:** https://wmcnicho.github.io/kanjiswap

Words still waiting for their kanji are marked with a dotted underline. Click one
to see a few candidate kanji, pick the right one, and it replaces the kana in
place — green for a correct swap, red for a wrong guess.

## The exercises

The 14 passages come from a real JAPA201 (Genki-style) textbook, extracted with
the scripts in a companion repo. `src/data/passages.json` is that extractor's
`j201_reading_passages.jsonl` output as a JSON array so Create React App can
import it directly; regenerate it whenever the JSONL changes.

Each passage carries the text with inline furigana (`私(わたし)`), the same text
without it, and the kanji/reading pairs in passage order. The app parses the
furigana form to decide which words are swappable, and draws the wrong-answer
choices from the other kanji words in the same passage — so distractors are
always plausible for that text.

The longer-term goal is to generate exercises dynamically rather than shipping a
fixed set; the textbook passages are the reference format for what generated
exercises should look like.

## Running it locally

Requires Node 20 or newer.

```
npm ci      # install exactly what the lockfile pins
npm start   # dev server at http://localhost:3000
npm test    # Jest in interactive watch mode
npm run build
```

There is no separate lint step — ESLint (`react-app` config) runs as part of
`npm start` and `npm run build`.

## Deployment

Every push to `main` runs the test suite and, if it passes, publishes the
production build to GitHub Pages via `.github/workflows/deploy.yml`. Pull
requests run the same tests and build without deploying.

The `homepage` field in `package.json` is what makes the built asset paths work
under the `/kanjiswap` project-page path; changing the repo name means changing
that field too.

## Stack

React 18 and MUI v5 (Material UI with Emotion) on Create React App. No backend —
everything runs in the browser.
