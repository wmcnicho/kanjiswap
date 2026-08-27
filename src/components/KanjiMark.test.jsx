import { render, screen } from '@testing-library/react';
import KanjiMark from './KanjiMark';

test('renders as a labelled image at the size asked for', () => {
  render(<KanjiMark size={40} />);
  const mark = screen.getByRole('img', { name: /kanjiswap/i });
  expect(mark).toHaveAttribute('width', '40');
});

test('draws real outlines rather than text, so it needs no font', () => {
  const { container } = render(<KanjiMark />);
  // Two glyphs, the sweep, and its arrowhead.
  expect(container.querySelectorAll('path')).toHaveLength(3);
  expect(container.querySelector('polygon')).toBeInTheDocument();
  expect(container.querySelector('text')).toBeNull();
});

test('takes its colour from the text around it', () => {
  const { container } = render(<KanjiMark />);
  expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
});
