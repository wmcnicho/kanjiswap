import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './SwapWord';
import { KEY_TO_INDEX } from './SwapOptions';
import { parsePassage, buildSwapOptions, swapSegments } from '../utils/passage';
import { wordKey } from '../utils/progress';

// Long enough for the green flash to register before the next word opens.
const ADVANCE_MS = 620;

function SwapPassage({
  passage,
  vertical = false,
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

  // The word the keyboard is aimed at, and whose choices are open.
  const [activeKey, setActiveKey] = useState(null);
  const usingKeyboard = useRef(false);
  const words = useRef({});
  const advance = useRef(null);

  const activeSegment = order.find((segment) => segment.key === activeKey) ?? null;

  useEffect(() => () => clearTimeout(advance.current), []);

  // The next word still to be solved, continuing from this one and wrapping
  // round to anything skipped earlier.
  const nextAfter = useCallback((key) => {
    const index = order.findIndex((segment) => segment.key === key);
    const rest = [...order.slice(index + 1), ...order.slice(0, Math.max(index, 0))];
    return rest.find((segment) => segment.key !== key && !isSolved(segment.key))?.key ?? null;
  }, [order, isSolved]);

  const handleAttempt = (segment, correct, chosen) => {
    onAttempt?.(segment, correct, chosen);
    if (correct) {
      // Carry on to the next word so play keeps its rhythm; a wrong guess stays
      // put, because the word hasn't been answered yet.
      clearTimeout(advance.current);
      advance.current = setTimeout(() => setActiveKey(nextAfter(segment.key)), ADVANCE_MS);
    }
  };

  useEffect(() => {
    const handleKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      const index = KEY_TO_INDEX[event.key.toLowerCase()];
      if (index === undefined) {
        return;
      }
      const target = activeSegment ?? order.find((segment) => !isSolved(segment.key));
      if (!target) {
        return;
      }
      event.preventDefault();
      usingKeyboard.current = true;
      onRevealHints?.();

      if (!activeSegment) {
        setActiveKey(target.key); // The first key press picks a word to play, rather than answering blind
        return;
      }
      const option = target.options[index];
      if (option) {
        words.current[target.key]?.choose(option);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSegment, order, isSolved, onRevealHints]);

  // Vertical Japanese runs top-to-bottom, and successive lines stack to the
  // left — which `vertical-rl` gives for free, since block flow turns with the
  // writing mode. The overflow axis turns with it too.
  const layout = vertical
    ? {
        writingMode: 'vertical-rl',
        height: 'min(60vh, 520px)',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        px: 1,
      }
    : { maxWidth: '700px' };

  return (
    <Box sx={layout}>
      {lines.map((segments, lineIndex) => (
        <Typography key={lineIndex} variant='h5' sx={{ lineHeight: 2.5, minHeight: '1em' }}>
          {segments.map((segment, segmentIndex) =>
            segment.type === 'swap' ? (
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
                hintsVisible={hintsVisible}
                onAttempt={(correct, chosen) => handleAttempt(segment, correct, chosen)}
                onActivate={() => setActiveKey(segment.key)}
                onDeactivate={() => {
                  // Once someone is playing by keyboard, moving the mouse away
                  // shouldn't close the word they're aiming at.
                  if (!usingKeyboard.current) {
                    setActiveKey((current) => (current === segment.key ? null : current));
                  }
                }}
                onHintDelayElapsed={onRevealHints}
              />
            ) : (
              <React.Fragment key={segmentIndex}>{segment.text}</React.Fragment>
            )
          )}
        </Typography>
      ))}
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
