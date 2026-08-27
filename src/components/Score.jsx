import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

const FLASH_MS = 800;   // How long the number holds its brighter tone
const DELTA_MS = 1600;  // How long the gain stays legible before it goes

// A running score that says when it moved. The number sits in a faint well so
// it reads as a figure rather than as more prose, and takes a warmer tone for a
// moment when it goes up, with the gain alongside it.
function Score({ value, label, showDelta = false }) {
  const previous = useRef(value);
  const [gain, setGain] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const gained = value - previous.current;
    previous.current = value;
    if (gained <= 0) {
      return undefined; // Starting a fresh attempt resets the score; that isn't a win
    }
    setGain(gained);
    setFlash(true);
    const stopFlash = setTimeout(() => setFlash(false), FLASH_MS);
    const clearGain = setTimeout(() => setGain(0), DELTA_MS);
    return () => {
      clearTimeout(stopFlash);
      clearTimeout(clearGain);
    };
  }, [value]);

  return (
    <Box component='span' sx={{ whiteSpace: 'nowrap' }}>
      <Box
        component='span'
        data-testid='score-value'
        sx={{
          px: 0.6,
          py: 0.1,
          borderRadius: 0.75,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          color: flash ? 'success.main' : 'inherit',
          backgroundColor: flash ? 'rgba(74, 122, 82, 0.14)' : 'rgba(0, 0, 0, 0.045)',
          transition: `color ${FLASH_MS}ms ease-out, background-color ${FLASH_MS}ms ease-out`,
        }}
      >
        {value}
      </Box>
      {label ? ` ${label}` : ''}
      {showDelta && (
        <Box
          component='span'
          data-testid='score-gain'
          sx={{
            ml: 0.5,
            color: 'success.main',
            fontVariantNumeric: 'tabular-nums',
            opacity: gain > 0 ? 1 : 0,
            transition: `opacity ${gain > 0 ? 120 : 700}ms ease-out`,
          }}
        >
          {gain > 0 ? `(+${gain})` : ' '}
        </Box>
      )}
    </Box>
  );
}

export default Score;
