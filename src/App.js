import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CssBaseline, Divider, Drawer, Toolbar, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import SwapPassage from './components/SwapPassage';
import PassageProgress from './components/PassageProgress';
import PassageNav from './components/PassageNav';
import ReadingControls from './components/ReadingControls';
import KanjiMark from './components/KanjiMark';
import { DEFAULT_FONT, buildTheme } from './theme';
import passages from './data/passages.json';
import { buildCurriculum, wordCountOf } from './utils/curriculum';
import {
  EVENT,
  appendEvent,
  deriveState,
  isSolved,
  loadStore,
  missesFor,
  newId,
  passageKey,
  passageStats,
  saveStore,
} from './utils/progress';

const DRAWER_WIDTH = 280;

// The passages are fixed at build time, so the learning path and its keys are too.
const chapters = buildCurriculum(passages);
const passageKeys = passages.map(passageKey);
const wordCounts = passages.map(wordCountOf);

function App() {
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
  // Once someone has been shown the option keys, they stay shown.
  const hintsVisible = state.settings.keyHints === 'revealed';
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
  const attempt = state.passages[passageId]?.attempt ?? null;

  const startAttempt = useCallback(() => {
    setStore((current) => appendEvent(current, EVENT.attemptStarted, {
      passageId,
      attemptId: newId('attempt'),
      section: passage.section,
      wordCount,
    }));
  }, [passageId, passage.section, wordCount]);

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
        section: passage.section,
        wordCount,
        solved: attempt.solved,
        misses: attempt.misses,
        firstTrySolves: attempt.firstTrySolves,
        points: attempt.points,
      }));
    }
  }, [attempt, passageId, passage.section, wordCount]);

  const handleAttempt = (segment, correct, chosen) => {
    const payload = {
      passageId,
      attemptId: attempt?.attemptId ?? null,
      section: passage.section,
      wordKey: segment.key,
      kanji: segment.kanji,
      reading: segment.reading,
      chosen,
    };
    const firstTry = missesFor(state, passageId, segment.key) === 0;
    setStore((current) => (correct
      ? appendEvent(current, EVENT.wordSolved, { ...payload, firstTry })
      : appendEvent(current, EVENT.wordMissed, payload)));
  };

  const handleSelect = (index) => {
    setPassageIndex(index);
    setNavOpen(false); // On a phone the nav is a temporary drawer over the text
  };

  const navigation = (
    <>
      <Toolbar sx={{ gap: 1.25, alignItems: 'center' }}>
        <KanjiMark size={30} />
        <Box>
          <Typography variant='subtitle1' fontWeight={500} lineHeight={1.2}>KanjiSwap</Typography>
          <Typography variant='caption' color='text.secondary'>
            {state.totals.points} points · {state.totals.passagesCompleted} finished
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <PassageNav
        chapters={chapters}
        selectedIndex={passageIndex}
        statsFor={(item) => passageStats(state, passageKeys[item.index], item.wordCount)}
        onSelect={handleSelect}
      />
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display='flex' minHeight='100vh'>
        <Box component='nav' sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant='temporary'
            open={navOpen}
            onClose={() => setNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
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
          p={4}
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
        >
          <Button
            onClick={() => setNavOpen(true)}
            size='small'
            sx={{ display: { md: 'none' }, alignSelf: 'flex-start', mb: 2 }}
          >
            ☰ Passages
          </Button>
          {/* Keyed by attempt so starting a fresh one clears the words on screen —
              swap state is component-local and would otherwise survive the reset. */}
          <SwapPassage
            key={`${passageId}:${attempt?.attemptId ?? 'pending'}`}
            passage={passage}
            vertical={vertical}
            isSolved={(word) => isSolved(state, passageId, word)}
            hintsVisible={hintsVisible}
            onAttempt={handleAttempt}
            onRevealHints={revealHints}
          />
          <PassageProgress
            stats={passageStats(state, passageId, wordCount)}
            totals={state.totals}
            onTryAgain={startAttempt}
          />
        </Box>

        <ReadingControls
          font={fontId}
          vertical={vertical}
          onFontChange={(value) => changeSetting('font', value)}
          onWritingModeChange={(next) => changeSetting('writingMode', next ? 'vertical' : 'horizontal')}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
