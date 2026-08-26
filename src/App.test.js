import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import passages from './data/passages.json';
import { parsePassage } from './utils/passage';
import {
  EVENT,
  STORAGE_KEY,
  appendEvent,
  createStore,
  deriveState,
  loadStore,
  passageKey,
  wordKey,
} from './utils/progress';

// The first swappable word of the first passage, which is what the app opens on.
function firstSwapWord() {
  const lines = parsePassage(passages[0].with_furigana);
  for (const [lineIndex, segments] of lines.entries()) {
    for (const [segmentIndex, segment] of segments.entries()) {
      if (segment.type === 'swap') {
        return { ...segment, key: wordKey(lineIndex, segmentIndex, segment.kanji) };
      }
    }
  }
  throw new Error('the first passage has no swappable words');
}

// Seeds storage with a log in which that word was already solved.
function seedSolved(word) {
  const passageId = passageKey(passages[0]);
  let store = appendEvent(createStore('install_test'), EVENT.attemptStarted, { passageId, attemptId: 'a1' });
  store = appendEvent(store, EVENT.wordSolved, {
    passageId, attemptId: 'a1', wordKey: word.key, kanji: word.kanji, firstTry: true,
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  return passageId;
}

beforeEach(() => {
  window.localStorage.clear();
});

test('lists the learning path as collapsible chapters', () => {
  render(<App />);
  // Chapters 2, 3 and 4 all exist in the extracted data.
  expect(screen.getAllByText(/Chapter 2/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Chapter 3/).length).toBeGreaterThan(0);
});

test('opens the chapter holding the passage on screen', () => {
  render(<App />);
  // The first passage's chapter starts expanded, so its preview is visible.
  const [firstChapter] = screen.getAllByText(/Chapter 2/);
  expect(firstChapter.textContent).toMatch(/▾/);
});

test('switching passages loads the one that was clicked', async () => {
  render(<App />);
  const before = screen.getAllByText('わたし').length;

  const [, secondPassage] = screen.getAllByRole('button').filter((button) => /…/.test(button.textContent));
  act(() => {
    userEvent.click(secondPassage);
  });

  await waitFor(() => {
    expect(screen.queryAllByText('わたし').length).not.toBe(before);
  });
});

test('renders the first passage with readings shown as hiragana', () => {
  render(<App />);
  // 私(わたし) should render as its reading until swapped
  const firstWord = screen.getAllByText('わたし')[0];
  expect(firstWord).toBeInTheDocument();
});

test('restores words solved in an earlier visit', () => {
  const word = firstSwapWord();
  seedSolved(word);

  render(<App />);

  expect(screen.getAllByText(word.kanji)[0]).toBeInTheDocument();
  expect(screen.queryByText(word.reading)).not.toBeInTheDocument();
});

test('opens an attempt for a passage the student has never seen', async () => {
  render(<App />);

  await waitFor(() => {
    const store = loadStore();
    expect(store.events.some((event) => event.type === EVENT.attemptStarted)).toBe(true);
  });
});

test('records a correct swap as a scored event', async () => {
  const word = firstSwapWord();
  render(<App />);

  // The choices live in a tooltip, so the word has to be hovered first.
  userEvent.hover(screen.getAllByText(word.reading)[0]);
  const option = await screen.findByText(word.kanji);
  act(() => {
    userEvent.click(option);
  });

  // The kanji replaces the kana after the success flash.
  await waitFor(() => {
    expect(screen.queryByText(word.reading)).not.toBeInTheDocument();
  });

  const store = loadStore();
  const solve = store.events.find((event) => event.type === EVENT.wordSolved);
  expect(solve).toMatchObject({ wordKey: word.key, kanji: word.kanji, firstTry: true });
  expect(deriveState(store).totals.points).toBeGreaterThan(0);
});

test('shows the running score', () => {
  const word = firstSwapWord();
  seedSolved(word);

  render(<App />);

  expect(screen.getByText(/points overall/)).toBeInTheDocument();
});
