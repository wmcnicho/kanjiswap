import { render } from '@testing-library/react';
import SwapPassage from './SwapPassage';

const passage = { with_furigana: '私(わたし)は本(ほん)を読(よ)みます。\n花(はな)がすきです。' };

test('lays the passage out left to right by default', () => {
  const { container } = render(<SwapPassage passage={passage} />);
  expect(container.firstChild).not.toHaveStyle({ writingMode: 'vertical-rl' });
});

test('runs top to bottom, right to left, when asked', () => {
  const { container } = render(<SwapPassage passage={passage} vertical />);
  // Block flow turns with the writing mode, so lines stack right to left.
  expect(container.firstChild).toHaveStyle({ writingMode: 'vertical-rl' });
});
