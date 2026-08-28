import React, { useState } from 'react';
import {
  Box,
  Collapse,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { DIRECTION } from '../utils/progress';

// Each passage is two exercises, so it gets two bars. Labelled with the thing
// you're being asked to produce: 漢 when you supply the kanji, か when you read
// it back.
const BARS = [
  { direction: DIRECTION.toKanji, label: '漢', title: 'かな → 漢字' },
  { direction: DIRECTION.toReading, label: 'か', title: '漢字 → かな' },
];

// The learning path: stages that collapse, the chapters within them, and each
// passage showing how far through it the student is.
function PassageNav({ stages, selectedIndex, selectedDirection, statsFor, onSelect }) {
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
        const done = stage.passages.filter((passage) => isFinishedEveryWay(passage, statsFor)).length;

        return (
          <Box key={stage.stage} sx={{ mb: 0.5 }}>
            <ListItemButton onClick={() => toggleStage(stage.stage)} sx={{ py: 0.75 }}>
              <ListItemText
                primary={`${open ? '▾' : '▸'} ${stage.label}`}
                secondary={`${done}/${stage.passages.length} finished`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>

            <Collapse in={open} timeout='auto' unmountOnExit>
              {stage.chapters.map((chapter) => (
                <Box key={chapter.chapter}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', pl: 3, pt: 1, pb: 0.25, letterSpacing: '0.08em' }}
                  >
                    {chapter.chapter}
                  </Typography>

                  {chapter.passages.map((passage) => {
                    const bothWays = isFinishedEveryWay(passage, statsFor);
                    return (
                      <Box key={passage.index} sx={{ pl: 3, pr: 2, py: 0.5 }}>
                        <ListItemButton
                          selected={passage.index === selectedIndex}
                          onClick={() => onSelect(passage.index)}
                          sx={{ px: 0.5, py: 0.25, borderRadius: 1 }}
                        >
                          <Typography
                            variant='body2'
                            noWrap
                            color={bothWays ? 'success.main' : 'text.primary'}
                          >
                            {passage.emoji && (
                              <Box component='span' sx={{ mr: 0.75 }} aria-hidden='true'>{passage.emoji}</Box>
                            )}
                            <Box component='span'>{passage.title}</Box>
                            {/* Named only when it breaks the pattern; saying
                                "discourse practice" fourteen times says nothing. */}
                            {passage.note && (
                              <Box component='span' sx={{ color: 'text.secondary', fontSize: '0.75em', ml: 0.75 }}>
                                {passage.note}
                              </Box>
                            )}
                            {bothWays && <Box component='span' aria-label='finished'> ✓</Box>}
                          </Typography>
                        </ListItemButton>

                        {BARS.map((bar) => {
                          const stats = statsFor(passage, bar.direction);
                          const finished = isFinished(stats);
                          const current = passage.index === selectedIndex
                            && bar.direction === selectedDirection;
                          // Over the bar, not out in the margin.
                          return (
                            <Tooltip key={bar.direction} title={bar.title} placement='top'>
                              <Box
                                component='button'
                                type='button'
                                aria-label={`${passage.title} — ${bar.title}`}
                                onClick={() => onSelect(passage.index, bar.direction)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  width: '100%',
                                  px: 0.5,
                                  py: 0.25,
                                  border: 0,
                                  background: 'none',
                                  cursor: 'pointer',
                                  opacity: current ? 1 : 0.55,
                                  '&:hover': { opacity: 1 },
                                }}
                              >
                                <Box
                                  component='span'
                                  aria-hidden='true'
                                  sx={{ fontSize: '0.65rem', color: 'text.secondary', width: 12 }}
                                >
                                  {bar.label}
                                </Box>
                                <LinearProgress
                                  variant='determinate'
                                  value={Math.round(stats.fraction * 100)}
                                  color={finished ? 'success' : 'primary'}
                                  sx={{ height: 3, borderRadius: 2, flexGrow: 1 }}
                                />
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              ))}
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

// The passage as a whole counts as done when it has been read both ways.
function isFinishedEveryWay(passage, statsFor) {
  return BARS.every((bar) => isFinished(statsFor(passage, bar.direction)));
}

export default PassageNav;
