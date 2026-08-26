import React from 'react';
import { Box, Button, Typography } from '@mui/material';

// The running tally under a passage: how much is swapped, how many guesses went
// wrong, and how often the first guess was right.
function PassageProgress({ stats, onReset }) {
  const { solved, total, misses, accuracy, complete } = stats;
  const started = solved > 0 || misses > 0;

  return (
    <Box display='flex' alignItems='center' gap={2} mt={3}>
      <Typography variant='body2' color={complete ? 'success.main' : 'text.secondary'}>
        {complete && 'Passage complete — '}
        {solved}/{total} swapped
        {misses > 0 && ` · ${misses} wrong ${misses === 1 ? 'guess' : 'guesses'}`}
        {accuracy !== null && ` · ${Math.round(accuracy * 100)}% accuracy`}
      </Typography>
      <Button size='small' onClick={onReset} disabled={!started}>
        Reset passage
      </Button>
    </Box>
  );
}

export default PassageProgress;
