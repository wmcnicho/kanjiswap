import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './SwapWord';
import { parsePassage, buildSwapOptions, swapSegments } from '../utils/passage';
import { wordKey } from '../utils/progress';

function SwapPassage({ passage, vertical = false, isSolved = () => false, onAttempt }) {
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
                reading={segment.reading}
                correctItem={segment.kanji}
                options={segment.options}
                variant='h5'
                placement={vertical ? 'left' : 'bottom'}
                solved={isSolved(segment.key)}
                onAttempt={(correct, chosen) => onAttempt?.(segment, correct, chosen)}
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

export default SwapPassage;
