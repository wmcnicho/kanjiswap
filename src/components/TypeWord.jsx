import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { toKana } from '../utils/kana';

const FLASH_MS = 500;          // How long the word colours before it settles
const FURIGANA_HOLD_MS = 2200; // How long the reading stays once it's right
const FURIGANA_FADE_MS = 900;

// The other way round: the kanji is already there, and the reader types its
// reading into the furigana slot above it. A correct answer is recognised as
// soon as it's complete — there's nothing to submit, because there's only one
// string that can be right.
const TypeWord = forwardRef(function TypeWord({
  kanji,
  reading,
  variant = 'h5',
  solved = false,
  active = false,
  onAttempt,
  onActivate,
  onStep,
}, ref) {
  const [answered, setAnswered] = useState(solved);
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState(null); // 'success' | 'failure' | null
  const [furiganaShown, setFuriganaShown] = useState(false);
  const timers = useRef([]);
  const inputRef = useRef(null);
  const wordRef = useRef(null);
  // True between compositionstart and compositionend — i.e. while a Japanese
  // IME is mid-word and the text on screen isn't committed yet.
  const composing = useRef(false);

  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (active && !answered) {
      inputRef.current?.focus({ preventScroll: true });
      // Optional call: jsdom and older browsers don't implement it.
      wordRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [active, answered]);

  const succeed = () => {
    onAttempt?.(true, reading);
    setFlash('success');
    later(() => {
      setAnswered(true);
      setFlash(null);
      setFuriganaShown(true);
      later(() => setFuriganaShown(false), FURIGANA_HOLD_MS);
    }, FLASH_MS);
  };

  const fail = (attempt) => {
    onAttempt?.(false, attempt);
    setFlash('failure');
    later(() => {
      setFlash(null);
      setTyped(''); // A wrong reading is cleared rather than left to edit around
    }, FLASH_MS);
  };

  // Converting the whole string each time is what lets romaji and kana mix:
  // kana passes through, and half-typed romaji stays visible.
  const consider = (text) => {
    const kana = toKana(text);
    setTyped(kana);
    if (kana === reading) {
      succeed();
    }
  };

  const handleChange = (event) => {
    if (answered) {
      return;
    }
    if (composing.current) {
      // Mid-composition the text belongs to the IME, not to us. Rewriting it
      // here resets the IME's own buffer and mangles what the reader typed.
      setTyped(event.target.value);
      return;
    }
    consider(event.target.value);
  };

  const handleCompositionEnd = (event) => {
    composing.current = false;
    if (!answered) {
      consider(event.target.value);
    }
  };

  // Leaving the word — clicking another, or stepping away — commits whatever is
  // in it. Otherwise a reading typed correctly but never committed is simply
  // lost, and the reader is told nothing.
  const handleBlur = (event) => {
    composing.current = false;
    if (!answered && event.target.value.length > 0) {
      consider(event.target.value);
    }
  };

  const handleKeyDown = (event) => {
    // An IME owns Enter — it's how a composition is committed — and reports so
    // through isComposing. Treating that Enter as an answer marks the word
    // wrong at the exact moment the reader finishes typing it correctly.
    if (event.nativeEvent?.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault(); // Tab walks the passage, not the page
      onStep?.(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'Enter' && typed.length > 0 && typed !== reading) {
      event.preventDefault();
      fail(typed);
    }
  };

  // Lets the passage answer this word directly, the way a click answers a choice.
  useImperativeHandle(ref, () => ({
    choose: (item) => (item === reading ? succeed() : fail(item)),
  }));

  const colour = flash === 'success' ? 'green' : flash === 'failure' ? 'red' : 'inherit';
  const showing = answered ? reading : typed;

  return (
    <Box
      component='span'
      sx={{ position: 'relative', display: 'inline-block' }}
      onClick={() => onActivate?.()}
    >
      <Typography
        ref={wordRef}
        component='ruby'
        variant={variant}
        data-active={active || undefined}
        sx={{
          color: colour,
          rubyPosition: 'over',
          cursor: answered ? 'inherit' : 'pointer',
          // The word being answered is marked, and unanswered ones are dotted,
          // exactly as they are in the other direction.
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
            fontSize: answered ? '0.45em' : '0.5em',
            fontWeight: 400,
            color: answered ? 'text.secondary' : 'text.primary',
            opacity: answered && !furiganaShown ? 0 : 1,
            transition: `opacity ${FURIGANA_FADE_MS}ms ease-out`,
          }}
        >
          {showing}
          {active && !answered && (
            <Box
              component='span'
              aria-hidden='true'
              sx={{
                borderLeft: '1px solid',
                ml: '1px',
                animation: 'kanjiswap-caret 1s steps(2, start) infinite',
                '@keyframes kanjiswap-caret': { to: { visibility: 'hidden' } },
              }}
            />
          )}
        </Box>
      </Typography>

      {active && !answered && (
        <Box
          component='input'
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleBlur}
          aria-label={`Reading for ${kanji}`}
          autoComplete='off'
          autoCapitalize='off'
          autoCorrect='off'
          spellCheck='false'
          // Invisible, but a real input: an IME needs one, and so does a phone's
          // keyboard. It sits over the word so a tap lands on it.
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            border: 0,
            padding: 0,
            margin: 0,
            background: 'transparent',
            font: 'inherit',
          }}
        />
      )}
    </Box>
  );
});

export default TypeWord;
