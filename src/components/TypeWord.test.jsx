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

// What a Japanese IME does: keystrokes go into a composition, the text on
// screen is provisional, and Enter commits it. jsdom fires none of this on its
// own, so the events are dispatched the way a browser would.
describe('typing with a Japanese IME', () => {
  const input = () => screen.getByLabelText(/reading for 私/i);

  function compose(text, { commitWith = 'compositionend' } = {}) {
    fireEvent.compositionStart(input());
    fireEvent.change(input(), { target: { value: text } });
    if (commitWith === 'enter') {
      // The Enter that commits the composition, which the browser marks.
      fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 });
    }
    fireEvent.compositionEnd(input(), { target: { value: text } });
  }

  test('accepts a reading committed from a composition', () => {
    const onAttempt = jest.fn();
    render(<TypeWord {...word} active onAttempt={onAttempt} />);

    compose('わたし');

    expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
  });

  test('does not count the Enter that commits the composition as an answer', () => {
    const onAttempt = jest.fn();
    render(<TypeWord {...word} active onAttempt={onAttempt} />);

    compose('わたし', { commitWith: 'enter' });

    // That Enter finished the word; reading it as "I offer this" marked the
    // reader wrong at the moment they got it right.
    expect(onAttempt).not.toHaveBeenCalledWith(false, expect.anything());
    expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
  });

  test('leaves the text alone while the composition is still open', () => {
    render(<TypeWord {...word} active onAttempt={() => {}} />);

    fireEvent.compositionStart(input());
    fireEvent.change(input(), { target: { value: 'わた' } });

    // Untouched: rewriting it here resets the IME's own buffer.
    expect(input()).toHaveValue('わた');
  });

  test('still offers a wrong answer on a plain Enter', () => {
    const onAttempt = jest.fn();
    render(<TypeWord {...word} active onAttempt={onAttempt} />);

    compose('わたく');
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(onAttempt).toHaveBeenCalledWith(false, 'わたく');
  });
});

test('accepts the reading of a longer word typed as romaji', () => {
  const onAttempt = jest.fn();
  render(<TypeWord kanji='一年生' reading='いちねんせい' active onAttempt={onAttempt} />);

  fireEvent.change(screen.getByLabelText(/reading for 一年生/i), { target: { value: 'ichinensei' } });

  expect(onAttempt).toHaveBeenCalledWith(true, 'いちねんせい');
});

test('accepts nn for ん, which is how it is typed', () => {
  const onAttempt = jest.fn();
  render(<TypeWord kanji='一年生' reading='いちねんせい' active onAttempt={onAttempt} />);

  fireEvent.change(screen.getByLabelText(/reading for 一年生/i), { target: { value: 'ichinennsei' } });

  expect(onAttempt).toHaveBeenCalledWith(true, 'いちねんせい');
});

test('takes what was typed when the reader moves on without committing it', () => {
  const onAttempt = jest.fn();
  render(<TypeWord {...word} active onAttempt={onAttempt} />);
  const field = screen.getByLabelText(/reading for 私/i);

  fireEvent.compositionStart(field);
  fireEvent.change(field, { target: { value: 'わたし' } });
  fireEvent.blur(field, { target: { value: 'わたし' } });

  // Typed correctly but never committed; losing it silently is the worst answer.
  expect(onAttempt).toHaveBeenCalledWith(true, 'わたし');
});
