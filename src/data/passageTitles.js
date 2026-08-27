// A one-word title and an emoji for each passage, keyed the way progress is:
// by a hash of the passage text, so regenerating passages.json from the
// extractor doesn't detach a title from what it names.
//
// Titles are kana rather than kanji on purpose — the rail must never show a
// character the exercise is asking the student to produce.
const PASSAGE_TITLES = {
  // Stage 1-3 — school years, introductions
  'cqdpx': { title: 'がくねん', emoji: '🎓' },
  // Stage 1-3 — Kim and Smith: languages and where they are from
  '1tgbhty': { title: 'しゅっしん', emoji: '🌏' },
  // Stage 1-4 — teachers and family
  '1wf5dwm': { title: 'せんせい', emoji: '👨‍🏫' },
  // Stage 1-5 — numbers, prices, times
  '135bu1y': { title: 'かず', emoji: '🔢' },
  // Stage 1-5 — the islands of Japan
  'd3qxgn': { title: 'にほん', emoji: '🗾' },
  // Stage 1-6 — a letter to Yamada
  'lau0kf': { title: 'てがみ', emoji: '✉️' },
  // Stage 1-8 — a diary entry
  '1cnw0e7': { title: 'にっき', emoji: '📔' },
  // Stage 2-1 — customs: entryways and slippers
  '1vz7z3n': { title: 'しゅうかん', emoji: '🥿' },
  // Stage 2-2 — Nancy Brown and her hobbies
  '4n47o6': { title: 'しゅみ', emoji: '🎨' },
  // Stage 2-3 — visiting a home, and what to bring
  '19tjx2i': { title: 'おみやげ', emoji: '🎁' },
  // Stage 2-4 — the neighbourhood police box
  '1g2y3f8': { title: 'こうばん', emoji: '👮' },
  // Stage 2-5 — doing two things at once
  'm3v8rf': { title: 'ながらぞく', emoji: '🎧' },
  // Stage 2-6 — how to take a Japanese bath
  '13jpn09': { title: 'おふろ', emoji: '🛁' },
  // Stage 2-7 — a survey on modern stress
  '6eby4k': { title: 'ちょうさ', emoji: '📊' },
  // Stage 2-8 — Japanese as a world language
  'gl8ajl': { title: 'にほんご', emoji: '🗣️' },
};

export default PASSAGE_TITLES;
