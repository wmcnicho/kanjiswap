import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import passages from './data/passages.json';
import { parsePassage } from './utils/passage';
import { STORAGE_KEY, loadProgress, passageKey, wordKey } from './utils/progress';

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

beforeEach(() => {
  window.localStorage.clear();
});

test('renders the passage picker', () => {
  render(<App />);
  const select = screen.getByLabelText(/passage/i);
  expect(select).toBeInTheDocument();
});

test('renders the first passage with readings shown as hiragana', () => {
  render(<App />);
  // 私(わたし) should render as its reading until swapped
  const firstWord = screen.getAllByText('わたし')[0];
  expect(firstWord).toBeInTheDocument();
});

test('restores words solved in an earlier visit', () => {
  const word = firstSwapWord();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    [passageKey(passages[0])]: { [word.key]: { solved: true, misses: 0 } },
  }));

  render(<App />);

  expect(screen.getAllByText(word.kanji)[0]).toBeInTheDocument();
  expect(screen.queryByText(word.reading)).not.toBeInTheDocument();
});

test('saves a correct swap to browser storage', async () => {
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
  expect(loadProgress()[passageKey(passages[0])]?.[word.key]).toEqual({ solved: true, misses: 0 });
});

test('shows how much of a passage is done in the picker', () => {
  const word = firstSwapWord();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    [passageKey(passages[0])]: { [word.key]: { solved: true, misses: 0 } },
  }));

  render(<App />);

  expect(screen.getByText(/1 \/ 1 swapped|1\/1 swapped|\(1\//)).toBeInTheDocument();
});
