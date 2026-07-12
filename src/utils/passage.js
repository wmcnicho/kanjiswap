// Matches a kanji word followed by its reading in parentheses, e.g. 私(わたし).
// The extracted data mixes ASCII and full-width parentheses, so accept both.
// Readings are pure hiragana (plus ー), which keeps ordinary parenthetical
// text like (flower) or （土） from being mistaken for furigana.
const FURIGANA_PATTERN = /([一-鿿々]+)[(（]([ぁ-ゖー]+)[)）]/g;

// Parses a with_furigana passage string into lines of segments.
// Each line is an array of segments:
//   { type: 'text', text }            plain text to render as-is
//   { type: 'swap', kanji, reading }  a word the student swaps from kana to kanji
// Adjacent pairs like 田(た)中(なか) are merged into one word (田中/たなか).
export function parsePassage(withFurigana) {
  return withFurigana.split('\n').map(parseLine);
}

function parseLine(line) {
  const segments = [];
  let lastIndex = 0;
  for (const match of line.matchAll(FURIGANA_PATTERN)) {
    const [, kanji, reading] = match;
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    }
    const previous = segments[segments.length - 1];
    if (previous && previous.type === 'swap' && match.index === lastIndex) {
      previous.kanji += kanji; // Merge with the adjacent pair
      previous.reading += reading;
    } else {
      segments.push({ type: 'swap', kanji, reading });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ type: 'text', text: line.slice(lastIndex) });
  }
  return segments;
}

// Builds a shuffled option list for one swap word: the correct kanji plus
// distractors drawn from the other kanji words in the same passage.
export function buildSwapOptions(correctItem, passageWords, count = 3) {
  const pool = [...new Set(passageWords)].filter((word) => word !== correctItem);
  const distractors = shuffle(pool).slice(0, count - 1);
  return shuffle([correctItem, ...distractors]);
}

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
