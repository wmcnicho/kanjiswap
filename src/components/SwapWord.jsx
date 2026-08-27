import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import SwapOptions from './SwapOptions';

const FLASH_MS = 500;          // How long the word colours before it swaps
const FURIGANA_HOLD_MS = 2200; // How long the reading stays after the swap
const FURIGANA_FADE_MS = 900;
const HINT_DELAY_MS = 3000;    // Hovering this long means you're looking for something

const SwapWord = forwardRef(function SwapWord({
  reading,
  correctItem,
  options,
  variant = 'h5',
  solved = false,
  placement = 'bottom',
  active = false,
  hintsVisible = false,
  onAttempt,
  onActivate,
  onDeactivate,
  onHintDelayElapsed,
}, ref) {
  // A word solved earlier in this attempt starts out already swapped, without
  // the flash or the furigana — both belong to the click that earned them.
  const [swappedItem, setSwappedItem] = useState(solved ? correctItem : null);
  const [flash, setFlash] = useState(null); // 'success' | 'failure' | null
  const [furiganaShown, setFuriganaShown] = useState(false);
  const timers = useRef([]);
  const wordRef = useRef(null);

  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Keep the word being played in view — the keyboard can walk past the fold.
  useEffect(() => {
    if (active) {
      // Optional call: jsdom and older browsers don't implement it.
      wordRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [active]);

  // The reader has been hovering a while without choosing: show them the keys.
  useEffect(() => {
    if (!active || hintsVisible) {
      return undefined;
    }
    const timer = setTimeout(() => onHintDelayElapsed?.(), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, hintsVisible, onHintDelayElapsed]);

  const succeed = (clickedItem) => {
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

  const fail = (clickedItem) => {
    onAttempt?.(false, clickedItem);
    setFlash('failure'); // Change text color to red
    later(() => setFlash(null), FLASH_MS);
  };

  const choose = (item) => {
    if (swappedItem) {
      return; // Already solved; nothing left to pick
    }
    if (item === correctItem) {
      succeed(item);
    } else {
      fail(item);
    }
  };

  // Lets the passage play this word from the keyboard, through exactly the same
  // path a click takes.
  useImperativeHandle(ref, () => ({ choose }));

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
      ref={wordRef}
      component='span'
      variant={variant}
      // A tap has to open the choices. MUI only opens a tooltip on touch after
      // a long press, which is not something anyone will guess.
      onClick={() => (active ? onDeactivate?.() : onActivate?.())}
      sx={{
        color,
        cursor: 'pointer',
        borderBottom: '2px dotted', // Mark words still waiting for their kanji
        // Keeps a finger from landing between two words on a phone.
        py: 0.35,
        WebkitTapHighlightColor: 'transparent',
        // The word the keyboard is aimed at, marked without shouting about it.
        backgroundColor: active ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
        borderRadius: 1,
        transition: 'background-color 150ms',
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
      open={active}
      onOpen={() => onActivate?.()}
      onClose={() => onDeactivate?.()}
      title={<SwapOptions options={options} onChoose={choose} hintsVisible={hintsVisible} />}
      placement={placement}
      arrow
    >
      {unsolvedWord}
    </Tooltip>
  );
});

export default SwapWord;
