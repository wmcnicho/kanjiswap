import { act, fireEvent, render, screen } from '@testing-library/react';
import SwapWord from './SwapWord';

const word = { reading: 'わたし', correctItem: '私', options: ['私', '本', '花'] };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function swapIn(container) {
  // The passage decides which word is open; here we render it already active.
  fireEvent.click(screen.getByText(word.correctItem));
  act(() => {
    jest.advanceTimersByTime(600); // the success flash, then the swap
  });
  return container;
}

test('shows the reading over the kanji it just swapped in, then lets it fade', () => {
  const { container } = render(<SwapWord {...word} active />);

  swapIn(container);

  const furigana = container.querySelector('rt');
  expect(furigana).toHaveTextContent(word.reading);
  expect(furigana).toHaveStyle({ opacity: '1' });

  act(() => {
    jest.advanceTimersByTime(2500); // past the hold
  });
  expect(container.querySelector('rt')).toHaveStyle({ opacity: '0' });
});

test('keeps the faded reading in the layout so the line does not shift', () => {
  const { container } = render(<SwapWord {...word} active />);
  swapIn(container);
  act(() => {
    jest.advanceTimersByTime(2500);
  });

  // Still present, just transparent — removing it would reflow the passage.
  expect(container.querySelector('rt')).toBeInTheDocument();
});

test('gives a word restored from history no furigana and no flash', () => {
  const { container } = render(<SwapWord {...word} solved />);

  expect(screen.getByText(word.correctItem)).toBeInTheDocument();
  expect(container.querySelector('rt')).toHaveStyle({ opacity: '0' });
});
