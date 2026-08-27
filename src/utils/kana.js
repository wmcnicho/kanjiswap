// Typing hiragana without a Japanese IME installed is something most learners
// can't do, so the reading exercise accepts romaji and converts it as they
// type. Anyone who does have an IME types kana directly and it passes straight
// through — the two mix freely, because conversion runs over the whole string
// every keystroke rather than over each keypress.

const DIGRAPHS = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', dji: 'ぢ', dzu: 'づ',
};

const BASIC = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', tu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', we: 'ゑ', wi: 'ゐ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
  xtsu: 'っ', ltsu: 'っ',
  '-': 'ー', '.': '。', ',': '、',
};

const TABLE = { ...DIGRAPHS, ...BASIC };
const LONGEST = Math.max(...Object.keys(TABLE).map((key) => key.length));
const VOWELS = 'aiueo';

// Converts the romaji in `input` to hiragana, leaving kana and anything still
// half-typed ("ky") alone so the reader can see what they've written.
export function toKana(input) {
  let out = '';
  let at = 0;

  while (at < input.length) {
    const rest = input.slice(at);
    const lower = rest.toLowerCase();

    // A doubled consonant is a small tsu: kitte -> きって.
    if (isSokuon(lower)) {
      out += 'っ';
      at += 1;
      continue;
    }

    // "n" before a consonant, or doubled, is ん. "na" is not.
    if (lower[0] === 'n' && isStandaloneN(lower)) {
      out += 'ん';
      // "hannin" is はんにん, not はんいん: the second n belongs to the syllable
      // after it when a vowel follows. Bare "nn" is just ん.
      at += lower[1] === 'n' && !startsSyllable(lower[2]) ? 2 : 1;
      continue;
    }

    const match = longestMatch(lower);
    if (match) {
      out += TABLE[match];
      at += match.length;
      continue;
    }

    out += rest[0]; // Kana, punctuation, or romaji that isn't a syllable yet
    at += 1;
  }

  return out;
}

function longestMatch(lower) {
  for (let length = Math.min(LONGEST, lower.length); length > 0; length--) {
    const candidate = lower.slice(0, length);
    if (TABLE[candidate]) {
      return candidate;
    }
  }
  return null;
}

function isSokuon(lower) {
  const [first, second] = lower;
  return first === second
    && !VOWELS.includes(first)
    && first !== 'n'
    && /[a-z]/.test(first)
    && lower.length > 2;
}

// A lone "n" becomes ん once it can't turn into な, に, にゃ and so on — which
// is before another consonant, or doubled.
//
// At the *end* of what's been typed it stays an "n". Committing it there would
// be a guess, and since every keystroke rewrites the field, a wrong guess can
// never be taken back: "ichin" would fix いちん in place, and the "e" that was
// about to make ねんせい can only add to it. An IME holds the n pending for the
// same reason. `finalizeKana` is what settles it.
function isStandaloneN(lower) {
  const next = lower[1];
  if (next === undefined) {
    return false;
  }
  if (next === 'n') {
    return true;
  }
  return !VOWELS.includes(next) && next !== 'y';
}

function startsSyllable(character) {
  return character !== undefined && (VOWELS.includes(character) || character === 'y');
}

// Settles a reading that is being offered as final: a trailing "n" has nothing
// left to become, so it becomes ん. Everything else is already converted.
export function finalizeKana(text) {
  const kana = toKana(text);
  return kana.endsWith('n') || kana.endsWith('N')
    ? `${kana.slice(0, -1)}ん`
    : kana;
}

// Whether a string is entirely hiragana (plus the long-vowel mark) — what a
// finished answer looks like.
export function isKana(text) {
  return text.length > 0 && /^[ぁ-ゖー]+$/.test(text);
}
