import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { DbDictionaryResult } from '../src/types';
import { normalizeVietnamese as normVi } from '../src/domain/searchNormalization';

export type { DbDictionaryResult };

export type DictionarySearchMode = 'all' | 'hanzi' | 'pinyin' | 'vi';

export interface DictionarySearchOptions {
  mode?: DictionarySearchMode;
  offset?: number;
  limit?: number;
}

export interface DictionarySearchResult {
  results: DbDictionaryResult[];
  total: number;
  dictionaryTotal?: number;
  totalMatches?: number;
  pageCount?: number;
}

export interface ParsedDictionaryEntry extends DbDictionaryResult {
  pinyinAccented: string;
  pinyinClean: string;
  pinyinNumberedClean: string;
  defsClean: string[];
  searchIndex: string;
}

// ============================================================================
// Normalization Utilities (Vietnamese, Pinyin, and Search)
// ============================================================================

const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

/**
 * Strips Vietnamese diacritics while converting đ/Đ to d/D.
 * Delegated to A07 canonical domain module.
 */
export const normalizeVietnamese = normVi;

/**
 * Strips Pinyin tone marks (both combining diacritics and accented characters)
 * and tone digits, producing clean toneless lowercase letters.
 * Preserves the distinction between 'ü' and 'u' to avoid false positives.
 */
export function stripPinyinTones(str: string): string {
  let s = str
    .replace(/[ǖǘǚǜ]/gi, match => (match === match.toUpperCase() ? 'Ü' : 'ü'))
    .replace(/u:/gi, match => (match[0] === 'U' ? 'Ü' : 'ü'));

  // Protect ü from NFD diaeresis stripping
  s = s.replace(/ü/g, '__u_umlaut__').replace(/Ü/g, '__U_umlaut__');

  // Strip combining diacritical marks
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');

  // Restore ü
  s = s.replace(/__u_umlaut__/g, 'ü').replace(/__U_umlaut__/g, 'ü');

  // Remove tone digits, spaces, hyphens, and apostrophes
  return s.replace(/[\d\s'-]/g, '').toLowerCase();
}

/**
 * Converts CC-CEDICT tone-numbered Pinyin (e.g. "xue2 sheng1") to accented Pinyin (e.g. "xué shēng").
 * Adheres strictly to standard Mandarin tone mark placement rules:
 * 1. 'a' or 'e' always takes the tone mark.
 * 2. 'ou' takes the tone mark on 'o'.
 * 3. Otherwise, the final vowel receives the tone mark.
 */
export function pinyinNumberedToAccented(pinyin: string): string {
  return pinyin.replace(/([a-züv:]+)([1-5]?)/gi, (_, syllable: string, toneStr: string) => {
    const tone = parseInt(toneStr, 10);
    if (!tone || tone === 5) {
      return syllable.replace(/u:/gi, 'ü').replace(/v/gi, 'ü');
    }
    const toneIdx = tone - 1;
    const s = syllable.replace(/u:/gi, 'ü').replace(/v/gi, 'ü');
    const lower = s.toLowerCase();

    // Rule 1: 'a' or 'e'
    if (lower.includes('a')) {
      const idx = lower.indexOf('a');
      const rep = TONE_MARKS.a[toneIdx];
      return s.slice(0, idx) + (s[idx] === 'A' ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    if (lower.includes('e')) {
      const idx = lower.indexOf('e');
      const rep = TONE_MARKS.e[toneIdx];
      return s.slice(0, idx) + (s[idx] === 'E' ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    // Rule 2: 'ou'
    if (lower.includes('ou')) {
      const idx = lower.indexOf('ou');
      const rep = TONE_MARKS.o[toneIdx];
      return s.slice(0, idx) + (s[idx] === 'O' ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    // Rule 3: Last vowel
    const vowels = 'iouü';
    let lastVowelIdx = -1;
    for (let i = s.length - 1; i >= 0; i--) {
      if (vowels.includes(lower[i])) {
        lastVowelIdx = i;
        break;
      }
    }
    if (lastVowelIdx !== -1) {
      const v = lower[lastVowelIdx];
      const rep = TONE_MARKS[v]?.[toneIdx] || v;
      return (
        s.slice(0, lastVowelIdx) +
        (s[lastVowelIdx] === s[lastVowelIdx].toUpperCase() ? rep.toUpperCase() : rep) +
        s.slice(lastVowelIdx + 1)
      );
    }
    return s;
  });
}

/**
 * Normalizes query string for unified search comparison.
 * Preserves spaces between words while stripping diacritics and tones.
 */
export function normalizeForSearch(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map(word => normalizeVietnamese(stripPinyinTones(word)))
    .join(' ');
}

// ============================================================================
// Dictionary Engine Implementation
// ============================================================================

export class DictionaryEngine {
  private entries: ParsedDictionaryEntry[] = [];
  private idMap = new Map<string, ParsedDictionaryEntry>();
  private tradMap = new Map<string, ParsedDictionaryEntry[]>();
  private simpMap = new Map<string, ParsedDictionaryEntry[]>();
  private pinyinExactMap = new Map<string, ParsedDictionaryEntry[]>();

  private loaded = false;
  private loadTimeMs = 0;
  private loadError: Error | null = null;
  private loadPromise: Promise<void> | null = null;

  /**
   * Initializes the dictionary engine by loading and parsing CVDICT.u8.gz.
   * If a path is provided, it is prioritized. Otherwise, standard locations are probed.
   * On missing or corrupt file, sets loaded = false and records loadError without crashing.
   */
  async init(dictPath?: string): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const t0 = Date.now();
      try {
        let targetPath: string | null = null;

        if (dictPath) {
          if (!fs.existsSync(dictPath)) {
            const err = new Error(
              `[zhongxue-dict] Dictionary file not found at: ${dictPath}`
            );
            this.loadError = err;
            this.loaded = false;
            console.warn(err.message);
            return;
          }
          targetPath = dictPath;
        } else {
          const cwd = process.cwd();
          const candidates = [
            process.env.DICT_PATH,
            path.resolve(cwd, 'data/dictionary/CVDICT.u8.gz'),
            path.resolve(cwd, 'projects/zhongxue-new/data/dictionary/CVDICT.u8.gz'),
            path.resolve(__dirname, '../data/dictionary/CVDICT.u8.gz'),
            path.resolve(__dirname, '../../data/dictionary/CVDICT.u8.gz')
          ].filter(Boolean) as string[];

          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
              targetPath = candidate;
              break;
            }
          }

          if (!targetPath) {
            const err = new Error(
              `[zhongxue-dict] Dictionary file CVDICT.u8.gz not found. Checked: ${candidates.join(', ')}`
            );
            this.loadError = err;
            this.loaded = false;
            console.warn(err.message);
            return;
          }
        }

        const compressed = fs.readFileSync(targetPath);
        const decompressed = zlib.gunzipSync(compressed).toString('utf-8');
        const lines = decompressed.split('\n');

        const parsed: ParsedDictionaryEntry[] = [];
        const newIdMap = new Map<string, ParsedDictionaryEntry>();
        const newTradMap = new Map<string, ParsedDictionaryEntry[]>();
        const newSimpMap = new Map<string, ParsedDictionaryEntry[]>();
        const newPinyinExactMap = new Map<string, ParsedDictionaryEntry[]>();

        let idCounter = 1;
        // CC-CEDICT format: Traditional Simplified [pinyin] /def1/def2/
        const regex = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/;

        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i].trim();
          if (!raw || raw.startsWith('#')) continue;

          const match = raw.match(regex);
          if (!match) {
            // Note: Line 67266/67267 has malformed double brackets "[[ ... ] ]" in CC-CEDICT source
            continue;
          }

          const traditional = match[1];
          const simplified = match[2];
          const pinyin = match[3];
          const rawDefs = match[4].split('/').map(d => d.trim()).filter(Boolean);

          const pinyinAccented = pinyinNumberedToAccented(pinyin);
          const pinyinClean = stripPinyinTones(pinyin);
          const pinyinNumberedClean = pinyin.toLowerCase().replace(/[\s-]/g, '');
          const defsClean = rawDefs.map(d => normalizeVietnamese(d));

          const searchIndex = `${traditional} ${simplified} ${pinyin} ${pinyinNumberedClean} ${pinyinClean} ${pinyinAccented} ${rawDefs.join(' ')} ${defsClean.join(' ')}`.toLowerCase();

          const entry: ParsedDictionaryEntry = {
            id: `cv_${idCounter++}`,
            traditional,
            simplified,
            pinyin,
            definitions: rawDefs,
            pinyinAccented,
            pinyinClean,
            pinyinNumberedClean,
            defsClean,
            searchIndex
          };

          parsed.push(entry);
          newIdMap.set(entry.id, entry);

          // Index traditional
          const existingTrad = newTradMap.get(traditional);
          if (existingTrad) {
            existingTrad.push(entry);
          } else {
            newTradMap.set(traditional, [entry]);
          }

          // Index simplified
          const existingSimp = newSimpMap.get(simplified);
          if (existingSimp) {
            existingSimp.push(entry);
          } else {
            newSimpMap.set(simplified, [entry]);
          }

          // Index exact toneless pinyin
          if (pinyinClean) {
            const existingPinyin = newPinyinExactMap.get(pinyinClean);
            if (existingPinyin) {
              existingPinyin.push(entry);
            } else {
              newPinyinExactMap.set(pinyinClean, [entry]);
            }
          }
        }

        this.entries = parsed;
        this.idMap = newIdMap;
        this.tradMap = newTradMap;
        this.simpMap = newSimpMap;
        this.pinyinExactMap = newPinyinExactMap;

        this.loaded = true;
        this.loadError = null;
        this.loadTimeMs = Date.now() - t0;

        console.log(
          `[zhongxue-dict] Successfully loaded ${this.entries.length} entries in ${this.loadTimeMs}ms`
        );
      } catch (err) {
        this.loaded = false;
        this.loadError = err instanceof Error ? err : new Error(String(err));
        console.error('[zhongxue-dict] Failed to initialize dictionary engine:', err);
      }
    })();

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.loaded;
  }

  getTotal(): number {
    return this.entries.length;
  }

  getLoadTimeMs(): number {
    return this.loadTimeMs;
  }

  getLoadError(): string | null {
    return this.loadError ? this.loadError.message : null;
  }

  /**
   * Looks up a dictionary entry by unique ID (e.g. "cv_31249", "31249", or "dict-31249").
   */
  getById(id: string): DbDictionaryResult | null {
    if (!this.loaded) return null;
    const cleanId = id.trim();
    const entry =
      this.idMap.get(cleanId) ||
      this.idMap.get(`cv_${cleanId}`) ||
      this.idMap.get(`cv_${cleanId.replace(/^dict[-_]/i, '')}`);

    if (!entry) return null;
    return {
      id: entry.id,
      traditional: entry.traditional,
      simplified: entry.simplified,
      pinyin: entry.pinyin,
      definitions: entry.definitions
    };
  }

  /**
   * Performs high-accuracy multi-tier dictionary search across 122,596 entries.
   * Supports:
   * - Hanzi (Traditional and Simplified)
   * - Pinyin: accented ("xuéshēng"), tone numbers ("xue2 sheng1"), and toneless ("xuesheng")
   * - Vietnamese: accented ("học sinh") and unaccented ("hoc sinh")
   *
   * Crucially computes the accurate total across all matching entries (no premature loop termination).
   */
  search(
    query: string,
    modeOrOptions: DictionarySearchMode | DictionarySearchOptions = 'all',
    offsetParam = 0,
    limitParam = 50
  ): DictionarySearchResult {
    if (!this.loaded) {
      return { results: [], total: 0 };
    }

    let mode: DictionarySearchMode = 'all';
    let offset = offsetParam;
    let limit = limitParam;

    if (typeof modeOrOptions === 'object') {
      mode = modeOrOptions.mode || 'all';
      offset = typeof modeOrOptions.offset === 'number' ? modeOrOptions.offset : offsetParam;
      limit = typeof modeOrOptions.limit === 'number' ? modeOrOptions.limit : limitParam;
    } else {
      mode = modeOrOptions;
    }

    if (offset < 0) offset = 0;
    if (limit <= 0) limit = 20;

    const qTrim = query.trim();
    if (!qTrim) {
      return { results: [], total: this.entries.length };
    }

    const qLower = qTrim.toLowerCase();
    const qPinyinClean = stripPinyinTones(qLower);
    const qNumberedClean = qLower.replace(/[\s-]/g, '');
    const qViClean = normalizeVietnamese(qLower);
    const isHanzi = /^[\u4e00-\u9fa5]+$/.test(qTrim);

    const tier1: ParsedDictionaryEntry[] = []; // Exact Hanzi
    const tier2: ParsedDictionaryEntry[] = []; // Exact Pinyin or Exact Definition
    const tier3: ParsedDictionaryEntry[] = []; // Prefix match
    const tier4: ParsedDictionaryEntry[] = []; // Substring / partial match
    const seen = new Set<ParsedDictionaryEntry>();

    if (mode === 'hanzi') {
      // 1. Exact Hanzi
      const exactT = this.tradMap.get(qTrim) || [];
      for (const e of exactT) {
        tier1.push(e);
        seen.add(e);
      }
      const exactS = this.simpMap.get(qTrim) || [];
      for (const e of exactS) {
        if (!seen.has(e)) {
          tier1.push(e);
          seen.add(e);
        }
      }

      // 2. Prefix & Substring Hanzi
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        if (seen.has(e)) continue;

        if (e.traditional.startsWith(qTrim) || e.simplified.startsWith(qTrim)) {
          tier3.push(e);
          seen.add(e);
        } else if (e.traditional.includes(qTrim) || e.simplified.includes(qTrim)) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else if (mode === 'pinyin') {
      // 1. Exact Pinyin (O(1) fast-path when available)
      if (qPinyinClean) {
        const exactP = this.pinyinExactMap.get(qPinyinClean) || [];
        for (const e of exactP) {
          tier2.push(e);
          seen.add(e);
        }
      }

      // 2. Prefix & Substring Pinyin
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        if (seen.has(e)) continue;

        if (
          e.pinyinClean === qPinyinClean ||
          e.pinyinNumberedClean === qNumberedClean ||
          e.pinyin.toLowerCase() === qLower
        ) {
          tier2.push(e);
          seen.add(e);
        } else if (
          (qPinyinClean && e.pinyinClean.startsWith(qPinyinClean)) ||
          e.pinyinNumberedClean.startsWith(qNumberedClean)
        ) {
          tier3.push(e);
          seen.add(e);
        } else if (
          (qPinyinClean && e.pinyinClean.includes(qPinyinClean)) ||
          e.pinyinNumberedClean.includes(qNumberedClean) ||
          e.pinyin.toLowerCase().includes(qLower)
        ) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else if (mode === 'vi') {
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        const exactMatch =
          e.definitions.some(d => d.toLowerCase() === qLower) ||
          e.defsClean.some(d => d === qViClean);

        if (exactMatch) {
          tier2.push(e);
          seen.add(e);
        } else if (
          e.definitions.some(d => d.toLowerCase().startsWith(qLower)) ||
          (qViClean && e.defsClean.some(d => d.startsWith(qViClean)))
        ) {
          tier3.push(e);
          seen.add(e);
        } else if (
          e.definitions.some(d => d.toLowerCase().includes(qLower)) ||
          (qViClean && e.defsClean.some(d => d.includes(qViClean)))
        ) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else {
      // mode === 'all'
      if (isHanzi) {
        // Fast-path exact Hanzi
        const exactT = this.tradMap.get(qTrim) || [];
        for (const e of exactT) {
          tier1.push(e);
          seen.add(e);
        }
        const exactS = this.simpMap.get(qTrim) || [];
        for (const e of exactS) {
          if (!seen.has(e)) {
            tier1.push(e);
            seen.add(e);
          }
        }

        for (let i = 0; i < this.entries.length; i++) {
          const e = this.entries[i];
          if (seen.has(e)) continue;

          if (e.traditional.startsWith(qTrim) || e.simplified.startsWith(qTrim)) {
            tier3.push(e);
            seen.add(e);
          } else if (e.traditional.includes(qTrim) || e.simplified.includes(qTrim)) {
            tier4.push(e);
            seen.add(e);
          }
        }
      } else {
        // Alphanumeric / Pinyin / Vietnamese query
        // Fast-path exact toneless pinyin
        if (qPinyinClean) {
          const exactP = this.pinyinExactMap.get(qPinyinClean) || [];
          for (const e of exactP) {
            tier2.push(e);
            seen.add(e);
          }
        }

        for (let i = 0; i < this.entries.length; i++) {
          const e = this.entries[i];
          if (seen.has(e)) continue;

          // Check exact Hanzi (rare alphanumeric Hanzi match)
          if (e.traditional === qTrim || e.simplified === qTrim) {
            tier1.push(e);
            seen.add(e);
            continue;
          }

          // Check exact Pinyin or exact definition
          const isExactPinyin =
            qPinyinClean &&
            (e.pinyinClean === qPinyinClean || e.pinyinNumberedClean === qNumberedClean);
          const isExactDef =
            e.definitions.some(d => d.toLowerCase() === qLower) ||
            (qViClean && e.defsClean.some(d => d === qViClean));

          if (isExactPinyin || isExactDef) {
            tier2.push(e);
            seen.add(e);
            continue;
          }

          // Check prefix
          const isPrefixPinyin =
            qPinyinClean &&
            (e.pinyinClean.startsWith(qPinyinClean) ||
              e.pinyinNumberedClean.startsWith(qNumberedClean));
          const isPrefixDef =
            e.definitions.some(d => d.toLowerCase().startsWith(qLower)) ||
            (qViClean && e.defsClean.some(d => d.startsWith(qViClean)));

          if (isPrefixPinyin || isPrefixDef) {
            tier3.push(e);
            seen.add(e);
            continue;
          }

          // Substring match
          if (
            e.searchIndex.includes(qLower) ||
            (qViClean && e.searchIndex.includes(qViClean)) ||
            (qPinyinClean && e.pinyinClean.includes(qPinyinClean))
          ) {
            tier4.push(e);
            seen.add(e);
          }
        }
      }
    }

    // Sort within tier 3 & 4 by word length for maximum semantic relevance
    tier3.sort((a, b) => a.traditional.length - b.traditional.length);
    tier4.sort((a, b) => a.traditional.length - b.traditional.length);

    const allMatches = [...tier1, ...tier2, ...tier3, ...tier4];
    const total = allMatches.length;

    const paged = allMatches.slice(offset, offset + limit).map(e => ({
      id: e.id,
      traditional: e.traditional,
      simplified: e.simplified,
      pinyin: e.pinyin,
      definitions: e.definitions
    }));

    return {
      results: paged,
      total,
      dictionaryTotal: this.entries.length,
      totalMatches: total,
      pageCount: paged.length
    };
  }

  /**
   * Resets the engine state. Useful for isolated test setups.
   */
  reset(): void {
    this.entries = [];
    this.idMap.clear();
    this.tradMap.clear();
    this.simpMap.clear();
    this.pinyinExactMap.clear();
    this.loaded = false;
    this.loadTimeMs = 0;
    this.loadError = null;
    this.loadPromise = null;
  }
}

export const dictionaryEngine = new DictionaryEngine();
export default dictionaryEngine;
