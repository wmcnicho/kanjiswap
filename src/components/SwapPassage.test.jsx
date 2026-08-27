import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SwapPassage from './SwapPassage';
import { OPTION_KEYS } from './SwapOptions';

const passage = { with_furigana: '私(わたし)は本(ほん)を読(よ)みます。\n花(はな)がすきです。' };

// The choices currently *open*. A closed tooltip lingers in the DOM through its
// exit transition, so presence isn't the same question as visibility: MUI points
// the word at its tooltip with aria-labelledby only while it is open.
function tooltipOptions() {
  return [...document.querySelectorAll('[aria-labelledby]')]
    .map((word) => document.getElementById(word.getAttribute('aria-labelledby')))
    .filter(Boolean)
    .flatMap((tip) => [...tip.querySelectorAll('[data-option]')].map((cell) => cell.dataset.option));
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

function activeWord() {
  return document.querySelector('[data-active]')?.textContent ?? null;
}

describe('finding your place', () => {
  test('the next word to solve is marked from the start', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    expect(activeWord()).toBe('わたし');
  });

  test('marks it without opening choices over an untouched passage', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    expect(tooltipOptions()).toHaveLength(0);
  });

  test('marks the next unsolved word, not the next word', () => {
    const solved = new Set(['0.0.私']);
    render(<SwapPassage passage={passage} isSolved={(key) => solved.has(key)} onAttempt={() => {}} />);
    expect(activeWord()).toBe('ほん');
  });
});

describe('stepping between words', () => {
  test.each([
    ['e', 'ほん'],
    ['ArrowRight', 'ほん'],
    ['ArrowDown', 'ほん'],
    ['q', 'はな'],
    ['ArrowLeft', 'はな'],
    ['ArrowUp', 'はな'],
  ])('%s moves to %s', (key, expected) => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    fireEvent.keyDown(window, { key });
    expect(activeWord()).toBe(expected);
  });

  test('follows the writing direction when the passage runs vertically', () => {
    render(<SwapPassage passage={passage} vertical onAttempt={() => {}} />);

    // Vertical Japanese reads downwards, then leftwards, so those are forwards.
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(activeWord()).toBe('ほん');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(activeWord()).toBe('わたし');
  });

  test('wraps round the words still to be solved', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    fireEvent.keyDown(window, { key: 'q' });
    expect(activeWord()).toBe('はな'); // backwards from the first word is the last one
  });

  test('stepping opens the choices for the word it lands on', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    fireEvent.keyDown(window, { key: 'e' });
    expect(tooltipOptions()).toContain('本');
  });
});

// Mirrors what the app does: solved words come back down as props.
function PlayablePassage() {
  const [solved, setSolved] = useState(new Set());
  return (
    <SwapPassage
      passage={passage}
      isSolved={(key) => solved.has(key)}
      onAttempt={(segment, correct) => {
        if (correct) {
          setSolved((current) => new Set(current).add(segment.key));
        }
      }}
    />
  );
}

describe('playing by touch', () => {
  test('a tap opens the choices', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);
    expect(tooltipOptions()).toHaveLength(0);

    fireEvent.click(screen.getByText('わたし'));

    // MUI only opens a tooltip on touch after a long press, which nobody would
    // guess, so the word takes the tap itself.
    expect(tooltipOptions()).toContain('私');
  });

  test('tapping the same word again puts the choices away', () => {
    render(<SwapPassage passage={passage} onAttempt={() => {}} />);

    fireEvent.click(screen.getByText('わたし'));
    fireEvent.click(screen.getByText('わたし'));

    expect(tooltipOptions()).toHaveLength(0);
  });

  test('a tapped choice answers the word', () => {
    const onAttempt = jest.fn();
    render(<SwapPassage passage={passage} onAttempt={onAttempt} />);

    fireEvent.click(screen.getByText('わたし'));
    fireEvent.click([...document.querySelectorAll('[data-option="私"]')].pop());

    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ kanji: '私' }), true, '私');
  });
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

  test('finishes a whole passage without a single click', () => {
    render(<PlayablePassage />);

    fireEvent.keyDown(window, { key: 'a' }); // show the choices
    for (const kanji of ['私', '本', '読', '花']) {
      expect(tooltipOptions()).toContain(kanji);
      pressKeyFor(kanji);
      act(() => {
        jest.advanceTimersByTime(1000); // the flash, then the hand-off
      });
    }

    expect(activeWord()).toBeNull(); // nothing left to aim at
    expect(screen.getByText('花')).toBeInTheDocument();
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
