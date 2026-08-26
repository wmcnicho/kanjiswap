import React from 'react';
import { Box, MenuItem, Select } from '@mui/material';
import { FONTS } from '../theme';

// Reading settings, parked in the bottom corner: present when looked for,
// quiet otherwise. Each font names itself in its own face.
function ReadingControls({ font, onFontChange }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        opacity: 0.45,
        transition: 'opacity 150ms',
        '&:hover, &:focus-within': { opacity: 1 },
      }}
    >
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
