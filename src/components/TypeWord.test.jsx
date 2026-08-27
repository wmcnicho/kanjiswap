import { act, fireEvent, render, screen } from '@testing-library/react';
import TypeWord from './TypeWord';

const word = { kanji: '私', reading: 'わたし' };

const type = (text) => fireEvent.change(screen.getByLabelText(/reading for 私/i), { target: { value: text } });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows the kanji and asks for the reading', () => {
  render(<TypeWord {...word} active />);
  expect(screen.getByText('私')).toBeInTheDocument();
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('');
});

test('accepts a reading typed as kana', () => {
  const onAttempt = jest.fn();
  render(<TypeWord {...word} active onAttempt={onAttempt} />);

  type('わたし');

  expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
});

test('accepts one typed as romaji, and shows it as kana as it goes', () => {
  const onAttempt = jest.fn();
  render(<TypeWord {...word} active onAttempt={onAttempt} />);

  type('wata');
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わた');
  expect(onAttempt).not.toHaveBeenCalled(); // not finished yet

  type('watashi');
  expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
});

test('needs no submit — a complete reading is simply right', () => {
  const onAttempt = jest.fn();
  render(<TypeWord {...word} active onAttempt={onAttempt} />);

  type('watashi'); // no Enter pressed

  expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
});

test('counts a wrong reading only when it is offered', () => {
  const onAttempt = jest.fn();
  render(<TypeWord {...word} active onAttempt={onAttempt} />);

  type('わたく');
  expect(onAttempt).not.toHaveBeenCalled(); // half-typed is not wrong yet

  fireEvent.keyDown(screen.getByLabelText(/reading for 私/i), { key: 'Enter' });
  expect(onAttempt).toHaveBeenCalledWith(false, 'わたく');
});

test('clears a wrong answer rather than leaving it to edit around', () => {
  render(<TypeWord {...word} active onAttempt={() => {}} />);

  type('わたく');
  fireEvent.keyDown(screen.getByLabelText(/reading for 私/i), { key: 'Enter' });
  act(() => {
    jest.advanceTimersByTime(600);
  });

  expect(screen.getByTestId('reading-slot')).toHaveTextContent('');
});

test('leaves the reading above the kanji, then lets it fade', () => {
  render(<TypeWord {...word} active onAttempt={() => {}} />);

  type('watashi');
  act(() => {
    jest.advanceTimersByTime(600);
  });
  expect(screen.getByTestId('reading-slot')).toHaveTextContent('わたし');
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '1' });

  act(() => {
    jest.advanceTimersByTime(2500);
  });
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '0' });
});

test('gives a word answered in an earlier visit no input and no reading', () => {
  render(<TypeWord {...word} solved />);

  expect(screen.queryByLabelText(/reading for 私/i)).not.toBeInTheDocument();
  expect(screen.getByTestId('reading-slot')).toHaveStyle({ opacity: '0' });
});

test('walks the passage with Tab rather than the page', () => {
  const onStep = jest.fn();
  render(<TypeWord {...word} active onStep={onStep} />);
  const input = screen.getByLabelText(/reading for 私/i);

  fireEvent.keyDown(input, { key: 'Tab' });
  expect(onStep).toHaveBeenCalledWith(1);

  fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
  expect(onStep).toHaveBeenCalledWith(-1);
});
