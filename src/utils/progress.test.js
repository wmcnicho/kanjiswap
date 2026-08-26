import {
  EVENT,
  LEGACY_STORAGE_KEY,
  MAX_EVENTS,
  POINTS,
  STORAGE_KEY,
  appendEvent,
  createStore,
  deriveState,
  exportStore,
  isSolved,
  loadStore,
  missesFor,
  passageKey,
  passageStats,
  pointsFor,
  wordKey,
} from './progress';

beforeEach(() => {
  window.localStorage.clear();
});

// Builds a log the way the app does: an attempt, then clicks.
function log(...steps) {
  return steps.reduce(
    (store, [type, payload]) => appendEvent(store, type, payload),
    createStore('install_test')
  );
}

const started = [EVENT.attemptStarted, { passageId: 'p1', attemptId: 'a1', wordCount: 2 }];
const solvedFirstTry = [EVENT.wordSolved, { passageId: 'p1', attemptId: 'a1', wordKey: 'w1', kanji: '私', firstTry: true }];
const missed = [EVENT.wordMissed, { passageId: 'p1', attemptId: 'a1', wordKey: 'w2', kanji: '本', chosen: '木' }];
const solvedAfterMiss = [EVENT.wordSolved, { passageId: 'p1', attemptId: 'a1', wordKey: 'w2', kanji: '本', firstTry: false }];

test('keys a passage by its text, not its position', () => {
  const passage = { with_furigana: '私(わたし)です。' };
  expect(passageKey(passage)).toBe(passageKey({ ...passage, section: 'moved' }));
  expect(passageKey(passage)).not.toBe(passageKey({ with_furigana: '僕(ぼく)です。' }));
});

test('stamps every event with an id, a sequence, and a time', () => {
  const store = log(started, solvedFirstTry);
  const [first, second] = store.events;
  expect(first.id).toBe('install_test:1');
  expect(second.seq).toBe(2);
  expect(Date.parse(second.at)).not.toBeNaN();
  expect(first.msSincePrevious).toBeNull();
  expect(second.msSincePrevious).toBeGreaterThanOrEqual(0);
});

test('keeps the payload of each event for later analysis', () => {
  const store = log(started, missed);
  expect(store.events[1]).toMatchObject({
    type: EVENT.wordMissed,
    passageId: 'p1',
    wordKey: 'w2',
    kanji: '本',
    chosen: '木', // which distractor tempted them
  });
});

test('drops the oldest events once the log is full, and counts what it dropped', () => {
  let store = createStore('install_test');
  for (let index = 0; index < MAX_EVENTS + 5; index++) {
    store = appendEvent(store, EVENT.wordMissed, { passageId: 'p1', wordKey: `w${index}` });
  }
  expect(store.events).toHaveLength(MAX_EVENTS);
  expect(store.prunedEvents).toBe(5);
  expect(store.events[0].wordKey).toBe('w5');
});

test('scores a first-try solve above a recovered one', () => {
  expect(pointsFor(false, 0)).toBe(POINTS.solve);
  expect(pointsFor(true, 0)).toBe(POINTS.solve + POINTS.firstTry);
});

test('pays a streak bonus that stops growing at the cap', () => {
  expect(pointsFor(true, 2)).toBe(POINTS.solve + POINTS.firstTry + 2 * POINTS.streakStep);
  expect(pointsFor(true, 99)).toBe(POINTS.solve + POINTS.firstTry + POINTS.maxStreakBonus);
});

test('builds a streak from first-try solves and breaks it on a miss', () => {
  const state = deriveState(log(
    started,
    solvedFirstTry,
    [EVENT.wordSolved, { passageId: 'p1', attemptId: 'a1', wordKey: 'w3', kanji: '中', firstTry: true }],
    missed,
  ));
  expect(state.totals.bestStreak).toBe(2);
  expect(state.totals.streak).toBe(0); // the miss broke it
});

test('tracks solved words and misses within the open attempt', () => {
  const state = deriveState(log(started, missed, solvedAfterMiss));
  expect(isSolved(state, 'p1', 'w2')).toBe(true);
  expect(missesFor(state, 'p1', 'w2')).toBe(1);
  expect(passageStats(state, 'p1', 2)).toMatchObject({ solved: 1, misses: 1, complete: false });
});

test('counts a passage complete when every word is solved', () => {
  const state = deriveState(log(started, solvedFirstTry, solvedAfterMiss));
  expect(passageStats(state, 'p1', 2).complete).toBe(true);
});

test('keeps a finished attempt in history and starts the next one clean', () => {
  const state = deriveState(log(
    started,
    solvedFirstTry,
    missed,
    solvedAfterMiss,
    [EVENT.attemptCompleted, { passageId: 'p1', attemptId: 'a1' }],
    [EVENT.attemptStarted, { passageId: 'p1', attemptId: 'a2', wordCount: 2 }],
  ));
  const stats = passageStats(state, 'p1', 2);
  expect(stats.timesCompleted).toBe(1);
  expect(stats.history[0]).toMatchObject({ attemptId: 'a1', outcome: 'completed', solved: 2, misses: 1 });
  expect(stats.solved).toBe(0); // the new attempt starts empty
  expect(stats.bestPoints).toBeGreaterThan(0); // but the old score is remembered
});

test('archives an attempt that was never finished', () => {
  const state = deriveState(log(
    started,
    solvedFirstTry,
    [EVENT.attemptStarted, { passageId: 'p1', attemptId: 'a2', wordCount: 2 }],
  ));
  expect(passageStats(state, 'p1', 2).history[0]).toMatchObject({ outcome: 'abandoned', solved: 1 });
});

test('counts how each kanji has gone, across attempts', () => {
  const state = deriveState(log(started, missed, solvedAfterMiss, solvedFirstTry));
  expect(state.kanji['本']).toEqual({ solved: 1, firstTry: 0, missed: 1 });
  expect(state.kanji['私']).toEqual({ solved: 0, firstTry: 1, missed: 0 });
});

test('reports an untouched passage as empty', () => {
  expect(passageStats(deriveState(createStore()), 'unseen', 4)).toMatchObject({
    solved: 0, total: 4, misses: 0, points: 0, complete: false, timesCompleted: 0,
  });
});

test('round-trips through browser storage', () => {
  const store = log(started, solvedFirstTry);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  expect(loadStore()).toEqual(store);
});

test('treats an unreadable log as a fresh start', () => {
  window.localStorage.setItem(STORAGE_KEY, 'not json');
  expect(loadStore().events).toEqual([]);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
  expect(loadStore().events).toEqual([]);
});

test('replays v1 progress so early testers keep their history', () => {
  window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
    p1: { [wordKey(0, 0, '私')]: { solved: true, misses: 2 } },
  }));

  const state = deriveState(loadStore());

  expect(isSolved(state, 'p1', wordKey(0, 0, '私'))).toBe(true);
  expect(missesFor(state, 'p1', wordKey(0, 0, '私'))).toBe(2);
  expect(state.totals.firstTrySolves).toBe(0); // it took two misses, and that survives
});

test('marks replayed events so their timing is not mistaken for real', () => {
  window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ p1: { w1: { solved: true, misses: 0 } } }));
  expect(loadStore().events.every((event) => event.imported === true)).toBe(true);
});

test('exports the log for loading somewhere else later', () => {
  const exported = JSON.parse(exportStore(log(started, solvedFirstTry)));
  expect(exported).toMatchObject({ installId: 'install_test', version: 2, prunedEvents: 0 });
  expect(exported.events).toHaveLength(2);
  expect(Date.parse(exported.exportedAt)).not.toBeNaN();
});
