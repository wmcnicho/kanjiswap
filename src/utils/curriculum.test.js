import { buildCurriculum, chapterOf, exerciseTypeOf, previewOf, titleOf } from './curriculum';
import passages from '../data/passages.json';

test('reads the chapter number off a section label', () => {
  expect(chapterOf('3: Discourse Practice (Reading)')).toBe(3);
  expect(chapterOf('no number here')).toBeNull();
});

test('normalizes the three spellings the extractor produces', () => {
  const spellings = [
    '2: Reading practice (sentences)',
    '2: Reading Practice (Sentences)',
    '2: Reading Practices (Sentences)',
  ];
  expect(new Set(spellings.map(exerciseTypeOf)).size).toBe(1);
  expect(exerciseTypeOf(spellings[0])).toBe('Reading Practice');
});

test('previews a passage as the student sees it, in kana', () => {
  expect(previewOf({ with_furigana: '私(わたし)は本(ほん)を読(よ)む' })).toBe('わたしはほんをよむ');
});

test('never previews the kanji the student is meant to supply', () => {
  // `without_furigana` is the kanji text, not the kana text — previewing it
  // would print the answers in the sidebar.
  const preview = previewOf({
    with_furigana: '私(わたし)は本(ほん)を読(よ)む',
    without_furigana: '私は本を読む',
  });
  expect(preview).not.toMatch(/私|本|読/);
});

test('skips a textbook instruction line written in English', () => {
  const preview = previewOf({
    with_furigana: 'The following sentences are identical to those above.\n私(わたし)は本(ほん)を読(よ)む',
  });
  expect(preview).toBe('わたしはほんをよむ');
});

test('truncates a long opening line', () => {
  expect(previewOf({ with_furigana: '田(た)中(なか)先生(せんせい)は大学(だいがく)の先生(せんせい)です。' }))
    .toBe('たなかせんせいはだいがくのせ…');
});

test('groups passages into chapters and keeps their original indices', () => {
  const chapters = buildCurriculum([
    { section: '3: Discourse Practice (Reading)', with_furigana: '本(ほん)', without_furigana: 'ほん' },
    { section: '2: Reading practice (sentences)', with_furigana: '私(わたし)', without_furigana: 'わたし' },
    { section: '2: Reading Practice (Sentences)', with_furigana: '花(はな)', without_furigana: 'はな' },
  ]);

  expect(chapters.map((chapter) => chapter.chapter)).toEqual([2, 3]);
  expect(chapters[0].passages.map((passage) => passage.index)).toEqual([1, 2]);
  expect(chapters[0].label).toBe('Chapter 2 · Reading Practice');
});

test('labels a chapter with mixed exercise types by number alone', () => {
  const [chapter] = buildCurriculum([
    { section: '4: Discourse Practice (Reading)', with_furigana: '本(ほん)', without_furigana: 'ほん' },
    { section: '4: Reading Practice (Sentences)', with_furigana: '私(わたし)', without_furigana: 'わたし' },
  ]);
  expect(chapter.label).toBe('Chapter 4');
});

test('counts the swappable words in a passage', () => {
  const [chapter] = buildCurriculum([
    { section: '2: Reading Practice', with_furigana: '私(わたし)は本(ほん)を読(よ)む', without_furigana: 'わたしはほんをよむ' },
  ]);
  expect(chapter.passages[0].wordCount).toBe(3);
});

test('every shipped passage has a title of its own', () => {
  // The fallback keeps the rail from going blank, but no passage in the data
  // should be relying on it.
  for (const passage of passages) {
    const { title, emoji } = titleOf(passage);
    expect(emoji).toBeTruthy();
    expect(title).not.toBe(previewOf(passage));
  }
});

test('titles are one word, not a sentence', () => {
  for (const passage of passages) {
    expect(titleOf(passage).title).not.toMatch(/[。、\s]/);
  }
});

test('falls back to the opening line for a passage nobody has named', () => {
  const unnamed = { with_furigana: '新(あたら)しい文(ぶん)です。' };
  expect(titleOf(unnamed)).toEqual({ title: 'あたらしいぶんです。', emoji: null });
});
