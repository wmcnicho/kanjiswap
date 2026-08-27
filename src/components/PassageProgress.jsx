import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import Score from './Score';

// The tally under a passage. Mid-passage it reports what's left; once the
// passage is finished it reports the run that just ended and offers another go.
function PassageProgress({ stats, totals, onTryAgain }) {
  const { solved, total, misses, points, complete, timesCompleted, bestPoints } = stats;

  return (
    <Box display='flex' flexDirection='column' alignItems='center' gap={1} mt={3}>
      <Typography variant='body2' color={complete ? 'success.main' : 'text.secondary'} component='div'>
        {complete ? 'Passage complete — ' : `${solved}/${total} swapped · `}
        <Score value={points} label='points' showDelta />
        {misses > 0 && ` · ${misses} wrong ${misses === 1 ? 'guess' : 'guesses'}`}
        {totals.streak > 1 && ` · ${totals.streak} in a row`}
      </Typography>

      {complete && (
        <>
          <Button size='small' onClick={onTryAgain}>
            Try again
          </Button>
          {timesCompleted > 1 && (
            <Typography variant='caption' color='text.secondary'>
              Finished {timesCompleted} times · best {bestPoints} points
            </Typography>
          )}
        </>
      )}

      <Typography variant='caption' color='text.secondary' component='div'>
        {totals.points} points overall · saved in this browser only
      </Typography>
    </Box>
  );
}

export default PassageProgress;
