import { finalizeKana, isKana, toKana } from './kana';

test('converts plain romaji', () => {
  expect(toKana('watashi')).toBe('わたし');
  expect(toKana('nihongo')).toBe('にほんご');
});

test('handles the syllables that trip up a naive table', () => {
  expect(finalizeKana('shitsumon')).toBe('しつもん'); // trailing n settles on submission
  expect(toKana('chotto')).toBe('ちょっと');
  expect(toKana('gakkou')).toBe('がっこう');
  expect(toKana('kippu')).toBe('きっぷ');
});

test('turns a lone n into ん only when it can no longer become な', () => {
  expect(toKana('na')).toBe('な');
  expect(toKana('nn')).toBe('ん');
  expect(toKana('honda')).toBe('ほんだ');
  expect(finalizeKana('hannin')).toBe('はんにん');
  expect(toKana('kinyou')).toBe('きにょう'); // ny is a digraph, not ん + や
});

test('holds a trailing n back, because the next key decides what it is', () => {
  // "ichin" must not commit to いちん: the next key makes it ねんせい. Every
  // keystroke rewrites the field, so a guess here can never be taken back.
  expect(toKana('n')).toBe('n');
  expect(toKana('ichin')).toBe('いちn');
  expect(toKana('ichine')).toBe('いちね');
  expect(toKana('hon')).toBe('ほn');
});

test('settles a trailing n when the answer is offered as final', () => {
  expect(finalizeKana('hon')).toBe('ほん');
  expect(finalizeKana('ん')).toBe('ん');
  expect(finalizeKana('honn')).toBe('ほん');
  expect(finalizeKana('ichinensei')).toBe('いちねんせい');
});

test('converts the same way whether typed at once or one key at a time', () => {
  // The field feeds its own converted value back in on every keystroke, so
  // conversion has to be stable under that.
  for (const [romaji, expected] of [
    ['ichinensei', 'いちねんせい'],
    ['ichinennsei', 'いちねんせい'],
    ['sensei', 'せんせい'],
    ['shinbun', 'しんぶん'],
    ['nihongo', 'にほんご'],
    ['ganbatte', 'がんばって'],
  ]) {
    let field = '';
    for (const character of romaji) {
      field = toKana(field + character);
    }
    expect(finalizeKana(field)).toBe(expected);
  }
});

test('leaves half-typed romaji visible instead of eating it', () => {
  expect(toKana('watashiw')).toBe('わたしw');
  expect(toKana('ky')).toBe('ky');
});

test('passes kana straight through, so an IME still works', () => {
  expect(toKana('わたし')).toBe('わたし');
  expect(toKana('わたshi')).toBe('わたし'); // and the two mix
});

test('accepts either romanisation of the awkward ones', () => {
  expect(toKana('shashin')).toBe(toKana('syashin'));
  expect(toKana('chizu')).toBe(toKana('tizu'));
  expect(toKana('fujisan')).toBe(toKana('huzisan'));
});

test('recognises a finished kana answer', () => {
  expect(isKana('わたし')).toBe(true);
  expect(isKana('コーヒー')).toBe(false); // katakana isn't what's being asked for
  expect(isKana('watashi')).toBe(false);
  expect(isKana('')).toBe(false);
});
