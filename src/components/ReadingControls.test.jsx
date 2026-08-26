import { fireEvent, render, screen } from '@testing-library/react';
import ReadingControls from './ReadingControls';
import { FONTS } from '../theme';

test('offers every reading font, each named in its own face', () => {
  render(<ReadingControls font={FONTS[0].id} onFontChange={() => {}} />);

  // MUI opens its menu on mousedown rather than a full click.
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /reading font/i }));

  for (const font of FONTS) {
    expect(screen.getByRole('option', { name: new RegExp(font.label) })).toBeInTheDocument();
  }
});

test('reports the font the reader picked', () => {
  const onFontChange = jest.fn();
  render(<ReadingControls font={FONTS[0].id} onFontChange={onFontChange} />);

  // MUI opens its menu on mousedown rather than a full click.
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /reading font/i }));
  fireEvent.click(screen.getByRole('option', { name: new RegExp(FONTS[1].label) }));

  expect(onFontChange).toHaveBeenCalledWith(FONTS[1].id);
});

test('toggles the writing direction', () => {
  const onWritingModeChange = jest.fn();
  const { rerender } = render(
    <ReadingControls font={FONTS[0].id} vertical={false} onFontChange={() => {}} onWritingModeChange={onWritingModeChange} />
  );

  const toggle = screen.getByLabelText(/writing direction/i);
  expect(toggle).toHaveTextContent('縦'); // offers vertical while reading horizontally
  fireEvent.click(toggle);
  expect(onWritingModeChange).toHaveBeenCalledWith(true);

  rerender(
    <ReadingControls font={FONTS[0].id} vertical onFontChange={() => {}} onWritingModeChange={onWritingModeChange} />
  );
  expect(screen.getByLabelText(/writing direction/i)).toHaveTextContent('横');
});
