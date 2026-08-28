import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { finalizeKana, toKana } from '../utils/kana';
import { buildStamp, debugEnabled } from '../features';

// Where the reading gets typed: one field, large, pinned above the passage.
//
// The word being answered is shown here at size, so there is somewhere to look
// while typing that isn't 0.45em furigana — and an IME has room to put its
// candidate window without covering the text.
// How long the reward sits beside the field before it goes.
const AWARD_MS = 900;

function ReadingComposer({ kanji, value, reading, points = 0, streak = 0, onValueChange, onOffer, onStep }) {
  const inputRef = useRef(null);
  const composing = useRef(false);
  const lastRaw = useRef('');
  // What the last correct answer was worth, shown beside the field. Reading it
  // off the running score means it can't disagree with the score itself.
  const scored = useRef(points);
  const [award, setAward] = useState(null);

  useEffect(() => {
    const gained = points - scored.current;
    scored.current = points;
    if (gained <= 0) {
      return undefined; // A new attempt resets the score; that isn't a win
    }
    setAward({ gained, streak });
    const timer = setTimeout(() => setAward(null), AWARD_MS);
    return () => clearTimeout(timer);
  }, [points, streak]);

  // Every new word gets the caret, so the passage can be played straight
  // through without reaching for the mouse.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [kanji]);

  // Converting the whole string each time is what lets romaji and kana mix:
  // kana passes through, and half-typed romaji stays visible. A trailing "n"
  // is left pending — the next key decides whether it's ん or な — and settles
  // only when the answer is offered.
  const consider = (text) => {
    const shown = toKana(text);
    onValueChange(shown);
    if (finalizeKana(shown) === reading) {
      onOffer(reading);
    }
  };

  const handleChange = (event) => {
    lastRaw.current = event.target.value;
    if (composing.current) {
      // Mid-composition the text belongs to the IME, not to us. Rewriting it
      // here resets the IME's own buffer and mangles what the reader typed.
      onValueChange(event.target.value);
      return;
    }
    consider(event.target.value);
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
    if (event.key === 'Enter' && value.length > 0) {
      event.preventDefault();
      onOffer(finalizeKana(value));
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        // Flush under the header bar on a phone, near the top on a desktop.
        top: { xs: 'var(--app-header)', md: 8 },
        zIndex: 3,
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        py: { xs: 0.75, md: 1.5 },
        mb: { xs: 1, md: 2 },
        // Bleeds to the screen edges, so nothing scrolls past beside it.
        mx: { xs: -1, md: 0 },
        px: { xs: 1, md: 0 },
        width: 'auto',
        minWidth: '100%',
        backgroundColor: 'background.default',
        // Opaque all the way across, or the passage shows through as it passes.
        boxShadow: (theme) => `0 6px 6px -6px ${theme.palette.divider}`,
      }}
    >
      <Typography variant='h4' component='div' sx={{ lineHeight: 1.2, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
        {kanji}
      </Typography>

      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {award && (
          // Beside the field on a wide screen, under it on a narrow one, where
          // there is no room to the side. Never in the flow: the field must not
          // move while someone is typing into it.
          <Box
            data-testid='award'
            sx={{
              position: 'absolute',
              left: { xs: '50%', md: '100%' },
              top: { xs: '100%', md: '50%' },
              transform: { xs: 'translateX(-50%)', md: 'translateY(-50%)' },
              ml: { xs: 0, md: 1.5 },
              mt: { xs: 0.25, md: 0 },
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.5,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              color: 'success.main',
              fontVariantNumeric: 'tabular-nums',
              animation: `kanjiswap-award ${AWARD_MS}ms ease-out forwards`,
              '@keyframes kanjiswap-award': {
                '0%': { opacity: 0, transform: 'translate(var(--award-x, 0), 6px)' },
                '25%': { opacity: 1 },
                '100%': { opacity: 0 },
              },
            }}
          >
            <Box component='span' sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
              (+{award.gained})
            </Box>
            {award.streak > 1 && (
              <Box component='span' sx={{ fontSize: '0.8rem' }}>
                ×{award.streak}
              </Box>
            )}
          </Box>
        )}
        {value === '' && (
          // A placeholder attribute is a plain string and can carry no ruby, so
          // the prompt is drawn over the empty field instead. Clicks fall
          // through to the input beneath it.
          // Ruby reserves a line above the text, which pushed 読み方 down onto
          // the field's own underline. The furigana is floated instead, so the
          // prompt sits exactly where the reader's first character will.
          <Box
            component='span'
            aria-hidden='true'
            sx={{
              position: 'absolute',
              top: 0,
              py: 0.5,
              fontSize: '1.35rem',
              lineHeight: 1.4,
              color: 'text.secondary',
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          >
            <Box component='span' sx={{ position: 'relative' }}>
              読み方
              <Box
                component='span'
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '-0.8em',
                  fontSize: '0.4em',
                  textAlign: 'center',
                }}
              >
                よみかた
              </Box>
            </Box>
          </Box>
        )}

        <Box
          component='input'
          ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={(event) => {
          composing.current = false;
          consider(event.target.value);
        }}
        aria-label={`Reading for ${kanji}`}
        autoComplete='off'
        autoCapitalize='off'
        autoCorrect='off'
        spellCheck='false'
        lang='ja'
        sx={{
          font: 'inherit',
          fontSize: '1.35rem',
          textAlign: 'center',
          color: 'text.primary',
          width: 'min(260px, 70vw)',
          border: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          outline: 'none',
          background: 'transparent',
          py: 0.5,
            '&:focus': { borderColor: 'text.secondary' },
          ...(award ? { borderColor: 'success.main', color: 'success.main' } : {}),
          transition: 'border-color 200ms ease-out, color 200ms ease-out',
          }}
        />
      </Box>

      {debugEnabled() && (
        <Typography variant='caption' color='text.secondary' data-testid='type-debug'>
          build:{buildStamp()} · raw:{lastRaw.current || '∅'} · kana:{value || '∅'} · want:{reading}
        </Typography>
      )}
    </Box>
  );
}

export default ReadingComposer;
