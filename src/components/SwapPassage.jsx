import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './SwapWord';
import { parsePassage, buildSwapOptions } from '../utils/passage';

function SwapPassage({ passage }) {
  // Parse once per passage, and attach a stable option list to every swap
  // segment so the choices don't reshuffle on re-render.
  const lines = useMemo(() => {
    const parsedLines = parsePassage(passage.with_furigana);
    const passageWords = parsedLines.flat()
      .filter((segment) => segment.type === 'swap')
      .map((segment) => segment.kanji);
    return parsedLines.map((segments) =>
      segments.map((segment) =>
        segment.type === 'swap'
          ? { ...segment, options: buildSwapOptions(segment.kanji, passageWords) }
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
                key={segmentIndex}
                reading={segment.reading}
                correctItem={segment.kanji}
                options={segment.options}
                variant='h5'
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
