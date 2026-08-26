// Progress lives in the browser — no accounts, no server. It is keyed by the
// passage text itself rather than its position in the list, so regenerating
// passages.json or reordering the passages doesn't strand a student's history.

export const STORAGE_KEY = 'kanjiswap.progress.v1';

// djb2. Short, stable, and enough to tell passages apart; not a security hash.
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

// Reading never throws: Safari private mode and blocked-storage settings make
// the localStorage access itself raise, and stored JSON can be anything.
export function loadProgress() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Out of quota, or storage denied. The session still works; it just won't
    // survive a reload, which is better than breaking the exercise.
  }
}

// Records one click on a word: a correct kanji solves it, a wrong one counts as
// a miss. Returns a new progress object rather than mutating the old one.
export function recordAttempt(progress, passageId, word, correct) {
  const passage = progress[passageId] ?? {};
  const previous = passage[word] ?? { solved: false, misses: 0 };
  const updated = correct
    ? { ...previous, solved: true }
    : { ...previous, misses: countMisses(previous) + 1 };
  return { ...progress, [passageId]: { ...passage, [word]: updated } };
}

export function resetPassage(progress, passageId) {
  const { [passageId]: removed, ...rest } = progress;
  return rest;
}

// Solved words, wrong guesses, and accuracy for one passage. Accuracy is the
// share of clicks that were right, and is null before the first click.
export function passageStats(progress, passageId, totalWords) {
  const words = Object.values(progress[passageId] ?? {});
  const solved = words.filter((word) => word?.solved === true).length;
  const misses = words.reduce((total, word) => total + countMisses(word), 0);
  const attempts = solved + misses;
  return {
    solved,
    total: totalWords,
    misses,
    accuracy: attempts > 0 ? solved / attempts : null,
    complete: totalWords > 0 && solved >= totalWords,
  };
}

// Stored records come back from JSON unvalidated, so treat anything that isn't
// a non-negative number as zero.
function countMisses(word) {
  return Number.isFinite(word?.misses) && word.misses > 0 ? word.misses : 0;
}
