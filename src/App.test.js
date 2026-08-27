import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import passages from './data/passages.json';
import { parsePassage } from './utils/passage';
import { titleOf, wordCountOf } from './utils/curriculum';
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

test('keeps the mark and the score reachable when the rail is a drawer', () => {
  render(<App />);
  // The phone header carries what the hidden rail would otherwise hold.
  expect(screen.getByRole('button', { name: 'Passages' })).toBeInTheDocument();
  expect(screen.getAllByTestId('score-value').length).toBeGreaterThan(1);
});

test('shows the mark at the top of the rail', () => {
  render(<App />);
  expect(screen.getAllByRole('img', { name: /kanjiswap/i }).length).toBeGreaterThan(0);
});

test('lists the learning path as collapsible textbook stages', () => {
  render(<App />);
  expect(screen.getAllByText(/Stage 1-3/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Stage 2-8/).length).toBeGreaterThan(0);
});

test('opens the stage holding the passage on screen', () => {
  render(<App />);
  // The first passage's stage starts expanded, so its title is visible.
  const [firstStage] = screen.getAllByText(/Stage 1-3/);
  expect(firstStage.textContent).toMatch(/▾/);
});

test('switching passages loads the one that was clicked', async () => {
  render(<App />);
  const words = (index) => new RegExp(`0/${wordCountOf(passages[index])} swapped`);
  expect(screen.getByText(words(0))).toBeInTheDocument();

  act(() => {
    // The nav renders twice — permanent drawer plus the keepMounted temporary
    // one — so either copy will do.
    userEvent.click(screen.getAllByText(titleOf(passages[1]).title)[0]);
  });

  await waitFor(() => {
    expect(screen.getByText(words(1))).toBeInTheDocument();
  });
});

test('names every passage in kana, never in the kanji it is asking for', () => {
  // Showing kanji in the rail would hand over the answers the exercise is
  // built on, so this holds for all fourteen, expanded or not.
  for (const passage of passages) {
    expect(titleOf(passage).title).toMatch(/^[ぁ-ゖー「」、。…]+$/);
  }
});

test('shows the title and its emoji in the rail', () => {
  render(<App />);
  const { title, emoji } = titleOf(passages[0]);
  expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  expect(screen.getAllByText(emoji).length).toBeGreaterThan(0);
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

  const { container } = render(<App />);

  expect(screen.getAllByText(word.kanji)[0]).toBeInTheDocument();
  // The reading survives only as furigana, faded out — a restored word shows
  // its kanji, not its kana.
  const furigana = [...container.querySelectorAll('rt')].find((node) => node.textContent === word.reading);
  expect(furigana).toHaveStyle({ opacity: '0' });
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
    expect(document.querySelector('ruby')).toHaveTextContent(word.kanji);
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

test('remembers that the option keys have been shown', async () => {
  render(<App />);

  fireEvent.keyDown(window, { key: 'a' });

  await waitFor(() => {
    expect(deriveState(loadStore()).settings.keyHints).toBe('revealed');
  });
});
