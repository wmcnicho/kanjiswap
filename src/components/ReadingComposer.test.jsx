import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ReadingComposer from './ReadingComposer';

// The field is controlled by the passage, and feeds its own converted value
// back in on every keystroke — which is where the conversion bugs lived.
function Field({ kanji = '一年生', reading = 'いちねんせい', onOffer = () => {}, onStep }) {
  const [value, setValue] = useState('');
  // The app scores a correct answer, and the reward is read off that score.
  const [points, setPoints] = useState(0);
  return (
    <ReadingComposer
      kanji={kanji}
      reading={reading}
      value={value}
      points={points}
      onValueChange={setValue}
      onOffer={(text) => {
        if (text === reading) {
          setPoints((current) => current + 15);
        }
        onOffer(text);
      }}
      onStep={onStep}
    />
  );
}

const field = (kanji = '一年生') => screen.getByLabelText(new RegExp(`reading for ${kanji}`, 'i'));

function typeOneKeyAtATime(romaji, kanji) {
  for (const character of romaji) {
    fireEvent.change(field(kanji), { target: { value: `${field(kanji).value}${character}` } });
  }
}

test('shows the word being answered at a size you can read', () => {
  render(<Field />);
  expect(screen.getByText('一年生')).toBeInTheDocument();
  expect(field()).toHaveValue('');
});

test('takes a reading typed one key at a time', () => {
  const onOffer = jest.fn();
  render(<Field onOffer={onOffer} />);

  typeOneKeyAtATime('ichinensei');

  expect(onOffer).toHaveBeenCalledWith('いちねんせい');
});

test('takes nn for ん, which is how it is typed', () => {
  const onOffer = jest.fn();
  render(<Field onOffer={onOffer} />);

  typeOneKeyAtATime('ichinennsei');

  expect(onOffer).toHaveBeenCalledWith('いちねんせい');
});

test('settles a trailing n when the reading ends in one', () => {
  const onOffer = jest.fn();
  render(<Field kanji='本' reading='ほん' onOffer={onOffer} />);

  typeOneKeyAtATime('hon', '本');

  expect(onOffer).toHaveBeenCalledWith('ほん');
});

test('leaves an n alone when a vowel follows it', () => {
  const onOffer = jest.fn();
  render(<Field kanji='何' reading='なに' onOffer={onOffer} />);

  typeOneKeyAtATime('nani', '何');

  expect(onOffer).toHaveBeenCalledWith('なに');
});

test('takes kana typed straight in, for anyone with a kana keyboard', () => {
  const onOffer = jest.fn();
  render(<Field onOffer={onOffer} />);

  fireEvent.change(field(), { target: { value: 'いちねんせい' } });

  expect(onOffer).toHaveBeenCalledWith('いちねんせい');
});

test('offers whatever is there on Enter, right or wrong', () => {
  const onOffer = jest.fn();
  render(<Field onOffer={onOffer} />);

  fireEvent.change(field(), { target: { value: 'いちねん' } });
  expect(onOffer).not.toHaveBeenCalled(); // unfinished is not wrong

  fireEvent.keyDown(field(), { key: 'Enter' });
  expect(onOffer).toHaveBeenCalledWith('いちねん');
});

test('walks the passage with Tab', () => {
  const onStep = jest.fn();
  render(<Field onStep={onStep} />);

  fireEvent.keyDown(field(), { key: 'Tab' });
  expect(onStep).toHaveBeenCalledWith(1);

  fireEvent.keyDown(field(), { key: 'Tab', shiftKey: true });
  expect(onStep).toHaveBeenCalledWith(-1);
});

test('takes the caret when the passage moves to the next word', () => {
  const { rerender } = render(
    <ReadingComposer kanji='私' reading='わたし' value='' onValueChange={() => {}} onOffer={() => {}} />
  );
  rerender(
    <ReadingComposer kanji='本' reading='ほん' value='' onValueChange={() => {}} onOffer={() => {}} />
  );

  // So a passage can be played through without reaching for the mouse.
  expect(field('本')).toHaveFocus();
});

describe('with a Japanese IME', () => {
  test('takes a reading committed from a composition', () => {
    const onOffer = jest.fn();
    render(<Field onOffer={onOffer} />);

    fireEvent.compositionStart(field());
    fireEvent.change(field(), { target: { value: 'いちねんせい' } });
    fireEvent.compositionEnd(field(), { target: { value: 'いちねんせい' } });

    expect(onOffer).toHaveBeenCalledWith('いちねんせい');
  });

  test('does not read the Enter that commits a composition as an answer', () => {
    const onOffer = jest.fn();
    render(<Field onOffer={onOffer} />);

    fireEvent.compositionStart(field());
    fireEvent.change(field(), { target: { value: 'いちねん' } });
    // The browser marks this Enter as belonging to the IME.
    fireEvent.keyDown(field(), { key: 'Enter', keyCode: 229 });

    expect(onOffer).not.toHaveBeenCalled();
  });

  test('leaves the text alone while a composition is open', () => {
    render(<Field />);

    fireEvent.compositionStart(field());
    fireEvent.change(field(), { target: { value: 'いちねn' } });

    // Rewriting it here resets the IME's own buffer mid-word.
    expect(field()).toHaveValue('いちねn');
  });
});

test('prompts in the empty field, in kanji with its furigana', () => {
  render(<Field />);
  const prompt = screen.getByText('読み方');
  expect(prompt).toHaveTextContent('よみかた'); // the ruby annotation rides along
});

test('the prompt gives way as soon as anything is typed', () => {
  render(<Field />);

  fireEvent.change(field(), { target: { value: 'i' } });

  // It stands in for a placeholder, so it behaves like one.
  expect(screen.queryByText('読み方')).not.toBeInTheDocument();
});

test('sits the prompt on the line the reader will type on', () => {
  render(<Field />);

  // Ruby reserves a line above its text, which pushed 読み方 down onto the
  // field's underline. The furigana is floated out of the flow instead.
  expect(screen.getByText('読み方').closest('ruby')).toBeNull();
  expect(screen.getByText('よみかた')).toHaveStyle({ position: 'absolute' });
});

test('holds its place while the passage scrolls past it', () => {
  const { container } = render(<Field />);
  expect(container.firstChild).toHaveStyle({ position: 'sticky' });
});

describe('the reward for a correct answer', () => {
  const composer = (props) => (
    <ReadingComposer
      kanji='一年生'
      reading='いちねんせい'
      value=''
      onValueChange={() => {}}
      onOffer={() => {}}
      {...props}
    />
  );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('flashes what the answer was worth, beside the field', () => {
    const { rerender } = render(composer({ points: 40, streak: 1 }));
    expect(screen.queryByTestId('award')).not.toBeInTheDocument();

    rerender(composer({ points: 57, streak: 2 }));

    expect(screen.getByTestId('award')).toHaveTextContent('(+17)');
  });

  test('says how long the run is, once it is a run', () => {
    const { rerender } = render(composer({ points: 40, streak: 1 }));

    rerender(composer({ points: 55, streak: 4 }));
    expect(screen.getByTestId('award')).toHaveTextContent('×4');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    rerender(composer({ points: 70, streak: 1 }));
    // One in a row is not a run worth announcing.
    expect(screen.getByTestId('award')).not.toHaveTextContent('×');
  });

  test('goes away on its own', () => {
    const { rerender } = render(composer({ points: 40 }));
    rerender(composer({ points: 55 }));
    expect(screen.getByTestId('award')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByTestId('award')).not.toBeInTheDocument();
  });

  test('says nothing when the score resets for a new attempt', () => {
    const { rerender } = render(composer({ points: 96 }));

    rerender(composer({ points: 0 }));

    expect(screen.queryByTestId('award')).not.toBeInTheDocument();
  });

  test('never moves the field the reader is typing into', () => {
    const { rerender } = render(composer({ points: 40 }));
    rerender(composer({ points: 55 }));

    // Absolutely positioned, so a reward arriving mid-word can't shift the
    // caret out from under someone typing fast.
    expect(window.getComputedStyle(screen.getByTestId('award')).position).toBe('absolute');
  });

  test('lifts the answered reading off the field, where the eyes already are', () => {
    // Typing it is what earns the reward, so the reward happens there — not
    // only in a chip off to one side.
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'ichinensei' } });

    expect(screen.getByTestId('award-rise')).toHaveTextContent('いちねんせい');
  });

  test('shows the reading that was answered, not the one that follows it', () => {
    const props = { value: '', onValueChange: () => {}, onOffer: () => {} };
    const { rerender } = render(<ReadingComposer kanji='私' reading='わたし' points={0} {...props} />);

    fireEvent.change(field('私'), { target: { value: 'watashi' } });
    // Typing hands straight on, so the score arrives with the next word already
    // in place — the reward has to remember what earned it.
    rerender(<ReadingComposer kanji='本' reading='ほん' points={15} {...props} />);

    expect(screen.getByTestId('award-rise')).toHaveTextContent('わたし');
  });

  test('is inert, so the next word keeps every keystroke', () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'ichinensei' } });

    const rising = screen.getByTestId('award-rise');
    expect(window.getComputedStyle(rising).position).toBe('absolute');
    expect(window.getComputedStyle(rising).pointerEvents).toBe('none');
    expect(rising).toHaveAttribute('aria-hidden', 'true');

    // And the field still takes what is typed next.
    fireEvent.change(field(), { target: { value: 'ho' } });
    expect(field()).toHaveValue('ほ');
  });

  test('is gone before it can be in the way', () => {
    render(<Field />);
    fireEvent.change(field(), { target: { value: 'ichinensei' } });

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.queryByTestId('award-rise')).not.toBeInTheDocument();
  });
});
