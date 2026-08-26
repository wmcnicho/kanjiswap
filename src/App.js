import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import SwapPassage from './components/SwapPassage';
import PassageProgress from './components/PassageProgress';
import passages from './data/passages.json';
import { parsePassage, swapSegments } from './utils/passage';
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

// The passages are fixed at build time, so their keys and word counts are too.
const passageKeys = passages.map(passageKey);
const wordCounts = passages.map((item) => swapSegments(parsePassage(item.with_furigana)).length);

function App() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [store, setStore] = useState(loadStore);

  // Score, streaks, and what's solved are folded out of the event log rather
  // than stored, so a scoring change reprices old history instead of stranding it.
  const state = useMemo(() => deriveState(store), [store]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

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
              {index + 1}. {item.section}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Keyed by attempt so starting a fresh one clears the words on screen —
          swap state is component-local and would otherwise survive the reset. */}
      <SwapPassage
        key={`${passageId}:${attempt?.attemptId ?? 'pending'}`}
        passage={passage}
        isSolved={(word) => isSolved(state, passageId, word)}
        onAttempt={handleAttempt}
      />
      <PassageProgress
        stats={passageStats(state, passageId, wordCount)}
        totals={state.totals}
        onTryAgain={startAttempt}
      />
    </Box>
  );
}

export default App;
