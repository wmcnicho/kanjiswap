import React, { useCallback, useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import SwapPassage from './components/SwapPassage';
import PassageProgress from './components/PassageProgress';
import passages from './data/passages.json';
import { parsePassage, swapSegments } from './utils/passage';
import { loadProgress, passageKey, passageStats, recordAttempt, resetPassage, saveProgress } from './utils/progress';

// The passages are fixed at build time, so their keys and word counts are too.
// The picker needs a count for every passage, not just the open one.
const passageKeys = passages.map(passageKey);
const wordCounts = passages.map((item) => swapSegments(parsePassage(item.with_furigana)).length);

function App() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [progress, setProgress] = useState(loadProgress);
  // Bumped on reset so the passage remounts and its solved words clear.
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const passage = passages[passageIndex];
  const currentKey = passageKeys[passageIndex];

  const handleAttempt = useCallback((word, correct) => {
    setProgress((current) => recordAttempt(current, currentKey, word, correct));
  }, [currentKey]);

  const handleReset = () => {
    setProgress((current) => resetPassage(current, currentKey));
    setResetCount((count) => count + 1);
  };

  return (
    <Box sx={{
      minHeight: "500px"
    }} display={'flex'} flexDirection={'column'} justifyContent={'center'} alignItems={'center'} p={4}>
      <FormControl sx={{ minWidth: '300px', mb: 4 }}>
        <InputLabel id="passage-select-label">Passage</InputLabel>
        <Select
          labelId="passage-select-label"
          label="Passage"
          value={passageIndex}
          onChange={(event) => setPassageIndex(event.target.value)}
        >
          {passages.map((item, index) => (
            <MenuItem key={index} value={index}>
              {index + 1}. {item.section}{progressMarker(progress, index)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Keyed so switching passages — or resetting one — starts from a clean
          set of words instead of reusing the previous passage's state. */}
      <SwapPassage
        key={`${currentKey}:${resetCount}`}
        passage={passage}
        progress={progress[currentKey]}
        onAttempt={handleAttempt}
      />
      <PassageProgress
        stats={passageStats(progress, currentKey, wordCounts[passageIndex])}
        onReset={handleReset}
      />
      <Typography variant='caption' color='text.secondary' mt={1}>
        Progress is saved in this browser only.
      </Typography>
    </Box>
  );
}

// A tick for a finished passage, a running count for one in progress.
function progressMarker(progress, index) {
  const { solved, total, complete } = passageStats(progress, passageKeys[index], wordCounts[index]);
  if (complete) {
    return ' ✓';
  }
  return solved > 0 ? ` (${solved}/${total})` : '';
}

export default App;
