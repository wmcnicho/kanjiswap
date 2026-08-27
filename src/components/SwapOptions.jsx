import React from 'react';
import { Box, Grid, Typography } from '@mui/material';

// The keys that pick an option, in order: home row for the fingers, numbers for
// everyone who reaches for them instead.
export const OPTION_KEYS = ['a', 's', 'd', 'f'];
export const OPTION_DIGITS = ['1', '2', '3', '4'];

export const KEY_TO_INDEX = Object.fromEntries([
  ...OPTION_KEYS.map((key, index) => [key, index]),
  ...OPTION_DIGITS.map((digit, index) => [digit, index]),
]);

// The tooltip's contents: the candidate kanji, and — once the reader has hung
// around long enough to want them — the keys that pick each one.
function SwapOptions({ options, onChoose, hintsVisible = false }) {
  return (
    <Box color="primary.contrastText" p={{ xs: 0.5, md: 1 }}>
      <Grid container spacing={{ xs: 1, md: 2 }}>
        {options.map((option, index) => (
          <Grid item xs={4} key={option}>
            <Box
              data-option={option}
              sx={{
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                // A comfortable target for a fingertip, not just a cursor.
                minWidth: { xs: 44, md: 'auto' },
                minHeight: { xs: 44, md: 'auto' },
                px: { xs: 1.5, md: 1 },
                py: { xs: 1, md: 1 },
                borderRadius: 1,
                WebkitTapHighlightColor: 'transparent',
                '&:active': { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
              }}
              onClick={() => onChoose(option)}
            >
              {option}
              <Typography
                variant='caption'
                component='div'
                sx={{
                  fontSize: '0.55rem',
                  lineHeight: 1.4,
                  opacity: hintsVisible ? 0.65 : 0,
                  transition: 'opacity 400ms ease-out',
                }}
              >
                {OPTION_KEYS[index]} · {OPTION_DIGITS[index]}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default SwapOptions;
