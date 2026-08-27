// A one-word title and an emoji for each passage, keyed the way progress is:
// by a hash of the passage text, so regenerating passages.json from the
// extractor doesn't detach a title from what it names.
//
// Titles are kana rather than kanji on purpose — the rail must never show a
// character the exercise is asking the student to produce.
const PASSAGE_TITLES = {
  // school years, introductions
  'cqdpx': { title: 'がくねん', emoji: '🎓' },
  // teachers and family
  '1wf5dwm': { title: 'せんせい', emoji: '👨‍🏫' },
  // numbers, prices, times
  '135bu1y': { title: 'かず', emoji: '🔢' },
  // the islands of Japan
  '1s6ml12': { title: 'にほん', emoji: '🗾' },
  // a letter to Yamada
  'ynvurt': { title: 'てがみ', emoji: '✉️' },
  // a diary entry
  '1cnw0e7': { title: 'にっき', emoji: '📔' },
  // customs: entryways and slippers
  '1qskmc3': { title: 'しゅうかん', emoji: '🥿' },
  // Nancy Brown and her hobbies
  '1bmh3et': { title: 'しゅみ', emoji: '🎨' },
  // visiting a home, and what to bring
  'qkpqhs': { title: 'おみやげ', emoji: '🎁' },
  // the neighbourhood police box
  '1rmxy1i': { title: 'こうばん', emoji: '👮' },
  // doing two things at once
  '187pcm2': { title: 'ながらぞく', emoji: '🎧' },
  // how to take a Japanese bath
  'kj2llq': { title: 'おふろ', emoji: '🛁' },
  // a survey on modern stress
  '1uzd66s': { title: 'ちょうさ', emoji: '📊' },
  // Japanese as a world language
  'htmuuf': { title: 'にほんご', emoji: '🗣️' },
};

export default PASSAGE_TITLES;
