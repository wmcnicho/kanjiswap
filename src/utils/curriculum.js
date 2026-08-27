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

// Groups passages by textbook stage, keeping their original indices — those are
// what the app selects by.
export function buildCurriculum(passages) {
  const stages = [];

  passages.forEach((passage, index) => {
    const stage = stageOf(passage);
    const type = exerciseTypeOf(passage);
    let group = stages.find((candidate) => candidate.stage === stage);
    if (!group) {
      group = { stage, types: [], passages: [] };
      stages.push(group);
    }
    if (!group.types.includes(type)) {
      group.types.push(type);
    }
    group.passages.push({
      index,
      stage,
      type,
      ...titleOf(passage),
      preview: previewOf(passage),
      wordCount: wordCountOf(passage),
    });
  });

  stages.sort((a, b) => order(a.stage) - order(b.stage));
  return stages.map((group) => ({ ...group, label: labelFor(group) }));
}

// "Stage 2-3" sorts after "Stage 1-8", and "Stage 2-10" after "Stage 2-9".
function order(stage) {
  const match = /(\d+)\s*-\s*(\d+)/.exec(stage ?? '');
  return match ? Number(match[1]) * 1000 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
}

// A stage with one kind of exercise says so; a mixed one just names itself.
function labelFor(group) {
  return group.types.length === 1 ? `${group.stage} · ${group.types[0]}` : group.stage;
}
