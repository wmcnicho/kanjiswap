import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './SwapWord';
import TypeWord from './TypeWord';
import ReadingComposer from './ReadingComposer';
import { KEY_TO_INDEX } from './SwapOptions';
import { parsePassage, buildSwapOptions, swapSegments } from '../utils/passage';
import { wordKey } from '../utils/progress';

// Long enough for the green flash to register before the next word opens.
const ADVANCE_MS = 620;
// Typing needs a much shorter one: the reader is mid-flow with their hands on
// the keys, and 600ms of nothing between words reads as the app hesitating.
// Typing advances at once. The word's own flash and its furigana play out
// behind the reader, who is already answering the next one — waiting for an
// animation is what stops someone going fast.
const TYPED_ADVANCE_MS = 0;

// A new passage shows its first word's choices on its own, once the reader has
// had a moment to look at the text. Any move — hovering, tapping, a key —
// brings them up immediately instead.
const AUTO_OPEN_MS = 2000;

// Stepping between words. Reading order runs left-to-right, or top-to-bottom
// and then leftwards when the passage is set vertically, and the arrow keys
// follow whichever is in force.
const STEP_KEYS = {
  horizontal: { next: ['e', 'arrowright', 'arrowdown'], previous: ['q', 'arrowleft', 'arrowup'] },
  vertical: { next: ['e', 'arrowdown', 'arrowleft'], previous: ['q', 'arrowup', 'arrowright'] },
};

function SwapPassage({
  passage,
  vertical = false,
  typing = false, // kanji on the page, reading typed in — the other direction
  totals = { points: 0, streak: 0 },
  isSolved = () => false,
  hintsVisible = false,
  onAttempt,
  onRevealHints,
}) {
  // Parse once per passage, and attach a stable option list and progress key to
  // every swap segment so the choices don't reshuffle on re-render.
  const lines = useMemo(() => {
    const parsedLines = parsePassage(passage.with_furigana);
    const passageWords = swapSegments(parsedLines).map((segment) => segment.kanji);
    return parsedLines.map((segments, lineIndex) =>
      segments.map((segment, segmentIndex) =>
        segment.type === 'swap'
          ? {
              ...segment,
              key: wordKey(lineIndex, segmentIndex, segment.kanji),
              options: buildSwapOptions(segment.kanji, passageWords),
            }
          : segment
      )
    );
  }, [passage]);

  // Every swappable word in reading order — the order play moves through.
  const order = useMemo(() => lines.flat().filter((segment) => segment.type === 'swap'), [lines]);

  // The word the keyboard is aimed at. Something is always aimed at — the next
  // word still to be solved, until the reader picks a different one — so the
  // passage can be played from the first keystroke without hunting for a start.
  const [chosenKey, setChosenKey] = useState(null);
  // The choices themselves only appear once the reader is playing, rather than
  // opening a popup over an untouched passage.
  const [playing, setPlaying] = useState(false);
  // What's being typed for the word on hand, in the reading direction. It lives
  // here rather than in the word so one field at the top can serve them all.
  const [typed, setTyped] = useState('');
  const usingKeyboard = useRef(false);
  const words = useRef({});
  const advance = useRef(null);
  const autoOpen = useRef(null);

  const unsolved = order.filter((segment) => !isSolved(segment.key));
  const activeSegment = unsolved.find((segment) => segment.key === chosenKey) ?? unsolved[0] ?? null;
  const activeKey = activeSegment?.key ?? null;

  useEffect(() => () => clearTimeout(advance.current), []);

  // App remounts this per passage and per attempt, so mounting is the moment a
  // new exercise opens.
  useEffect(() => {
    if (typing) {
      return undefined; // Nothing to reveal: the reader types into the word itself
    }
    autoOpen.current = setTimeout(() => setPlaying(true), AUTO_OPEN_MS);
    return () => clearTimeout(autoOpen.current);
  }, [typing]);

  const beginPlaying = useCallback(() => {
    clearTimeout(autoOpen.current); // Beaten to it; don't fire again later
    setPlaying(true);
  }, []);

  // The next word still to be solved, continuing from this one and wrapping
  // round to anything skipped earlier.
  const nextAfter = useCallback((key) => {
    const index = order.findIndex((segment) => segment.key === key);
    const rest = [...order.slice(index + 1), ...order.slice(0, Math.max(index, 0))];
    return rest.find((segment) => segment.key !== key && !isSolved(segment.key))?.key ?? null;
  }, [order, isSolved]);

  // Steps to the next or previous word still to be solved, wrapping round.
  const step = useCallback((direction) => {
    if (unsolved.length === 0) {
      return;
    }
    const at = unsolved.findIndex((segment) => segment.key === activeKey);
    const to = (at + direction + unsolved.length) % unsolved.length;
    setChosenKey(unsolved[to].key);
  }, [unsolved, activeKey]);

  // A fresh word starts with an empty field.
  useEffect(() => {
    setTyped('');
  }, [activeKey]);

  // The composer offers a reading; the word decides what became of it, exactly
  // as a clicked choice does in the other direction.
  const offerReading = (text) => {
    if (!activeSegment) {
      return;
    }
    handleAttempt(activeSegment, text === activeSegment.reading, text);
    words.current[activeSegment.key]?.choose(text);
    setTyped('');
  };

  const handleAttempt = (segment, correct, chosen) => {
    onAttempt?.(segment, correct, chosen);
    if (!correct) {
      return; // A wrong guess stays put: the word hasn't been answered yet
    }
    // Carry on to the next word so play keeps its rhythm.
    clearTimeout(advance.current);
    if (typing && TYPED_ADVANCE_MS === 0) {
      setChosenKey(nextAfter(segment.key)); // No wait at all — go as fast as you can type
      return;
    }
    advance.current = setTimeout(
      () => setChosenKey(nextAfter(segment.key)),
      typing ? TYPED_ADVANCE_MS : ADVANCE_MS
    );
  };

  useEffect(() => {
    if (typing) {
      return undefined; // Every key belongs to the answer being typed
    }
    const steps = STEP_KEYS[vertical ? 'vertical' : 'horizontal'];

    const handleKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      const index = KEY_TO_INDEX[key];
      const stepping = steps.next.includes(key) ? 1 : steps.previous.includes(key) ? -1 : 0;
      if (index === undefined && stepping === 0) {
        return;
      }
      if (!activeSegment) {
        return; // Nothing left to answer
      }
      event.preventDefault(); // Arrow keys would otherwise scroll the passage away
      usingKeyboard.current = true;
      onRevealHints?.();

      if (stepping !== 0) {
        beginPlaying();
        step(stepping);
        return;
      }
      if (!playing) {
        beginPlaying(); // The first key press shows the choices rather than answering blind
        return;
      }
      const option = activeSegment.options[index];
      if (option) {
        words.current[activeSegment.key]?.choose(option);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSegment, playing, step, typing, vertical, beginPlaying, onRevealHints]);

  // Vertical Japanese runs top-to-bottom, and successive lines stack to the
  // left — which `vertical-rl` gives for free, since block flow turns with the
  // writing mode. The overflow axis turns with it too.
  const layout = vertical
    ? {
        writingMode: 'vertical-rl',
        // dvh rather than vh: a phone's address bar shouldn't crop the text.
        height: 'min(60vh, 520px)',
        '@supports (height: 60dvh)': { height: 'min(60dvh, 520px)' },
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        // Vertical text scrolls sideways, which is also the gesture a phone
        // reads as "go back a page".
        overscrollBehaviorX: 'contain',
        px: 1,
      }
    : { maxWidth: '700px', width: '100%' };

  const body = (
    <Box sx={layout}>
      {lines.map((segments, lineIndex) => (
        <Typography
          key={lineIndex}
          variant='h5'
          // Furigana needs headroom above each line; a narrow screen needs the
          // vertical space more.
          sx={{ lineHeight: { xs: 2.2, md: 2.5 }, minHeight: '1em' }}
        >
          {segments.map((segment, segmentIndex) =>
            segment.type !== 'swap' ? (
              <React.Fragment key={segmentIndex}>{segment.text}</React.Fragment>
            ) : typing ? (
              <TypeWord
                key={segment.key}
                ref={(handle) => { words.current[segment.key] = handle; }}
                kanji={segment.kanji}
                reading={segment.reading}
                variant='h5'
                solved={isSolved(segment.key)}
                active={segment.key === activeKey}
                pending={segment.key === activeKey ? typed : ''}
                onActivate={() => setChosenKey(segment.key)}
              />
            ) : (
              <SwapWord
                key={segment.key}
                ref={(handle) => { words.current[segment.key] = handle; }}
                reading={segment.reading}
                correctItem={segment.kanji}
                options={segment.options}
                variant='h5'
                placement={vertical ? 'left' : 'bottom'}
                solved={isSolved(segment.key)}
                active={segment.key === activeKey}
                choicesOpen={playing}
                hintsVisible={hintsVisible}
                onAttempt={(correct, chosen) => handleAttempt(segment, correct, chosen)}
                onActivate={() => {
                  setChosenKey(segment.key);
                  beginPlaying();
                }}
                onDeactivate={() => {
                  // Once someone is playing by keyboard, moving the mouse away
                  // shouldn't close the word they're aiming at.
                  if (!usingKeyboard.current) {
                    clearTimeout(autoOpen.current);
                    setPlaying(false);
                  }
                }}
                onHintDelayElapsed={onRevealHints}
              />
            )
          )}
        </Typography>
      ))}
    </Box>
  );

  if (!typing) {
    return body;
  }

  // One field, above the passage, serving whichever word is on hand.
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {activeSegment && (
        <ReadingComposer
          kanji={activeSegment.kanji}
          reading={activeSegment.reading}
          points={totals.points}
          streak={totals.streak}
          value={typed}
          onValueChange={setTyped}
          onOffer={offerReading}
          onStep={step}
        />
      )}
      {body}
    </Box>
  );
}

// Don't steal keys from the font picker or anything else being typed into.
function isTyping(target) {
  if (!target || !target.tagName) {
    return false;
  }
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    || target.isContentEditable
    || target.getAttribute?.('role') === 'combobox';
}

export default SwapPassage;
