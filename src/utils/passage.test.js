import { parsePassage, buildSwapOptions } from './passage';

test('parses a line into text and swap segments', () => {
  const [segments] = parsePassage('私(わたし)は一年生(いちねんせい)です。');
  expect(segments).toEqual([
    { type: 'swap', kanji: '私', reading: 'わたし' },
    { type: 'text', text: 'は' },
    { type: 'swap', kanji: '一年生', reading: 'いちねんせい' },
    { type: 'text', text: 'です。' },
  ]);
});

test('merges adjacent furigana pairs into one word', () => {
  const [segments] = parsePassage('田(た)中(なか)さん');
  expect(segments).toEqual([
    { type: 'swap', kanji: '田中', reading: 'たなか' },
    { type: 'text', text: 'さん' },
  ]);
});

test('handles full-width parentheses and leaves plain parentheticals alone', () => {
  const [segments] = parsePassage('花（はな）(flower)です');
  expect(segments).toEqual([
    { type: 'swap', kanji: '花', reading: 'はな' },
    { type: 'text', text: '(flower)です' },
  ]);
});

test('splits passages into lines', () => {
  const lines = parsePassage('私(わたし)です。\n僕(ぼく)です。');
  expect(lines).toHaveLength(2);
});

test('builds options containing the correct item and distractors', () => {
  const options = buildSwapOptions('今日', ['今日', '明日', '昨日', '毎日']);
  expect(options).toHaveLength(3);
  expect(options).toContain('今日');
  expect(new Set(options).size).toBe(3);
});
