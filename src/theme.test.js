import { DEFAULT_FONT, FONTS, buildTheme, fontById } from './theme';

test('opens in mincho', () => {
  expect(DEFAULT_FONT).toBe('noto-serif');
  expect(fontById(DEFAULT_FONT).label).toBe('Noto Serif JP');
});

test('falls back to the default for a font it does not know', () => {
  // A stored setting can name a face that has since been dropped.
  expect(fontById('retired-face').id).toBe(DEFAULT_FONT);
  expect(fontById(undefined).id).toBe(DEFAULT_FONT);
});

test('builds a theme around whichever face is asked for', () => {
  for (const font of FONTS) {
    expect(buildTheme(font.id).typography.fontFamily).toContain(font.stack);
  }
});
