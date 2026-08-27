import { act, render, screen } from '@testing-library/react';
import Score from './Score';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows what was gained, in parentheses, then lets it go', () => {
  const { rerender } = render(<Score value={40} label='points' showDelta />);
  expect(screen.getByTestId('score-gain')).toHaveStyle({ opacity: '0' });

  rerender(<Score value={57} label='points' showDelta />);
  expect(screen.getByTestId('score-gain')).toHaveTextContent('(+17)');
  expect(screen.getByTestId('score-gain')).toHaveStyle({ opacity: '1' });

  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(screen.getByTestId('score-gain')).toHaveStyle({ opacity: '0' });
});

test('takes a different tone while the score is moving', () => {
  const { rerender } = render(<Score value={40} label='points' />);
  const toneOf = () => window.getComputedStyle(screen.getByTestId('score-value')).color;
  const resting = toneOf();

  rerender(<Score value={50} label='points' />);
  expect(toneOf()).not.toBe(resting);

  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(toneOf()).toBe(resting);
});

test('says nothing when the score resets for a new attempt', () => {
  const { rerender } = render(<Score value={96} label='points' showDelta />);

  rerender(<Score value={0} label='points' showDelta />);

  expect(screen.getByTestId('score-gain')).toHaveStyle({ opacity: '0' });
  expect(screen.getByTestId('score-value')).toHaveTextContent('0');
});

test('keeps the figure legible as a figure', () => {
  render(<Score value={128} label='points' />);
  // Tabular figures so the number doesn't jitter as it climbs.
  expect(screen.getByTestId('score-value')).toHaveStyle({ fontVariantNumeric: 'tabular-nums' });
});
