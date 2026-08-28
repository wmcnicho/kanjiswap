import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import TypeWord from './TypeWord';

const word = { kanji: '私', reading: 'わたし' };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows the kanji, with nothing above it yet', () => {
  render(<TypeWord {...word} active />);
  expect(screen.getByText('私')).toBeInTheDocument();
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('');
});

test('mirrors what is being typed, small, where the furigana goes', () => {
  const { rerender } = render(<TypeWord {...word} active pending='わた' />);
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わた');

  rerender(<TypeWord {...word} active pending='わたし' />);
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わたし');
});

test('holds no field of its own — one at the top serves the passage', () => {
  render(<TypeWord {...word} active pending='わ' />);
  // An input per word turned the line into a row of boxes; the passage stopped
  // reading like text.
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('settles the reading above the kanji when the answer is right, then fades it', () => {
  const ref = createRef();
  render(<TypeWord {...word} ref={ref} active />);

  act(() => {
    ref.current.choose('わたし');
    jest.advanceTimersByTime(600);
  });
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わたし');
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '1' });

  act(() => {
    jest.advanceTimersByTime(2500);
  });
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '0' });
});

test('shows nothing new when the answer is wrong', () => {
  const ref = createRef();
  render(<TypeWord {...word} ref={ref} active />);

  act(() => {
    ref.current.choose('わたく');
    jest.advanceTimersByTime(600);
  });

  expect(screen.getByTestId('reading-slot')).toHaveTextContent('');
  expect(screen.getByText('私')).toBeInTheDocument();
});

test('gives a word answered in an earlier visit its reading, faded out', () => {
  render(<TypeWord {...word} solved />);
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わたし');
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '0' });
});

test('answers the keystroke that finished the word, not a moment later', () => {
  const ref = createRef();
  render(<TypeWord {...word} ref={ref} active />);

  act(() => {
    ref.current.choose('わたし');
  });

  // Green immediately, before any timer runs: the flash is the response.
  expect(screen.getByText('私')).toHaveStyle({ color: 'green' });
});

test('clears the reading quickly, so it fades while the next word is typed', () => {
  const ref = createRef();
  render(<TypeWord {...word} ref={ref} active />);

  act(() => {
    ref.current.choose('わたし');
    jest.advanceTimersByTime(250);
  });
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '1' });

  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '0' });
});
