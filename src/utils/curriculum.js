// Turns the flat passage list into the learning path the sidebar shows.
//
// Passages carry the textbook stage they came from (`stage`, e.g. "Stage 2-3")
// and a normalized exercise name (`exercise`), so grouping is a matter of
// reading fields rather than parsing a heading. Earlier data had neither, and
// the sidebar had to pick a chapter number out of a section string that turned
// out to be the exercise number — ten passages from ten different chapters all
// claiming to be chapter 3.

import { parsePassage, swapSegments } from './passage';
import { passageKey } from './progress';
import PASSAGE_TITLES from '../data/passageTitles';

const PREVIEW_LENGTH = 14;

export function stageOf(passage) {
  return passage.stage ?? passage.section ?? 'Other';
}

// "Stage 2-3" -> "Stage 2", the top level of the rail.
export function stageGroupOf(passage) {
  const match = /^(.*?)\s*(\d+)-\d+/.exec(stageOf(passage));
  return match ? `${match[1]} ${match[2]}`.trim() : stageOf(passage);
}

// "Stage 2-3" -> "2-3", the chapter within that stage.
export function chapterOf(passage) {
  const match = /(\d+-\d+)/.exec(stageOf(passage));
  return match ? match[1] : stageOf(passage);
}

// "Reading practice (sentences)" -> "sentences". What actually distinguishes
// one kind of exercise from another, once the shared words are dropped.
export function qualifierOf(passage) {
  const match = /\(([^)]*)\)/.exec(passage.exercise ?? passage.section ?? '');
  return match ? match[1].toLowerCase() : exerciseTypeOf(passage).toLowerCase();
}

// "Discourse practice (reading)" -> "Discourse Practice"
export function exerciseTypeOf(passage) {
  const raw = passage.exercise ?? passage.section ?? '';
  return raw
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase()
    .replace(/\bpractices\b/, 'practice')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// What the sidebar calls a passage: a one-word title and an emoji for the gist,
// falling back to the opening line for any passage not in the map (a newly
// extracted one, say) so the rail is never blank.
export function titleOf(passage) {
  const named = PASSAGE_TITLES[passageKey(passage)];
  return named ?? { title: previewOf(passage), emoji: null };
}

// The opening words of a passage as the student sees them — kana, not kanji.
//
// `without_furigana` is the *kanji* text with the readings stripped, not the
// kana text, so previewing it would print the answers in the sidebar. This
// renders the passage the way the app does instead: readings in place of the
// words still to be swapped.
export function previewOf(passage) {
  const line = parsePassage(passage.with_furigana ?? '')
    .map((segments) => segments
      .map((segment) => (segment.type === 'swap' ? segment.reading : segment.text))
      .join('')
      .replace(/\s+/g, ' ')
      .trim())
    .find(isMostlyJapanese) ?? '';

  return line.length > PREVIEW_LENGTH ? `${line.slice(0, PREVIEW_LENGTH)}…` : line;
}

// Some passages open with an instruction from the textbook in English. Those
// aren't the passage, so they aren't what the sidebar should show.
function isMostlyJapanese(line) {
  const japanese = (line.match(/[぀-ヿ一-鿿]/g) ?? []).length;
  const latin = (line.match(/[A-Za-z]/g) ?? []).length;
  return japanese > 0 && japanese >= latin;
}

export function wordCountOf(passage) {
  return swapSegments(parsePassage(passage.with_furigana)).length;
}

// Builds the two-level path the rail shows: stages, each holding the chapters
// that belong to it, each holding its passages. Original indices are kept —
// those are what the app selects by.
export function buildCurriculum(passages) {
  // Naming the exercise on every row would be noise: nearly all of these are
  // discourse practice. Only the ones that break the pattern say what they are.
  const usual = commonestType(passages);
  const stages = [];

  passages.forEach((passage, index) => {
    const stage = stageGroupOf(passage);
    const chapter = chapterOf(passage);
    const type = exerciseTypeOf(passage);

    let group = stages.find((candidate) => candidate.stage === stage);
    if (!group) {
      group = { stage, label: stage, chapters: [], passages: [] };
      stages.push(group);
    }
    let within = group.chapters.find((candidate) => candidate.chapter === chapter);
    if (!within) {
      within = { chapter, passages: [] };
      group.chapters.push(within);
    }

    const entry = {
      index,
      stage,
      chapter,
      type,
      note: type === usual ? null : qualifierOf(passage),
      ...titleOf(passage),
      preview: previewOf(passage),
      wordCount: wordCountOf(passage),
    };
    within.passages.push(entry);
    group.passages.push(entry);
  });

  stages.sort((a, b) => order(a.stage) - order(b.stage));
  stages.forEach((group) => group.chapters.sort((a, b) => order(a.chapter) - order(b.chapter)));
  return stages;
}

function commonestType(passages) {
  const counts = new Map();
  for (const passage of passages) {
    const type = exerciseTypeOf(passage);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// "Stage 2" sorts after "Stage 1", and "2-10" after "2-9".
function order(label) {
  const pair = /(\d+)\s*-\s*(\d+)/.exec(label ?? '');
  if (pair) {
    return Number(pair[1]) * 1000 + Number(pair[2]);
  }
  const single = /(\d+)/.exec(label ?? '');
  return single ? Number(single[1]) * 1000 : Number.MAX_SAFE_INTEGER;
}
