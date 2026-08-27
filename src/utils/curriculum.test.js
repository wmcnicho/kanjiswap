import { buildCurriculum, exerciseTypeOf, previewOf, stageOf, titleOf, wordCountOf } from './curriculum';
import passages from '../data/passages.json';

const passage = (fields) => ({
  with_furigana: '私(わたし)は本(ほん)を読(よ)む',
  without_furigana: '私は本を読む',
  ...fields,
});

test('reads the textbook stage straight off the passage', () => {
  expect(stageOf(passage({ stage: 'Stage 2-3' }))).toBe('Stage 2-3');
});

test('normalizes the exercise name for display', () => {
  expect(exerciseTypeOf(passage({ exercise: 'Discourse practice (reading)' }))).toBe('Discourse Practice');
  expect(exerciseTypeOf(passage({ exercise: 'Reading practices (sentences)' }))).toBe('Reading Practice');
});

test('groups passages by stage, keeping their original indices', () => {
  const stages = buildCurriculum([
    passage({ stage: 'Stage 2-3', exercise: 'Discourse practice (reading)' }),
    passage({ stage: 'Stage 1-5', exercise: 'Reading practice (sentences)' }),
    passage({ stage: 'Stage 1-5', exercise: 'Reading practice (sentences)' }),
  ]);

  expect(stages.map((stage) => stage.stage)).toEqual(['Stage 1-5', 'Stage 2-3']);
  expect(stages[0].passages.map((item) => item.index)).toEqual([1, 2]);
  expect(stages[0].label).toBe('Stage 1-5 · Reading Practice');
});

test('orders stages by number, not alphabetically', () => {
  const stages = buildCurriculum([
    passage({ stage: 'Stage 2-10' }),
    passage({ stage: 'Stage 2-2' }),
    passage({ stage: 'Stage 1-8' }),
  ]);
  expect(stages.map((stage) => stage.stage)).toEqual(['Stage 1-8', 'Stage 2-2', 'Stage 2-10']);
});

test('names a stage of mixed exercises by the stage alone', () => {
  const [stage] = buildCurriculum([
    passage({ stage: 'Stage 1-3', exercise: 'Discourse practice (reading)' }),
    passage({ stage: 'Stage 1-3', exercise: 'Reading practice (sentences)' }),
  ]);
  expect(stage.label).toBe('Stage 1-3');
});

test('previews a passage as the student sees it, in kana', () => {
  expect(previewOf(passage())).toBe('わたしはほんをよむ');
});

test('never previews the kanji the student is meant to supply', () => {
  // `without_furigana` is the kanji text, not the kana text — previewing it
  // would print the answers in the sidebar.
  expect(previewOf(passage())).not.toMatch(/私|本|読/);
});

test('skips a textbook instruction line written in English', () => {
  const preview = previewOf({
    with_furigana: 'The following sentences are identical to those above.\n私(わたし)は本(ほん)を読(よ)む',
  });
  expect(preview).toBe('わたしはほんをよむ');
});

test('counts the swappable words in a passage', () => {
  expect(wordCountOf(passage())).toBe(3);
});

describe('the shipped passages', () => {
  test('every one belongs to a real textbook stage', () => {
    for (const item of passages) {
      expect(item.stage).toMatch(/^Stage \d+-\d+$/);
    }
  });

  test('are grouped one stage per chapter, not all under one heading', () => {
    // The old data had ten passages from ten chapters all labelled "3:".
    const stages = buildCurriculum(passages);
    expect(stages.length).toBeGreaterThan(5);
    expect(Math.max(...stages.map((stage) => stage.passages.length))).toBeLessThan(4);
  });

  test('carry no vocabulary-table debris', () => {
    // The old extractor read past the end of each passage and swallowed the
    // "New vocabulary / Kanji / Kana / Meaning" table that follows it.
    for (const item of passages) {
      expect(item.with_furigana).not.toMatch(/New vocabulary|Meaning|Reading Kanji/i);
      expect(item.with_furigana.split('\n').length).toBeLessThan(12);
    }
  });

  test('every one has a title of its own', () => {
    for (const item of passages) {
      const { title, emoji } = titleOf(item);
      expect(emoji).toBeTruthy();
      expect(title).not.toBe(previewOf(item));
      expect(title).not.toMatch(/[。、\s]/);
    }
  });
});
