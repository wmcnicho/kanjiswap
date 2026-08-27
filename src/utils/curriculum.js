// Turns the flat passage list into the learning path the sidebar shows.
//
// The section labels in the extracted data are inconsistent — three spellings
// of "Reading Practice (Sentences)", and Discourse Practice appearing under
// both chapter 3 and chapter 4 — so they are normalized here for display. The
// real fix belongs in the extractor in the j201 repo; this keeps the navigation
// honest until that lands, and costs nothing once it does.

import { parsePassage, swapSegments } from './passage';
import { passageKey } from './progress';
import PASSAGE_TITLES from '../data/passageTitles';

const PREVIEW_LENGTH = 14;

// "3: Discourse Practice (Reading)" -> 3
export function chapterOf(section) {
  const match = /^\s*(\d+)/.exec(section ?? '');
  return match ? Number(match[1]) : null;
}

// "2: Reading Practices (Sentences)" -> "Reading Practice"
export function exerciseTypeOf(section) {
  const withoutChapter = (section ?? '').replace(/^\s*\d+\s*:\s*/, '');
  const withoutQualifier = withoutChapter.replace(/\s*\([^)]*\)\s*$/, '');
  return withoutQualifier
    .trim()
    .toLowerCase()
    .replace(/\bpractices\b/, 'practice')
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

// What the sidebar calls a passage: a one-word title and an emoji for the gist,
// falling back to the opening line for any passage not in the map (a newly
// extracted one, say) so the rail is never blank.
export function titleOf(passage) {
  const named = PASSAGE_TITLES[passageKey(passage)];
  return named ?? { title: previewOf(passage), emoji: null };
}

export function wordCountOf(passage) {
  return swapSegments(parsePassage(passage.with_furigana)).length;
}

// Groups passages into chapters, keeping their original indices — those are
// what the app selects by.
export function buildCurriculum(passages) {
  const chapters = [];

  passages.forEach((passage, index) => {
    const chapter = chapterOf(passage.section);
    const type = exerciseTypeOf(passage.section);
    let group = chapters.find((candidate) => candidate.chapter === chapter);
    if (!group) {
      group = { chapter, types: [], passages: [] };
      chapters.push(group);
    }
    if (!group.types.includes(type)) {
      group.types.push(type);
    }
    group.passages.push({
      index,
      chapter,
      type,
      ...titleOf(passage),
      preview: previewOf(passage),
      wordCount: wordCountOf(passage),
    });
  });

  chapters.sort((a, b) => (a.chapter ?? Infinity) - (b.chapter ?? Infinity));
  return chapters.map((group) => ({ ...group, label: labelFor(group) }));
}

// A chapter of one kind of exercise says so; a mixed one just numbers itself.
function labelFor(group) {
  const name = group.chapter === null ? 'Other' : `Chapter ${group.chapter}`;
  return group.types.length === 1 ? `${name} · ${group.types[0]}` : name;
}
