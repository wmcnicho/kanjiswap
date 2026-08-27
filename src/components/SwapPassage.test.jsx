import { act, fireEvent, render, screen } from '@testing-library/react';
import SwapPassage from './SwapPassage';
import { OPTION_KEYS } from './SwapOptions';

const passage = { with_furigana: '私(わたし)は本(ほん)を読(よ)みます。\n花(はな)がすきです。' };

function tooltipOptions() {
  return [...document.querySelectorAll('.MuiTooltip-tooltip [data-option]')]
    .map((cell) => cell.dataset.option);
}

// Presses the key that picks `kanji` out of the open choices.
function pressKeyFor(kanji) {
  const index = tooltipOptions().indexOf(kanji);
  expect(index).toBeGreaterThanOrEqual(0);
  fireEvent.keyDown(window, { key: OPTION_KEYS[index] });
}

test('lays the passage out left to right by default', () => {
  const { container } = render(<SwapPassage passage={passage} />);
  expect(container.firstChild).not.toHaveStyle({ writingMode: 'vertical-rl' });
});

test('runs top to bottom, right to left, when asked', () => {
  const { container } = render(<SwapPassage passage={passage} vertical />);
  // Block flow turns with the writing mode, so lines stack right to left.
  expect(container.firstChild).toHaveStyle({ writingMode: 'vertical-rl' });
});

describe('playing by keyboard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('the first key press opens a word rather than answering it blind', () => {
    const onAttempt = jest.fn();
    render(<SwapPassage passage={passage} onAttempt={onAttempt} />);

    fireEvent.keyDown(window, { key: 'a' });

    expect(tooltipOptions()).toContain('私'); // the first word's choices are showing
    expect(onAttempt).not.toHaveBeenCalled(); // but nothing has been answered
  });

  test('a key picks the option in that position', () => {
    const onAttempt = jest.fn();
    render(<SwapPassage passage={passage} onAttempt={onAttempt} />);

    fireEvent.keyDown(window, { key: 'a' });
    pressKeyFor('私');

    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ kanji: '私' }), true, '私');
  });

  test('digits pick the same options as the home row', () => {
    const onAttempt = jest.fn();
    render(<SwapPassage passage={passage} onAttempt={onAttempt} />);

    fireEvent.keyDown(window, { key: '1' });
    const first = tooltipOptions()[0];
    fireEvent.keyDown(window, { key: '1' });

    expect(onAttempt).toHaveBeenCalledWith(expect.anything(), first === '私', first);
  });

  test('moves on to the next word once one is answered', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);

    fireEvent.keyDown(window, { key: 'a' });
    pressKeyFor('私');
    act(() => {
      jest.advanceTimersByTime(1000); // the flash, then the hand-off
    });

    expect(tooltipOptions()).toContain('本'); // the second word is now open
  });

  test('stays on a word that was answered wrongly', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);

    fireEvent.keyDown(window, { key: 'a' });
    const wrong = tooltipOptions().find((option) => option !== '私');
    pressKeyFor(wrong);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(tooltipOptions()).toContain('私'); // still the word that hasn't been solved
  });

  test('leaves keys alone while something is being typed into', () => {
    const onAttempt = jest.fn();
    render(
      <>
        <SwapPassage passage={passage} onAttempt={onAttempt} />
        <input aria-label='somewhere to type' />
      </>
    );

    fireEvent.keyDown(screen.getByLabelText(/somewhere to type/i), { key: 'a' });

    expect(tooltipOptions()).toHaveLength(0);
  });

  test('offers the keys to anyone who hovers a word without choosing', () => {
    const onRevealHints = jest.fn();
    render(<SwapPassage passage={passage} onRevealHints={onRevealHints} />);

    fireEvent.mouseOver(screen.getByText('わたし'));
    act(() => {
      jest.advanceTimersByTime(200); // MUI's own enter delay
    });
    expect(onRevealHints).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onRevealHints).toHaveBeenCalled();
  });
});
