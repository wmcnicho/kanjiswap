import React, { useState } from 'react';
import {
  Box,
  Collapse,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';

// The learning path: textbook stages that collapse, each passage showing how
// far through it the student is.
function PassageNav({ stages, selectedIndex, statsFor, onSelect }) {
  const stageOfSelected = stages.find((stage) =>
    stage.passages.some((passage) => passage.index === selectedIndex)
  );
  const [openStages, setOpenStages] = useState(() =>
    new Set(stageOfSelected ? [stageOfSelected.stage] : [])
  );

  const toggleStage = (stage) => {
    setOpenStages((open) => {
      const next = new Set(open);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  return (
    <List dense disablePadding sx={{ py: 1 }}>
      {stages.map((stage) => {
        const open = openStages.has(stage.stage);
        const done = stage.passages.filter((passage) => isFinished(statsFor(passage))).length;

        return (
          <Box key={stage.label} sx={{ mb: 0.5 }}>
            <ListItemButton onClick={() => toggleStage(stage.stage)} sx={{ py: 0.75 }}>
              <ListItemText
                primary={`${open ? '▾' : '▸'} ${stage.label}`}
                secondary={`${done}/${stage.passages.length} finished`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>

            <Collapse in={open} timeout='auto' unmountOnExit>
              {stage.passages.map((passage) => {
                const stats = statsFor(passage);
                const finished = isFinished(stats);
                return (
                  <ListItemButton
                    key={passage.index}
                    selected={passage.index === selectedIndex}
                    onClick={() => onSelect(passage.index)}
                    sx={{ pl: 3, py: 0.5, display: 'block' }}
                  >
                    <Typography
                      variant='body2'
                      noWrap
                      color={finished ? 'success.main' : 'text.primary'}
                    >
                      {passage.emoji && (
                        <Box component='span' sx={{ mr: 0.75 }} aria-hidden='true'>{passage.emoji}</Box>
                      )}
                      <Box component='span'>{passage.title}</Box>
                      {finished && <Box component='span' aria-label='finished'> ✓</Box>}
                    </Typography>
                    <LinearProgress
                      variant='determinate'
                      value={Math.round(stats.fraction * 100)}
                      color={finished ? 'success' : 'primary'}
                      sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                    />
                  </ListItemButton>
                );
              })}
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
}

// A tick means the passage has been finished at least once; the bar tracks the
// attempt in progress, which starts over when the student tries again.
function isFinished(stats) {
  return stats.complete || stats.timesCompleted > 0;
}

export default PassageNav;
