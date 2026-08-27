import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ReadingComposer from './ReadingComposer';

// The field is controlled by the passage, and feeds its own converted value
// back in on every keystroke — which is where the conversion bugs lived.
function Field({ kanji = '一年生', reading = 'いちねんせい', onOffer = () => {}, onStep }) {
  const [value, setValue] = useState('');
  return (
    <ReadingComposer
      kanji={kanji}
      reading={reading}
      value={value}
      onValueChange={setValue}
      onOffer={onOffer}
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
