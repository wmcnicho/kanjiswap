import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './SwapWord';
import { parsePassage, buildSwapOptions, swapSegments } from '../utils/passage';
import { wordKey } from '../utils/progress';

function SwapPassage({ passage, progress = {}, onAttempt }) {
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

  return (
    <Box maxWidth="700px">
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
                solved={progress[segment.key]?.solved === true}
                onAttempt={(correct) => onAttempt?.(segment.key, correct)}
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
