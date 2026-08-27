// What a student does is recorded as an append-only event log rather than a
// snapshot of their current state. Every solve, miss, and reset is one
// timestamped row, so nothing a student did is overwritten by what they did
// next — and the same rows can move to a database later without a reshape.
// Everything derived (score, streaks, which kanji keep getting missed) is
// folded out of the log by `deriveState`, never stored.

export const STORAGE_KEY = 'kanjiswap.progress.v2';
export const LEGACY_STORAGE_KEY = 'kanjiswap.progress.v1';

// localStorage allows a few MB and an event is roughly 200 bytes. Oldest rows
// are dropped first and counted, so an export can say what it's missing.
export const MAX_EVENTS = 5000;

// Which way round the exercise runs. Rows carry it; anything logged before the
// reading exercise existed is kana-to-kanji by definition.
export const DIRECTION = {
  toKanji: 'to_kanji',   // read the kana, supply the kanji
  toReading: 'to_reading', // read the kanji, type the reading
};

export const EVENT = {
  attemptStarted: 'attempt_started',
  wordSolved: 'word_solved',
  wordMissed: 'word_missed',
  attemptCompleted: 'attempt_completed',
  attemptAbandoned: 'attempt_abandoned',
  settingChanged: 'setting_changed',
};

// Points reward recall, not persistence: clicking every option eventually
// solves a word, but only a first-try solve earns the bonus, and only an
// unbroken run of them builds a streak.
export const POINTS = { solve: 10, firstTry: 5, streakStep: 2, maxStreakBonus: 10 };

export function pointsFor(firstTry, streakBefore) {
  if (!firstTry) {
    return POINTS.solve;
  }
  const bonus = Math.min(streakBefore * POINTS.streakStep, POINTS.maxStreakBonus);
  return POINTS.solve + POINTS.firstTry + bonus;
}

// Identifies a passage by its text, so regenerating passages.json from the
// extractor or reordering the list doesn't strand anyone's history.
export function passageKey(passage) {
  const text = passage.with_furigana ?? '';
  let hash = 5381;
  for (let index = 0; index < text.length; index++) {
    hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

// Identifies one swappable word within a passage. The kanji is part of the key
// so an edited passage retires the old entry instead of mislabelling a word.
export function wordKey(lineIndex, segmentIndex, kanji) {
  return `${lineIndex}.${segmentIndex}.${kanji}`;
}

export function createStore(installId = newId('install')) {
  return { version: 2, installId, nextEventId: 1, prunedEvents: 0, events: [] };
}

// Ids are only unique within one browser; the installId is what makes them
// unique once several browsers' logs land in the same table.
export function newId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

// Appends one row, stamping the fields every row carries. Timing is recorded
// as a delta as well as a timestamp — how long a word took is the kind of
// thing you can't reconstruct after the fact.
export function appendEvent(store, type, payload = {}, now = Date.now()) {
  const previous = store.events[store.events.length - 1];
  const event = {
    id: `${store.installId}:${store.nextEventId}`,
    seq: store.nextEventId,
    type,
    at: new Date(now).toISOString(),
    msSincePrevious: previous ? now - Date.parse(previous.at) : null,
    ...payload,
  };
  const events = [...store.events, event];
  const overflow = Math.max(0, events.length - MAX_EVENTS);
  return {
    ...store,
    nextEventId: store.nextEventId + 1,
    prunedEvents: store.prunedEvents + overflow,
    events: overflow > 0 ? events.slice(overflow) : events,
  };
}

export function loadStore() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.version === 2 && Array.isArray(parsed.events)) {
        return parsed;
      }
    }
    return migrateLegacy();
  } catch {
    // Storage access itself throws in Safari private mode, and anything
    // already stored is untrusted. Either way, start clean rather than break.
    return createStore();
  }
}

export function saveStore(store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Out of quota or storage denied. The session still works; it just won't
    // survive a reload, which beats losing the exercise.
  }
}

// The v1 store kept only `{solved, misses}` per word, with no timestamps. Those
// are replayed as one imported attempt per passage so early testers keep their
// progress; `imported: true` marks rows whose timing is not real.
export function migrateLegacy(now = Date.now()) {
  const store = createStore();
  let legacy;
  try {
    legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null');
  } catch {
    return store;
  }
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) {
    return store;
  }

  return Object.entries(legacy).reduce((current, [passageId, words]) => {
    if (!words || typeof words !== 'object') {
      return current;
    }
    const attemptId = newId('attempt');
    let next = appendEvent(current, EVENT.attemptStarted, { passageId, attemptId, imported: true }, now);
    for (const [word, record] of Object.entries(words)) {
      const misses = Number.isFinite(record?.misses) && record.misses > 0 ? record.misses : 0;
      for (let index = 0; index < misses; index++) {
        next = appendEvent(next, EVENT.wordMissed, { passageId, attemptId, wordKey: word, imported: true }, now);
      }
      if (record?.solved === true) {
        next = appendEvent(next, EVENT.wordSolved, {
          passageId, attemptId, wordKey: word, firstTry: misses === 0, imported: true,
        }, now);
      }
    }
    return next;
  }, store);
}

// A JSON export of the whole log, for loading into a database later. Kept
// separate from the storage format so the two can diverge.
export function exportStore(store) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    installId: store.installId,
    version: store.version,
    prunedEvents: store.prunedEvents,
    events: store.events,
  }, null, 2);
}

// --- Derived state -------------------------------------------------------
// Folded fresh from the log on every change. Nothing here is persisted, so a
// scoring change reprices existing history instead of leaving it stale.
//
// Each passage is tracked once per direction: finishing it kana-to-kanji says
// nothing about whether you can read it the other way round.

export function deriveState(store) {
  return (store?.events ?? []).reduce(applyEvent, emptyState());
}

function emptyState() {
  return {
    passages: {},
    kanji: {},
    settings: {},
    totals: {
      points: 0, solved: 0, misses: 0, firstTrySolves: 0,
      passagesCompleted: 0, streak: 0, bestStreak: 0,
    },
  };
}

function directionOf(event) {
  return event.direction ?? DIRECTION.toKanji;
}

function applyEvent(state, event) {
  switch (event.type) {
    case EVENT.attemptStarted:
      return startAttempt(state, event);
    case EVENT.wordSolved:
      return solveWord(state, event);
    case EVENT.wordMissed:
      return missWord(state, event);
    case EVENT.attemptCompleted:
      return completeAttempt(state, event);
    case EVENT.attemptAbandoned:
      return archiveAttempt(state, event, 'abandoned');
    case EVENT.settingChanged:
      // Settings ride in the same log: when a student switched font or writing
      // direction is worth knowing alongside how they were scoring at the time.
      return { ...state, settings: { ...state.settings, [event.setting]: event.value } };
    default:
      return state; // Unknown row types are kept in the log but ignored here.
  }
}

function passageOf(state, passageId, direction) {
  return state.passages[passageId]?.[direction] ?? {
    attempt: null, history: [], timesCompleted: 0, bestPoints: 0, lastPlayedAt: null,
  };
}

function withPassage(state, passageId, direction, passage) {
  return {
    ...state,
    passages: {
      ...state.passages,
      [passageId]: { ...state.passages[passageId], [direction]: passage },
    },
  };
}

function startAttempt(state, event) {
  const direction = directionOf(event);
  const previous = passageOf(state, event.passageId, direction);
  // An attempt left open (the tab closed mid-passage) is archived rather than
  // silently replaced, so the log still shows it happened.
  const base = previous.attempt && !previous.attempt.completedAt
    ? passageOf(archiveAttempt(state, event, 'abandoned'), event.passageId, direction)
    : previous;

  return withPassage(state, event.passageId, direction, {
    ...base,
    lastPlayedAt: event.at,
    attempt: {
      attemptId: event.attemptId,
      startedAt: event.at,
      completedAt: null,
      words: {},
      solved: 0,
      misses: 0,
      firstTrySolves: 0,
      points: 0,
    },
  });
}

function solveWord(state, event) {
  const direction = directionOf(event);
  const passage = passageOf(state, event.passageId, direction);
  const attempt = passage.attempt ?? blankAttempt(event);
  const word = attempt.words[event.wordKey] ?? { solved: false, misses: 0 };
  const firstTry = event.firstTry === true;
  const points = pointsFor(firstTry, state.totals.streak);
  const streak = firstTry ? state.totals.streak + 1 : 0;

  return {
    ...withPassage(state, event.passageId, direction, {
      ...passage,
      lastPlayedAt: event.at,
      attempt: {
        ...attempt,
        words: { ...attempt.words, [event.wordKey]: { ...word, solved: true, firstTry } },
        solved: attempt.solved + 1,
        firstTrySolves: attempt.firstTrySolves + (firstTry ? 1 : 0),
        points: attempt.points + points,
      },
    }),
    kanji: countKanji(state.kanji, event.kanji, firstTry ? 'firstTry' : 'solved'),
    totals: {
      ...state.totals,
      points: state.totals.points + points,
      solved: state.totals.solved + 1,
      firstTrySolves: state.totals.firstTrySolves + (firstTry ? 1 : 0),
      streak,
      bestStreak: Math.max(state.totals.bestStreak, streak),
    },
  };
}

function missWord(state, event) {
  const direction = directionOf(event);
  const passage = passageOf(state, event.passageId, direction);
  const attempt = passage.attempt ?? blankAttempt(event);
  const word = attempt.words[event.wordKey] ?? { solved: false, misses: 0 };

  return {
    ...withPassage(state, event.passageId, direction, {
      ...passage,
      lastPlayedAt: event.at,
      attempt: {
        ...attempt,
        words: { ...attempt.words, [event.wordKey]: { ...word, misses: word.misses + 1 } },
        misses: attempt.misses + 1,
      },
    }),
    kanji: countKanji(state.kanji, event.kanji, 'missed'),
    totals: { ...state.totals, misses: state.totals.misses + 1, streak: 0 },
  };
}

function completeAttempt(state, event) {
  const direction = directionOf(event);
  const passage = passageOf(state, event.passageId, direction);
  if (!passage.attempt) {
    return state;
  }
  const attempt = { ...passage.attempt, completedAt: event.at };

  return {
    ...withPassage(state, event.passageId, direction, {
      ...passage,
      attempt,
      history: [...passage.history, summarize(attempt, 'completed')],
      timesCompleted: passage.timesCompleted + 1,
      bestPoints: Math.max(passage.bestPoints, attempt.points),
    }),
    totals: { ...state.totals, passagesCompleted: state.totals.passagesCompleted + 1 },
  };
}

function archiveAttempt(state, event, outcome) {
  const direction = directionOf(event);
  const passage = passageOf(state, event.passageId, direction);
  if (!passage.attempt || passage.attempt.completedAt) {
    return state;
  }
  return withPassage(state, event.passageId, direction, {
    ...passage,
    attempt: null,
    history: [...passage.history, summarize(passage.attempt, outcome)],
  });
}

function summarize(attempt, outcome) {
  return {
    attemptId: attempt.attemptId,
    startedAt: attempt.startedAt,
    endedAt: attempt.completedAt ?? null,
    outcome,
    solved: attempt.solved,
    misses: attempt.misses,
    firstTrySolves: attempt.firstTrySolves,
    points: attempt.points,
  };
}

function blankAttempt(event) {
  // Only reachable from a log whose attempt_started row was pruned.
  return {
    attemptId: event.attemptId ?? null,
    startedAt: event.at,
    completedAt: null,
    words: {},
    solved: 0,
    misses: 0,
    firstTrySolves: 0,
    points: 0,
  };
}

function countKanji(kanji, character, field) {
  if (!character) {
    return kanji;
  }
  const record = kanji[character] ?? { solved: 0, firstTry: 0, missed: 0 };
  return { ...kanji, [character]: { ...record, [field]: record[field] + 1 } };
}

// --- Reading the derived state ------------------------------------------

export function passageStats(state, passageId, totalWords, direction = DIRECTION.toKanji) {
  const passage = state.passages[passageId]?.[direction];
  const attempt = passage?.attempt;
  const solved = attempt?.solved ?? 0;
  return {
    solved,
    total: totalWords,
    misses: attempt?.misses ?? 0,
    points: attempt?.points ?? 0,
    firstTrySolves: attempt?.firstTrySolves ?? 0,
    complete: totalWords > 0 && solved >= totalWords,
    timesCompleted: passage?.timesCompleted ?? 0,
    bestPoints: passage?.bestPoints ?? 0,
    history: passage?.history ?? [],
    fraction: totalWords > 0 ? solved / totalWords : 0,
  };
}

export function isSolved(state, passageId, word, direction = DIRECTION.toKanji) {
  return state.passages[passageId]?.[direction]?.attempt?.words[word]?.solved === true;
}

export function missesFor(state, passageId, word, direction = DIRECTION.toKanji) {
  return state.passages[passageId]?.[direction]?.attempt?.words[word]?.misses ?? 0;
}

export function currentAttempt(state, passageId, direction = DIRECTION.toKanji) {
  return state.passages[passageId]?.[direction]?.attempt ?? null;
}
