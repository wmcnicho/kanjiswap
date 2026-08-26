import { createTheme } from '@mui/material/styles';

// Japanese faces the student can read in. Each is loaded from Google Fonts in
// public/index.html; the browser only fetches the glyph ranges it renders.
export const FONTS = [
  { id: 'noto-sans', label: 'Noto Sans JP', sample: 'ゴシック', stack: "'Noto Sans JP'" },
  { id: 'klee', label: 'Klee One', sample: '教科書体', stack: "'Klee One'" },
  { id: 'noto-serif', label: 'Noto Serif JP', sample: '明朝', stack: "'Noto Serif JP'" },
  { id: 'zen-maru', label: 'Zen Maru Gothic', sample: '丸ゴシック', stack: "'Zen Maru Gothic'" },
];

export const DEFAULT_FONT = FONTS[0].id;

export function fontById(id) {
  return FONTS.find((font) => font.id === id) ?? FONTS[0];
}

// One quiet type scale and a paper-like ground: the passage is the only thing
// on screen that should draw the eye, so nothing else gets weight or colour it
// hasn't earned.
export function buildTheme(fontId) {
  const font = fontById(fontId);

  return createTheme({
    palette: {
      background: { default: '#fbfaf8', paper: '#fbfaf8' },
      text: { primary: '#1c1b19', secondary: '#77736c' },
      primary: { main: '#3b3a37' },
      success: { main: '#4a7a52' },
      error: { main: '#b4483c' },
      divider: 'rgba(0, 0, 0, 0.07)',
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: [font.stack, '"Hiragino Sans"', '"Yu Gothic"', 'system-ui', 'sans-serif'].join(', '),
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      h5: { fontWeight: 400, letterSpacing: '0.03em' },
      subtitle1: { fontWeight: 500, letterSpacing: '0.04em' },
      body2: { letterSpacing: '0.02em' },
      caption: { letterSpacing: '0.02em' },
      button: { textTransform: 'none', letterSpacing: '0.03em' },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiDrawer: {
        styleOverrides: { paper: { backgroundColor: '#f6f4f1', borderRight: '1px solid rgba(0,0,0,0.06)' } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: '#2a2926', fontSize: '1.05rem', padding: 0 },
          arrow: { color: '#2a2926' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: 'rgba(0,0,0,0.06)' } },
      },
    },
  });
}
