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

// The learning path: chapters that collapse, each passage showing how far
// through it the student is.
function PassageNav({ chapters, selectedIndex, statsFor, onSelect }) {
  const chapterOfSelected = chapters.find((chapter) =>
    chapter.passages.some((passage) => passage.index === selectedIndex)
  );
  const [openChapters, setOpenChapters] = useState(() =>
    new Set(chapterOfSelected ? [chapterOfSelected.chapter] : [])
  );

  const toggleChapter = (chapter) => {
    setOpenChapters((open) => {
      const next = new Set(open);
      if (next.has(chapter)) {
        next.delete(chapter);
      } else {
        next.add(chapter);
      }
      return next;
    });
  };

  return (
    <List dense disablePadding sx={{ py: 1 }}>
      {chapters.map((chapter) => {
        const open = openChapters.has(chapter.chapter);
        const done = chapter.passages.filter((passage) => isFinished(statsFor(passage))).length;

        return (
          <Box key={chapter.label} sx={{ mb: 0.5 }}>
            <ListItemButton onClick={() => toggleChapter(chapter.chapter)} sx={{ py: 0.75 }}>
              <ListItemText
                primary={`${open ? '▾' : '▸'} ${chapter.label}`}
                secondary={`${done}/${chapter.passages.length} finished`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>

            <Collapse in={open} timeout='auto' unmountOnExit>
              {chapter.passages.map((passage) => {
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
                      {finished ? '✓ ' : ''}{passage.preview}
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
