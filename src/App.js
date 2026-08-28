import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CssBaseline, Divider, Drawer, Toolbar, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import SwapPassage from './components/SwapPassage';
import PassageProgress from './components/PassageProgress';
import PassageNav from './components/PassageNav';
import ReadingControls from './components/ReadingControls';
import KanjiMark from './components/KanjiMark';
import Score from './components/Score';
import { DEFAULT_FONT, buildTheme } from './theme';
import { typedReadingEnabled } from './features';
import passages from './data/passages.json';
import { buildCurriculum, wordCountOf } from './utils/curriculum';
import {
  DIRECTION,
  EVENT,
  appendEvent,
  deriveState,
  isSolved,
  loadStore,
  missesFor,
  newId,
  passageKey,
  currentAttempt,
  passageStats,
  saveStore,
} from './utils/progress';

const DRAWER_WIDTH = 280;

// The passages are fixed at build time, so the learning path and its keys are too.
const stages = buildCurriculum(passages);
const passageKeys = passages.map(passageKey);
const wordCounts = passages.map(wordCountOf);

function App() {
  // A phone has no keys to hint at, so it isn't offered any.
  const touchOnly = useMediaQuery('(pointer: coarse)');
  const [passageIndex, setPassageIndex] = useState(0);
  const [store, setStore] = useState(loadStore);
  const [navOpen, setNavOpen] = useState(false);

  // Score, streaks, and what's solved are folded out of the event log rather
  // than stored, so a scoring change reprices old history instead of stranding it.
  const state = useMemo(() => deriveState(store), [store]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Reading settings live in the same log as everything else, so when a student
  // changed font is recorded alongside how they were doing at the time.
  const fontId = state.settings.font ?? DEFAULT_FONT;
  const vertical = state.settings.writingMode === 'vertical';
  // Which way the exercise runs: supply the kanji, or read it and type the kana.
  // Typing the reading is unfinished, so a build that hasn't enabled it stays
  // in the direction that works — including for anyone whose saved setting says
  // otherwise.
  const typedReading = typedReadingEnabled();
  const direction = typedReading && state.settings.direction === DIRECTION.toReading
    ? DIRECTION.toReading
    : DIRECTION.toKanji;
  const typing = direction === DIRECTION.toReading;
  // Once someone has been shown the option keys, they stay shown.
  const hintsVisible = state.settings.keyHints === 'revealed' && !touchOnly;
  const theme = useMemo(() => buildTheme(fontId), [fontId]);

  const revealHints = useCallback(() => {
    setStore((current) => (deriveState(current).settings.keyHints === 'revealed'
      ? current
      : appendEvent(current, EVENT.settingChanged, { setting: 'keyHints', value: 'revealed' })));
  }, []);

  const changeSetting = (setting, value) => {
    setStore((current) => appendEvent(current, EVENT.settingChanged, { setting, value }));
  };

  const passage = passages[passageIndex];
  const passageId = passageKeys[passageIndex];
  const wordCount = wordCounts[passageIndex];
  const attempt = currentAttempt(state, passageId, direction);

  const startAttempt = useCallback(() => {
    setStore((current) => appendEvent(current, EVENT.attemptStarted, {
      passageId,
      attemptId: newId('attempt'),
      direction,
      section: passage.section,
      wordCount,
    }));
  }, [passageId, passage.section, wordCount, direction]);

  // Opening a passage for the first time starts an attempt. A finished attempt
  // is left in place so its result stays on screen until "Try again".
  useEffect(() => {
    if (!attempt) {
      startAttempt();
    }
  }, [attempt, startAttempt]);

  // Solving the last word closes the attempt out.
  useEffect(() => {
    if (attempt && !attempt.completedAt && wordCount > 0 && attempt.solved >= wordCount) {
      setStore((current) => appendEvent(current, EVENT.attemptCompleted, {
        passageId,
        attemptId: attempt.attemptId,
        direction,
        section: passage.section,
        wordCount,
        solved: attempt.solved,
        misses: attempt.misses,
        firstTrySolves: attempt.firstTrySolves,
        points: attempt.points,
      }));
    }
  }, [attempt, passageId, passage.section, wordCount, direction]);

  const handleAttempt = (segment, correct, chosen) => {
    const payload = {
      passageId,
      attemptId: attempt?.attemptId ?? null,
      direction,
      section: passage.section,
      wordKey: segment.key,
      kanji: segment.kanji,
      reading: segment.reading,
      chosen,
    };
    const firstTry = missesFor(state, passageId, segment.key, direction) === 0;
    setStore((current) => (correct
      ? appendEvent(current, EVENT.wordSolved, { ...payload, firstTry })
      : appendEvent(current, EVENT.wordMissed, payload)));
  };

  const handleSelect = (index, which) => {
    setPassageIndex(index);
    if (which && which !== direction) {
      changeSetting('direction', which);
    }
    setNavOpen(false); // On a phone the nav is a temporary drawer over the text
  };

  const navigation = (
    <>
      <Toolbar sx={{ gap: 1.25, alignItems: 'center' }}>
        <KanjiMark size={38} />
        <Box>
          <Typography variant='subtitle1' fontWeight={500} lineHeight={1.2}>KanjiSwap</Typography>
          <Typography variant='caption' color='text.secondary' component='div'>
            <Score value={state.totals.points} label='points' />
            {` · ${state.totals.passagesCompleted} finished`}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <PassageNav
        stages={stages}
        selectedIndex={passageIndex}
        statsFor={(item, which) => passageStats(state, passageKeys[item.index], item.wordCount, which)}
        selectedDirection={direction}
        directions={typedReading ? undefined : [DIRECTION.toKanji]}
        onSelect={handleSelect}
      />
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          // The phone header's height, declared once: anything sticking below
          // it reads this rather than guessing, or the passage shows through
          // the gap between them.
          '--app-header': '48px',
          minHeight: '100vh',
          '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* On a phone the rail is behind a drawer, so the mark and the running
            score need somewhere else to live. */}
        <Box
          component='header'
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            alignItems: 'center',
            height: 'var(--app-header)',
            boxSizing: 'border-box',
            gap: 1,
            px: 1.5,
            backgroundColor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={() => setNavOpen(true)}
            aria-label='Passages'
            size='small'
            sx={{ minWidth: 40, px: 1, fontSize: '1.1rem', lineHeight: 1 }}
          >
            ☰
          </Button>
          <KanjiMark size={24} />
          <Typography variant='subtitle2' fontWeight={500}>KanjiSwap</Typography>
          <Box flexGrow={1} />
          <PassageProgress
            compact
            stats={passageStats(state, passageId, wordCount, direction)}
            totals={state.totals}
            onTryAgain={startAttempt}
          />
        </Box>

      <Box display='flex' flexGrow={1}>
        <Box component='nav' sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant='temporary'
            open={navOpen}
            onClose={() => setNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              // A 280px rail on a 320px phone leaves no passage behind it.
              '& .MuiDrawer-paper': { width: `min(${DRAWER_WIDTH}px, 85vw)`, boxSizing: 'border-box' },
            }}
          >
            {navigation}
          </Drawer>
          <Drawer
            variant='permanent'
            open
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
            }}
          >
            {navigation}
          </Drawer>
        </Box>

        <Box
          component='main'
          flexGrow={1}
          p={{ xs: 1, md: 4 }}
          pb={{ xs: 9, md: 4 }} // room for the reading controls in the corner
          display='flex'
          flexDirection='column'
        >
          <Box display='flex' flexGrow={1} gap={4} justifyContent='center'>
            <Box
              display='flex'
              flexDirection='column'
              justifyContent={{ xs: 'flex-start', md: 'center' }}
              alignItems='center'
              flexGrow={1}
              minWidth={0}
            >
              {/* Keyed by attempt so starting a fresh one clears the words on screen —
                  swap state is component-local and would otherwise survive the reset. */}
              <SwapPassage
                key={`${passageId}:${direction}:${attempt?.attemptId ?? 'pending'}`}
                passage={passage}
                vertical={vertical}
                typing={typing}
                isSolved={(word) => isSolved(state, passageId, word, direction)}
                hintsVisible={hintsVisible}
                onAttempt={handleAttempt}
                onRevealHints={revealHints}
              />
            </Box>

            {/* Sticky, so a passage taller than the window can't scroll the
                score out of sight. */}
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                width: 180,
                flexShrink: 0,
                position: 'sticky',
                top: 32,
                alignSelf: 'flex-start',
              }}
            >
              <PassageProgress
                stats={passageStats(state, passageId, wordCount, direction)}
                totals={state.totals}
                direction={direction}
                onTryAgain={startAttempt}
              />
            </Box>
          </Box>

          <Box component='footer' sx={{ mt: 6, textAlign: 'center' }}>
            <Typography variant='caption' color='text.secondary' component='div'>
              Passages from <i>The Japanese Stage-Step Course</i> by Wako Tawa （多和わ子）,
              Japanese Language Program, Amherst College.
            </Typography>
            <Typography variant='caption' color='text.secondary' component='div'>
              Progress is saved in this browser only.
            </Typography>
          </Box>
        </Box>

        <ReadingControls
          font={fontId}
          vertical={vertical}
          direction={typedReading ? direction : null}
          onDirectionChange={(value) => changeSetting('direction', value)}
          onFontChange={(value) => changeSetting('font', value)}
          onWritingModeChange={(next) => changeSetting('writingMode', next ? 'vertical' : 'horizontal')}
        />
      </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
