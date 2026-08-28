import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Typing is a faster loop than clicking a choice: the answer arrives on the
// keystroke that completes it, and the next word should be ready by the time
// the reader's hands have caught up. So the green is brief and the reading
// clears quickly — it carries on fading while the next word is being typed.
const FLASH_MS = 200;          // How long the word colours before it settles
const FURIGANA_HOLD_MS = 900;  // How long the reading stays once it's right
const FURIGANA_FADE_MS = 500;

// A word in the reading direction: the kanji, with whatever is being typed
// shown small above it, where its furigana belongs.
//
// It holds no input of its own. Typing happens in one field at the top of the
// passage, and what's typed is mirrored here — an input per word broke the line
// into a row of boxes and the passage stopped reading like text.
const TypeWord = forwardRef(function TypeWord({
  kanji,
  reading,
  variant = 'h5',
  solved = false,
  active = false,
  pending = '',
  onActivate,
}, ref) {
  const [answered, setAnswered] = useState(solved);
  const [flash, setFlash] = useState(null); // 'success' | 'failure' | null
  const [furiganaShown, setFuriganaShown] = useState(false);
  const timers = useRef([]);
  const wordRef = useRef(null);

  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (active && !answered) {
      // Optional call: jsdom and older browsers don't implement it.
      wordRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [active, answered]);

  const succeed = () => {
    setFlash('success');
    later(() => {
      setAnswered(true);
      setFlash(null);
      setFuriganaShown(true);
      later(() => setFuriganaShown(false), FURIGANA_HOLD_MS);
    }, FLASH_MS);
  };

  const fail = () => {
    setFlash('failure');
    later(() => setFlash(null), FLASH_MS);
  };

  // The composer offers an answer; this word says what became of it.
  useImperativeHandle(ref, () => ({
    choose: (item) => (item === reading ? succeed() : fail()),
  }));

  const colour = flash === 'success' ? 'green' : flash === 'failure' ? 'red' : 'inherit';
  const above = answered ? reading : pending;

  return (
    <Typography
      ref={wordRef}
      component='ruby'
      variant={variant}
      data-active={active || undefined}
      onClick={() => onActivate?.()}
      sx={{
        color: colour,
        rubyPosition: 'over',
        cursor: answered ? 'inherit' : 'pointer',
        borderBottom: answered ? 'none' : '2px dotted',
        backgroundColor: active && !answered ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
        borderRadius: 1,
        py: 0.35,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {kanji}
      <Box
        component='rt'
        data-testid='reading-slot'
        sx={{
          fontSize: '0.45em',
          fontWeight: 400,
          color: answered ? 'text.secondary' : 'text.primary',
          // The reading fades once it has been seen; what's mid-typing doesn't.
          opacity: answered && !furiganaShown ? 0 : 1,
          transition: `opacity ${FURIGANA_FADE_MS}ms ease-out`,
        }}
      >
        {above}
      </Box>
    </Typography>
  );
});

export default TypeWord;
