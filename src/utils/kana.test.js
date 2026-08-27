import { isKana, toKana } from './kana';

test('converts plain romaji', () => {
  expect(toKana('watashi')).toBe('わたし');
  expect(toKana('nihongo')).toBe('にほんご');
});

test('handles the syllables that trip up a naive table', () => {
  expect(toKana('shitsumon')).toBe('しつもん');
  expect(toKana('chotto')).toBe('ちょっと');
  expect(toKana('gakkou')).toBe('がっこう');
  expect(toKana('kippu')).toBe('きっぷ');
});

test('turns a lone n into ん only when it can no longer become な', () => {
  expect(toKana('n')).toBe('ん');
  expect(toKana('na')).toBe('な');
  expect(toKana('nn')).toBe('ん');
  expect(toKana('hon')).toBe('ほん');
  expect(toKana('honda')).toBe('ほんだ');
  expect(toKana('hannin')).toBe('はんにん');
  expect(toKana('kinyou')).toBe('きにょう'); // ny is a digraph, not ん + や
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
