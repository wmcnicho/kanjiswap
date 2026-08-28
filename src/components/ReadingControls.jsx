import React from 'react';
import { Box, MenuItem, Select, Tooltip } from '@mui/material';
import { FONTS } from '../theme';
import { DIRECTION } from '../utils/progress';

// Reading settings, parked in the bottom corner: present when looked for,
// quiet otherwise. Each font names itself in its own face.
function ReadingControls({ font, vertical, direction, onFontChange, onWritingModeChange, onDirectionChange }) {
  const typing = direction === DIRECTION.toReading;
  return (
    <Box
      sx={{
        position: 'fixed',
        right: 12,
        // Clear of the home indicator on a phone, and of nothing on a desktop.
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        opacity: 0.45,
        transition: 'opacity 150ms',
        backgroundColor: 'background.default',
        borderRadius: 2,
        '&:hover, &:focus-within': { opacity: 1 },
        // Nothing hovers on a phone, so the controls stay legible there.
        '@media (pointer: coarse)': { opacity: 0.8 },
      }}
    >
      <Tooltip
        title={typing ? 'Switch to supplying the kanji' : 'Switch to typing the reading'}
        placement='top'
      >
        <Box
          component='button'
          type='button'
          aria-label='Exercise direction'
          onClick={() => onDirectionChange(typing ? DIRECTION.toKanji : DIRECTION.toReading)}
          sx={{
            font: 'inherit',
            fontSize: '0.8rem',
            lineHeight: 1,
            color: 'text.secondary',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: 0.5,
            minWidth: 40,
            minHeight: 40,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {typing ? '漢→か' : 'か→漢'}
        </Box>
      </Tooltip>

      <Tooltip title={vertical ? 'Read left to right' : 'Read top to bottom'} placement='top'>
        <Box
          component='button'
          type='button'
          aria-label='Writing direction'
          aria-pressed={vertical}
          onClick={() => onWritingModeChange(!vertical)}
          sx={{
            font: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1,
            color: 'text.secondary',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            p: 0.5,
            minWidth: 40,
            minHeight: 40,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {vertical ? '横' : '縦'}
        </Box>
      </Tooltip>

      <Select
        value={font}
        onChange={(event) => onFontChange(event.target.value)}
        variant='standard'
        disableUnderline
        inputProps={{ 'aria-label': 'Reading font' }}
        SelectDisplayProps={{ 'aria-label': 'Reading font' }}
        sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
      >
        {FONTS.map((option) => (
          <MenuItem key={option.id} value={option.id} sx={{ fontFamily: `${option.stack}, sans-serif` }}>
            {option.sample} · {option.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default ReadingControls;
