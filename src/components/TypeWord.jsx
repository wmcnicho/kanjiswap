import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { finalizeKana, toKana } from '../utils/kana';
import { debugEnabled } from '../features';

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
  // Only shown with ?debug — what the field actually received, so a report can
  // say which half is failing rather than "it doesn't work".
  const [lastRaw, setLastRaw] = useState('');
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
  //
  // What's shown keeps a trailing "n" pending, because the next key may make it
  // な rather than ん. What's *checked* settles it — by then there is no next
  // key. So "hon" reads as ほn while it's being typed and counts as ほん.
  const consider = (text) => {
    const shown = toKana(text);
    setTyped(shown);
    if (finalizeKana(shown) === reading) {
      setTyped(reading); // Leave the settled reading on screen, not ほn
      succeed();
    }
  };

  const handleChange = (event) => {
    setLastRaw(event.target.value);
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
    if (event.key === 'Enter' && typed.length > 0 && finalizeKana(typed) !== reading) {
      event.preventDefault();
      fail(typed);
    }
  };

  // Lets the passage answer this word directly, the way a click answers a choice.
  useImperativeHandle(ref, () => ({
    choose: (item) => (item === reading ? succeed() : fail(item)),
  }));

  const colour = flash === 'success' ? 'green' : flash === 'failure' ? 'red' : 'inherit';
  const asking = active && !answered;

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        verticalAlign: 'bottom',
        mx: 0.25,
      }}
      onClick={() => onActivate?.()}
    >
      {/* Where the furigana goes: a real field while it's being answered, the
          reading itself once it has been. An input the reader can see is also
          an input an IME can draw its composition into — the invisible one this
          replaces left them typing into nothing. */}
      <Box
        component='span'
        data-testid='reading-slot'
        sx={{
          fontSize: '0.5em',
          lineHeight: 1.4,
          minHeight: '1.4em',
          color: answered ? 'text.secondary' : 'text.primary',
          opacity: answered && !furiganaShown ? 0 : 1,
          transition: `opacity ${FURIGANA_FADE_MS}ms ease-out`,
        }}
      >
        {asking ? (
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
            lang='ja'
            sx={{
              font: 'inherit',
              color: 'inherit',
              textAlign: 'center',
              // Grows with what's typed, so the reading's length isn't given away.
              width: `${Math.max(3, typed.length + 1)}ch`,
              border: 0,
              borderBottom: '1px dotted',
              borderRadius: 0,
              outline: 'none',
              background: 'transparent',
              padding: 0,
            }}
          />
        ) : (
          answered ? reading : ''
        )}
      </Box>

      <Typography
        ref={wordRef}
        component='span'
        variant={variant}
        data-active={active || undefined}
        sx={{
          color: colour,
          cursor: answered ? 'inherit' : 'pointer',
          borderBottom: answered ? 'none' : '2px dotted',
          backgroundColor: asking ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
          borderRadius: 1,
          px: 0.25,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {kanji}
      </Typography>

      {debugEnabled() && asking && (
        <Box
          component='span'
          data-testid='type-debug'
          sx={{ fontSize: '0.32em', color: 'text.secondary', whiteSpace: 'nowrap', mt: 0.5 }}
        >
          raw:{lastRaw || '∅'} · composing:{composing.current ? 'yes' : 'no'} · kana:{typed || '∅'} · want:{reading}
        </Box>
      )}
    </Box>
  );
});

export default TypeWord;
