import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import Score from './Score';
import { DIRECTION } from '../utils/progress';

// How the current passage is going. Lives beside the passage rather than under
// it — a long passage pushes anything below it off the screen, which is exactly
// when a student most wants to know where they are.
//
// `compact` is the phone version, which sits in the header bar.
function PassageProgress({ stats, totals, direction = DIRECTION.toKanji, onTryAgain, compact = false }) {
  const { solved, total, misses, points, complete, timesCompleted, bestPoints } = stats;
  const typing = direction === DIRECTION.toReading;

  if (compact) {
    return (
      <Box display='flex' alignItems='center' gap={1}>
        {complete ? (
          <Button size='small' onClick={onTryAgain} sx={{ minWidth: 0, px: 1 }}>
            Try again
          </Button>
        ) : (
          <Typography variant='caption' color='text.secondary'>
            {solved}/{total}
          </Typography>
        )}
        <Typography variant='caption' color='text.secondary' component='div'>
          <Score value={points} showDelta />
        </Typography>
      </Box>
    );
  }

  return (
    <Box display='flex' flexDirection='column' gap={0.75}>
      <Typography variant='caption' color='text.secondary' sx={{ letterSpacing: '0.1em' }}>
        {typing ? '漢字 → かな' : 'かな → 漢字'}
      </Typography>

      <Typography variant='body2' color={complete ? 'success.main' : 'text.primary'} component='div'>
        {complete ? 'Finished — ' : `${solved}/${total} ${typing ? 'read' : 'swapped'} · `}
        <Score value={points} label='points' showDelta />
      </Typography>

      {misses > 0 && (
        <Typography variant='caption' color='text.secondary'>
          {misses} wrong {misses === 1 ? 'guess' : 'guesses'}
        </Typography>
      )}
      {totals.streak > 1 && (
        <Typography variant='caption' color='text.secondary'>
          {totals.streak} in a row
        </Typography>
      )}

      {complete && (
        <>
          <Button size='small' onClick={onTryAgain} sx={{ alignSelf: 'flex-start', mt: 0.5, ml: -1 }}>
            Try again
          </Button>
          {timesCompleted > 1 && (
            <Typography variant='caption' color='text.secondary'>
              Finished {timesCompleted} times · best {bestPoints}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

export default PassageProgress;
