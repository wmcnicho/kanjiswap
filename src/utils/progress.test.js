import {
  STORAGE_KEY,
  loadProgress,
  passageKey,
  passageStats,
  recordAttempt,
  resetPassage,
  saveProgress,
  wordKey,
} from './progress';

beforeEach(() => {
  window.localStorage.clear();
});

test('keys a passage by its text, not its position', () => {
  const passage = { with_furigana: '私(わたし)です。' };
  expect(passageKey(passage)).toBe(passageKey({ ...passage, section: 'moved' }));
  expect(passageKey(passage)).not.toBe(passageKey({ with_furigana: '僕(ぼく)です。' }));
});

test('records a solve and a miss on the same word', () => {
  const word = wordKey(0, 0, '私');
  let progress = recordAttempt({}, 'p1', word, false);
  progress = recordAttempt(progress, 'p1', word, false);
  progress = recordAttempt(progress, 'p1', word, true);
  expect(progress.p1[word]).toEqual({ solved: true, misses: 2 });
});

test('leaves the previous progress object untouched', () => {
  const before = recordAttempt({}, 'p1', 'w1', true);
  const after = recordAttempt(before, 'p1', 'w2', true);
  expect(Object.keys(before.p1)).toEqual(['w1']);
  expect(Object.keys(after.p1)).toEqual(['w1', 'w2']);
});

test('reports solved count, misses, and accuracy', () => {
  let progress = recordAttempt({}, 'p1', 'w1', true);
  progress = recordAttempt(progress, 'p1', 'w2', false);
  progress = recordAttempt(progress, 'p1', 'w2', true);
  expect(passageStats(progress, 'p1', 3)).toEqual({
    solved: 2,
    total: 3,
    misses: 1,
    accuracy: 2 / 3,
    complete: false,
  });
});

test('marks a passage complete once every word is solved', () => {
  const progress = recordAttempt({}, 'p1', 'w1', true);
  expect(passageStats(progress, 'p1', 1).complete).toBe(true);
});

test('reports an untouched passage as empty with no accuracy yet', () => {
  expect(passageStats({}, 'unseen', 4)).toEqual({
    solved: 0,
    total: 4,
    misses: 0,
    accuracy: null,
    complete: false,
  });
});

test('resetting one passage leaves the others alone', () => {
  let progress = recordAttempt({}, 'p1', 'w1', true);
  progress = recordAttempt(progress, 'p2', 'w1', true);
  const reset = resetPassage(progress, 'p1');
  expect(reset.p1).toBeUndefined();
  expect(reset.p2).toBeDefined();
});

test('round-trips through browser storage', () => {
  const progress = recordAttempt({}, 'p1', 'w1', true);
  saveProgress(progress);
  expect(loadProgress()).toEqual(progress);
});

test('treats unreadable stored progress as a fresh start', () => {
  window.localStorage.setItem(STORAGE_KEY, 'not json');
  expect(loadProgress()).toEqual({});
  window.localStorage.setItem(STORAGE_KEY, '["unexpected shape"]');
  expect(loadProgress()).toEqual({});
});

test('survives a stored record with a nonsense miss count', () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ p1: { w1: { solved: true, misses: 'lots' } } }));
  expect(passageStats(loadProgress(), 'p1', 1)).toMatchObject({ solved: 1, misses: 0 });
});
