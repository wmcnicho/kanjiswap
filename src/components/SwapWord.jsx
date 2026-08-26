import React, { useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import SwapOptions from './SwapOptions';

const FLASH_MS = 500;      // How long the word colours green before it swaps
const FURIGANA_HOLD_MS = 2200; // How long the reading stays after the swap
const FURIGANA_FADE_MS = 900;

function SwapWord({ reading, correctItem, options, variant = 'h5', solved = false, placement = 'bottom', onAttempt }) {
  // A word solved earlier in this attempt starts out already swapped, without
  // the flash or the furigana — both belong to the click that earned them.
  const [swappedItem, setSwappedItem] = useState(solved ? correctItem : null);
  const [flash, setFlash] = useState(null); // 'success' | 'failure' | null
  const [furiganaShown, setFuriganaShown] = useState(false);
  const timers = useRef([]);

  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleSuccess = (clickedItem) => {
    onAttempt?.(true, clickedItem);
    setFlash('success'); // Change text color to green
    later(() => {
      setSwappedItem(clickedItem); // Replace text with clicked item
      setFlash(null); // Change text color back to black
      // Hold the reading over the new kanji, then let it go: the point is to
      // see how it's read once, not to leave the answer on the page.
      setFuriganaShown(true);
      later(() => setFuriganaShown(false), FURIGANA_HOLD_MS);
    }, FLASH_MS);
  };

  const handleFailure = (clickedItem) => {
    onAttempt?.(false, clickedItem);
    setFlash('failure'); // Change text color to red
    later(() => setFlash(null), FLASH_MS);
  };

  const color = flash === 'success' ? 'green' : flash === 'failure' ? 'red' : 'inherit';

  // Ruby keeps the reading attached to its kanji and lays out correctly in both
  // writing modes — above when horizontal, to the right when vertical. The
  // faded-out reading keeps its space so the line doesn't shift as it goes.
  const swappedWord = (
    <Typography component='ruby' variant={variant} sx={{ color, rubyPosition: 'over' }}>
      {swappedItem}
      <Box
        component='rt'
        sx={{
          fontSize: '0.45em',
          fontWeight: 400,
          color: 'text.secondary',
          opacity: furiganaShown ? 1 : 0,
          transition: `opacity ${FURIGANA_FADE_MS}ms ease-out`,
        }}
      >
        {reading}
      </Box>
    </Typography>
  );

  const unsolvedWord = (
    <Typography
      component='span'
      variant={variant}
      sx={{
        color,
        cursor: 'pointer',
        borderBottom: '2px dotted', // Mark words still waiting for their kanji
      }}
    >
      {reading}
    </Typography>
  );

  if (swappedItem) {
    return swappedWord; // Solved words no longer offer options
  }

  return (
    <Tooltip
      title={<SwapOptions handleSuccess={handleSuccess} handleFailure={handleFailure} correctItem={correctItem} options={options} />}
      placement={placement}
      arrow
    >
      {unsolvedWord}
    </Tooltip>
  );
}

export default SwapWord;
