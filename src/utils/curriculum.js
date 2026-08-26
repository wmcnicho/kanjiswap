// Turns the flat passage list into the learning path the sidebar shows.
//
// The section labels in the extracted data are inconsistent — three spellings
// of "Reading Practice (Sentences)", and Discourse Practice appearing under
// both chapter 3 and chapter 4 — so they are normalized here for display. The
// real fix belongs in the extractor in the j201 repo; this keeps the navigation
// honest until that lands, and costs nothing once it does.

import { parsePassage, swapSegments } from './passage';

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

// The opening words of a passage, in kana, so repeated section names stay
// distinguishable in the sidebar.
export function previewOf(passage) {
  const text = (passage.without_furigana ?? '').replace(/\s+/g, '');
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
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
