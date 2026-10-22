/**
 * ZhongXue V2 — Vietnamese and Pinyin Search Normalization Engine
 * Subagent: A07 — Chuẩn hóa tiếng Việt và Pinyin
 *
 * Pure TypeScript module with zero external, React, or Node-specific dependencies.
 * Safe for use in browser client, Node.js server, and worker contexts.
 */

export interface NormalizedPinyin {
  original: string;
  numbered: string;
  clean: string;
}

export interface NormalizedSearchQuery {
  raw: string;
  clean: string;
  viClean: string;
  pinyinClean: string;
  isHanzi: boolean;
}

/**
 * Character mapping for Pinyin tone-marked vowels and syllabic consonants.
 * Maps precomposed Unicode characters to base letter and tone number (1-4).
 * ü / Ü is mapped to base 'v' with tone 0.
 */
interface ToneCharInfo {
  base: string;
  tone: number;
}

const TONE_CHAR_MAP: Record<string, ToneCharInfo> = {
  // a - tone 1..4
  '\u0101': { base: 'a', tone: 1 }, // ā
  '\u00e1': { base: 'a', tone: 2 }, // á
  '\u01ce': { base: 'a', tone: 3 }, // ǎ
  '\u00e0': { base: 'a', tone: 4 }, // à
  '\u0100': { base: 'a', tone: 1 }, // Ā
  '\u00c1': { base: 'a', tone: 2 }, // Á
  '\u01cd': { base: 'a', tone: 3 }, // Ǎ
  '\u00c0': { base: 'a', tone: 4 }, // À

  // e - tone 1..4
  '\u0113': { base: 'e', tone: 1 }, // ē
  '\u00e9': { base: 'e', tone: 2 }, // é
  '\u011b': { base: 'e', tone: 3 }, // ě
  '\u00e8': { base: 'e', tone: 4 }, // è
  '\u0112': { base: 'e', tone: 1 }, // Ē
  '\u00c9': { base: 'e', tone: 2 }, // É
  '\u011a': { base: 'e', tone: 3 }, // Ě
  '\u00c8': { base: 'e', tone: 4 }, // È
  '\u1ebf': { base: 'e', tone: 2 }, // ế
  '\u1ec1': { base: 'e', tone: 4 }, // ề
  '\u1ebe': { base: 'e', tone: 2 }, // Ế
  '\u1ec0': { base: 'e', tone: 4 }, // Ề

  // i - tone 1..4
  '\u012b': { base: 'i', tone: 1 }, // ī
  '\u00ed': { base: 'i', tone: 2 }, // í
  '\u01d0': { base: 'i', tone: 3 }, // ǐ
  '\u00ec': { base: 'i', tone: 4 }, // ì
  '\u012a': { base: 'i', tone: 1 }, // Ī
  '\u00cd': { base: 'i', tone: 2 }, // Í
  '\u01cf': { base: 'i', tone: 3 }, // Ǐ
  '\u00cc': { base: 'i', tone: 4 }, // Ì

  // o - tone 1..4
  '\u014d': { base: 'o', tone: 1 }, // ō
  '\u00f3': { base: 'o', tone: 2 }, // ó
  '\u01d2': { base: 'o', tone: 3 }, // ǒ
  '\u00f2': { base: 'o', tone: 4 }, // ò
  '\u014c': { base: 'o', tone: 1 }, // Ō
  '\u00d3': { base: 'o', tone: 2 }, // Ó
  '\u01d1': { base: 'o', tone: 3 }, // Ǒ
  '\u00d2': { base: 'o', tone: 4 }, // Ò

  // u - tone 1..4
  '\u016b': { base: 'u', tone: 1 }, // ū
  '\u00fa': { base: 'u', tone: 2 }, // ú
  '\u01d4': { base: 'u', tone: 3 }, // ǔ
  '\u00f9': { base: 'u', tone: 4 }, // ù
  '\u016a': { base: 'u', tone: 1 }, // Ū
  '\u00da': { base: 'u', tone: 2 }, // Ú
  '\u01d3': { base: 'u', tone: 3 }, // Ǔ
  '\u00d9': { base: 'u', tone: 4 }, // Ù

  // ü / v - tone 1..4 and neutral
  '\u01d6': { base: 'v', tone: 1 }, // ǖ
  '\u01d8': { base: 'v', tone: 2 }, // ǘ
  '\u01da': { base: 'v', tone: 3 }, // ǚ
  '\u01dc': { base: 'v', tone: 4 }, // ǜ
  '\u01d5': { base: 'v', tone: 1 }, // Ǖ
  '\u01d7': { base: 'v', tone: 2 }, // Ǘ
  '\u01d9': { base: 'v', tone: 3 }, // Ǚ
  '\u01db': { base: 'v', tone: 4 }, // Ǜ
  '\u00fc': { base: 'v', tone: 0 }, // ü
  '\u00dc': { base: 'v', tone: 0 }, // Ü

  // n nasals
  '\u0144': { base: 'n', tone: 2 }, // ń
  '\u0148': { base: 'n', tone: 3 }, // ň
  '\u01f9': { base: 'n', tone: 4 }, // ǹ
  '\u0143': { base: 'n', tone: 2 }, // Ń
  '\u0147': { base: 'n', tone: 3 }, // Ň
  '\u01f8': { base: 'n', tone: 4 }, // Ǹ

  // m nasals
  '\u1e3f': { base: 'm', tone: 2 }, // ḿ
  '\u1e3e': { base: 'm', tone: 2 }, // Ḿ
};

/**
 * Normalizes Vietnamese text by removing diacritical accents and normalizing letters.
 * Handles NFC/NFD Unicode normalization, transforms:
 *   - 'a, ă, â, e, ê, i, o, ô, ơ, u, ư, y' to unaccented vowels
 *   - 'đ' -> 'd', 'Đ' -> 'D' (or lowercase 'd')
 *   - Preserves Hanzi characters and standard punctuation/spaces.
 *
 * @param text The input Vietnamese string.
 * @param options.preserveCase Whether to maintain character casing (default: false, lowercase).
 */
export function normalizeVietnamese(text: string, options?: { preserveCase?: boolean }): string {
  if (!text || typeof text !== 'string') return '';

  let s = text.normalize('NFD');

  // Convert ü / u: so phonetic tone distinction isn't stripped as diaeresis
  s = s.replace(/u:/gi, 'v');
  s = s.replace(/ü/gi, 'v');
  s = s.replace(/u\u0308/gi, 'v');
  s = s.replace(/U\u0308/gi, 'V');

  // Strip combining diacritical marks (tones, breves, circumflexes, horns)
  s = s.replace(/[\u0300-\u036f]/g, '');

  if (options?.preserveCase) {
    s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  } else {
    s = s.replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  }

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Converts tone-marked Pinyin characters into syllable-based numbered Pinyin.
 * Example: 'xuéshēng' -> 'xue2sheng1', 'xué shēng' -> 'xue2 sheng1', 'nǚ' -> 'nv3', 'lù' -> 'lu4'.
 */
export function convertToneMarksToNumbered(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Canonicalize to NFC and transform u: to v
  const s = text.normalize('NFC').replace(/u:/g, 'v').replace(/U:/g, 'V');

  let result = '';
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    const info = TONE_CHAR_MAP[ch];

    if (info && info.tone > 0) {
      const baseChar = info.base;
      const toneNum = info.tone;
      let tail = '';
      let j = i + 1;

      // 1. Diphthong offglide vowel: i, o, u (only valid after base vowel a, e, o)
      if (j < s.length && /[iouIOU]/.test(s[j]) && /[aeoAEO]/.test(baseChar)) {
        tail += s[j].toLowerCase();
        j++;
      }

      // 2. Nasal or rhotic coda: ng, n, r
      if (j + 1 < s.length && s.substring(j, j + 2).toLowerCase() === 'ng') {
        tail += 'ng';
        j += 2;
      } else if (j < s.length && /[nrNR]/.test(s[j])) {
        const nextChar = j + 1 < s.length ? s[j + 1] : '';
        const isNextVowel = /[aeiouüvAEIOUÜV]/.test(nextChar) || Boolean(TONE_CHAR_MAP[nextChar]);
        if (!isNextVowel) {
          tail += s[j].toLowerCase();
          j++;
        }
      }

      result += baseChar + tail + toneNum;
      i = j;
    } else if (info && info.tone === 0) {
      result += info.base;
      i++;
    } else if (ch === 'ü' || ch === 'Ü') {
      result += 'v';
      i++;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

/**
 * Normalizes Pinyin string into 3 representations:
 * 1. original: raw trimmed input
 * 2. numbered: pinyin with tone numbers ('xue2 sheng1', 'xue2sheng1', 'lu4', 'lv4', 'nv3')
 * 3. clean: lowercase clean letters stripped of tone numbers, spaces, hyphens, punctuation ('xuesheng', 'lu', 'lv', 'nv')
 *           preserving Hanzi intact.
 */
export function normalizePinyin(text: string): NormalizedPinyin {
  if (!text || typeof text !== 'string') {
    return { original: '', numbered: '', clean: '' };
  }

  const original = text.trim();
  const numbered = convertToneMarksToNumbered(original);

  // Clean pinyin: strip tone numbers 1-5, spaces, hyphens, and punctuation
  // while preserving Chinese characters (Hanzi) intact.
  let clean = numbered.toLowerCase();
  clean = clean.replace(/[1-5]/g, '');
  // Strip whitespace and standard punctuation marks
  clean = clean.replace(/[\s\-_'’"`.,!?/\\:;()[\]{}#~@$%^&*+=<>|]/g, '');

  return {
    original,
    numbered: numbered.toLowerCase().trim(),
    clean
  };
}

/**
 * Determines whether a string consists primarily of Chinese characters (Hanzi).
 * Matches CJK Unified Ideographs, Extension A, and standard ideographic blocks.
 */
export function isHanziText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const stripped = text.replace(/[\s\p{P}]/gu, '');
  return stripped.length > 0 && /^[\u4e00-\u9fff\u3400-\u4dbf]+$/u.test(stripped);
}

/**
 * Normalizes a user search query into structured components for multi-mode lookup:
 * - raw: original trimmed query
 * - clean: NFC normalized, lowercase, whitespace-trimmed
 * - viClean: unaccented Vietnamese form (đ -> d, tones removed)
 * - pinyinClean: clean toneless pinyin (tones removed, ü/u: -> v, spaces/hyphens stripped)
 * - isHanzi: boolean indicating if query is primarily Chinese characters
 */
export function normalizeSearchQuery(query: string): NormalizedSearchQuery {
  if (!query || typeof query !== 'string') {
    return {
      raw: '',
      clean: '',
      viClean: '',
      pinyinClean: '',
      isHanzi: false
    };
  }

  const raw = query.trim();
  const clean = raw.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  const viClean = normalizeVietnamese(raw);
  const pinyinClean = normalizePinyin(raw).clean;
  const isHanzi = isHanziText(raw);

  return {
    raw,
    clean,
    viClean,
    pinyinClean,
    isHanzi
  };
}

/**
 * Evaluates whether a target string (e.g. dictionary entry, pinyin transcription, or definition)
 * matches a user query across Hanzi, Pinyin, and Vietnamese variations.
 *
 * Distinct features:
 * - Differentiates 'u' and 'ü' (e.g. 'lù' matches 'lu4' but NOT 'lǜ'/'lu:4').
 * - Matches tone-marked, numbered, and unaccented Pinyin ('xuéshēng', 'xue2 sheng1', 'xuesheng').
 * - Matches accented and unaccented Vietnamese ('học sinh' <-> 'hoc sinh', 'Đài Loan' <-> 'dai loan').
 * - Matches Hanzi exact substrings ('學生', '台灣', '你好').
 * - Robust against Unicode NFC/NFD variations, uppercase/lowercase, and extraneous whitespace.
 */
export function matchesQuery(target: string, query: string): boolean {
  if (!target || !query || typeof target !== 'string' || typeof query !== 'string') {
    return false;
  }

  const qTrim = query.trim();
  const tTrim = target.trim();
  if (!qTrim || !tTrim) return false;

  const tNfc = tTrim.normalize('NFC');
  const qNfc = qTrim.normalize('NFC');

  // Canonicalize u: to v for phonetic consistency (e.g. CC-CEDICT [lu:4] -> [lv4])
  const tUnified = tNfc.replace(/u:/gi, 'v');
  const qUnified = qNfc.replace(/u:/gi, 'v');

  // 1. Direct case-insensitive match on normalized text
  if (tUnified.toLowerCase().includes(qUnified.toLowerCase())) {
    return true;
  }

  // 2. Hanzi match
  const qNorm = normalizeSearchQuery(qUnified);
  const tNorm = normalizeSearchQuery(tUnified);

  if (qNorm.isHanzi) {
    const tHanziOnly = tTrim.replace(/[^\u4e00-\u9fff\u3400-\u4dbf]/gu, '');
    const qHanziOnly = qTrim.replace(/[^\u4e00-\u9fff\u3400-\u4dbf]/gu, '');
    if (qHanziOnly.length > 0 && tHanziOnly.includes(qHanziOnly)) return true;
  }

  // 3. Pinyin match (handles tones, clean letters, ü/v/u:)
  const tPinyin = normalizePinyin(tUnified);
  const qPinyin = normalizePinyin(qUnified);

  // Check numbered pinyin match (e.g. "xue2 sheng1" matching "xue2sheng1" or "lu4")
  const tNumNoSpace = tPinyin.numbered.replace(/[\s\-_]/g, '');
  const qNumNoSpace = qPinyin.numbered.replace(/[\s\-_]/g, '');
  if (qNumNoSpace.length > 0 && tNumNoSpace.includes(qNumNoSpace)) {
    return true;
  }

  // Check clean pinyin match (e.g. "xuesheng" matching "xuéshēng", "xue2 sheng1", "xue2sheng1")
  if (qPinyin.clean.length > 0 && tPinyin.clean.length > 0) {
    if (tPinyin.clean.includes(qPinyin.clean)) {
      const qHasToneNum = /[1-5]/.test(qPinyin.numbered);
      const tHasToneNum = /[1-5]/.test(tPinyin.numbered);
      if (qHasToneNum && tHasToneNum) {
        if (tNumNoSpace.includes(qNumNoSpace)) return true;
      } else {
        return true;
      }
    }
  }

  // 4. Vietnamese diacritics-insensitive match
  if (qNorm.viClean.length > 0 && tNorm.viClean.length > 0) {
    // Exact equality of normalized Vietnamese
    if (qNorm.viClean === tNorm.viClean) return true;

    const qHasViAccents = /[ăâêôơưđĂÂÊÔƠƯĐ]/.test(qNfc) || /[\u0300-\u036f]/.test(qTrim.normalize('NFD'));
    const tHasViAccents = /[ăâêôơưđĂÂÊÔƠƯĐ]/.test(tNfc) || /[\u0300-\u036f]/.test(tTrim.normalize('NFD'));

    // If query has NO accents (user typed "hoc sinh"), it matches target's viClean
    if (!qHasViAccents) {
      if (tNorm.viClean.includes(qNorm.viClean)) {
        const isShort = /^[a-z]{1,3}$/i.test(qTrim);
        if (isShort) {
          const words = tNorm.viClean.split(/[^a-zA-Z0-9]+/);
          if (words.includes(qNorm.viClean)) return true;
        } else {
          return true;
        }
      }
    }

    // If target has NO accents (stored as "hoc sinh"), it matches accented query "học sinh"
    if (!tHasViAccents) {
      if (qNorm.viClean.includes(tNorm.viClean) || tNorm.viClean.includes(qNorm.viClean)) {
        return true;
      }
    }

    // Compare with whitespace stripped
    const tViNoSpace = tNorm.viClean.replace(/\s+/g, '');
    const qViNoSpace = qNorm.viClean.replace(/\s+/g, '');
    if (!qHasViAccents && qViNoSpace.length > 3 && tViNoSpace.includes(qViNoSpace)) {
      return true;
    }
  }

  return false;
}
