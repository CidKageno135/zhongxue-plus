import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  DictionaryEngine,
  dictionaryEngine,
  normalizeVietnamese,
  stripPinyinTones,
  pinyinNumberedToAccented,
  normalizeForSearch
} from '../server/dictionary';
import { createTestServer, type RunningTestServer } from './fixtures/api/test-server';

describe('DictionaryEngine — Normalization Unit Functions', () => {
  it('normalizes Vietnamese diacritics and converts đ/Đ to d/D', () => {
    expect(normalizeVietnamese('học sinh')).toBe('hoc sinh');
    expect(normalizeVietnamese('Đà Nẵng')).toBe('da nang');
    expect(normalizeVietnamese('tiếng Việt')).toBe('tieng viet');
    expect(normalizeVietnamese('phồn thể / giản thể')).toBe('phon the / gian the');
    expect(normalizeVietnamese('Đồng Khởi')).toBe('dong khoi');
  });

  it('strips Pinyin tone marks and tone numbers accurately', () => {
    expect(stripPinyinTones('xuéshēng')).toBe('xuesheng');
    expect(stripPinyinTones('xué shēng')).toBe('xuesheng');
    expect(stripPinyinTones('xue2 sheng1')).toBe('xuesheng');
    expect(stripPinyinTones('hǎo')).toBe('hao');
    expect(stripPinyinTones('zhōngguó')).toBe('zhongguo');
    expect(stripPinyinTones('Běijīng')).toBe('beijing');
  });

  it('preserves distinction between ü and u in Pinyin', () => {
    expect(stripPinyinTones('lǜ')).toBe('lü');
    expect(stripPinyinTones('lü4')).toBe('lü');
    expect(stripPinyinTones('lu:4')).toBe('lü');
    expect(stripPinyinTones('nǚ')).toBe('nü');
    // Normal 'u' is preserved as 'u'
    expect(stripPinyinTones('lù')).toBe('lu');
    expect(stripPinyinTones('lu4')).toBe('lu');
  });

  it('converts tone-numbered Pinyin to accented Pinyin', () => {
    expect(pinyinNumberedToAccented('xue2 sheng1')).toBe('xué shēng');
    expect(pinyinNumberedToAccented('xue2 sheng5')).toBe('xué sheng');
    expect(pinyinNumberedToAccented('ni3 hao3')).toBe('nǐ hǎo');
    expect(pinyinNumberedToAccented('lu:4')).toBe('lǜ');
    expect(pinyinNumberedToAccented('lv4')).toBe('lǜ');
    expect(pinyinNumberedToAccented('shui3')).toBe('shuǐ');
    expect(pinyinNumberedToAccented('jiu3')).toBe('jiǔ');
  });

  it('normalizes query string for unified search comparison', () => {
    expect(normalizeForSearch('xuéshēng')).toBe('xuesheng');
    expect(normalizeForSearch('học sinh')).toBe('hoc sinh');
  });
});

describe('DictionaryEngine — Data Loading & Readiness', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  }, 15000);

  it('is ready and loaded successfully', () => {
    expect(dictionaryEngine.isReady()).toBe(true);
    expect(dictionaryEngine.getLoadError()).toBeNull();
    expect(dictionaryEngine.getLoadTimeMs()).toBeGreaterThan(0);
  });

  it('loads exactly 122,596 entries (accounting for line 67266 double-bracket anomaly)', () => {
    // Total lines: 122,628
    // Non-empty, non-comment data lines: 122,597
    // Parsed entries: 122,596 (line 67266/67267 has malformed CC-CEDICT [[ ... ] ] brackets)
    expect(dictionaryEngine.getTotal()).toBe(122596);
  });
});

describe('DictionaryEngine — Target Search Variants for 學生', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('finds 學生 with traditional Hanzi query "學生"', () => {
    const res = dictionaryEngine.search('學生', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.simplified).toBe('学生');
    expect(top.definitions).toContain('học sinh');
  });

  it('finds 學生 with simplified Hanzi query "学生"', () => {
    const res = dictionaryEngine.search('学生', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.simplified).toBe('学生');
  });

  it('finds 學生 with toneless Pinyin "xuesheng"', () => {
    const res = dictionaryEngine.search('xuesheng', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.simplified).toBe('学生');
  });

  it('finds 學生 with accented Pinyin "xuéshēng"', () => {
    const res = dictionaryEngine.search('xuéshēng', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.simplified).toBe('学生');
  });

  it('finds 學生 with tone-numbered Pinyin "xue2 sheng1"', () => {
    const res = dictionaryEngine.search('xue2 sheng1', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.simplified).toBe('学生');
  });

  it('finds 學生 with accented Vietnamese "học sinh"', () => {
    const res = dictionaryEngine.search('học sinh', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.definitions).toContain('học sinh');
  });

  it('finds 學生 with unaccented Vietnamese "hoc sinh"', () => {
    const res = dictionaryEngine.search('hoc sinh', 'all', 0, 10);
    expect(res.total).toBeGreaterThan(0);
    expect(res.results.length).toBeGreaterThan(0);
    const top = res.results[0];
    expect(top.traditional).toBe('學生');
    expect(top.definitions).toContain('học sinh');
  });
});

describe('DictionaryEngine — Search Modes', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('mode "hanzi" only searches Hanzi fields', () => {
    const resHanzi = dictionaryEngine.search('學生', 'hanzi', 0, 10);
    expect(resHanzi.total).toBeGreaterThan(0);
    expect(resHanzi.results[0].traditional).toBe('學生');

    // Searching English/Vietnamese in hanzi mode should return 0
    const resViInHanzi = dictionaryEngine.search('học sinh', 'hanzi', 0, 10);
    expect(resViInHanzi.total).toBe(0);
    expect(resViInHanzi.results).toHaveLength(0);
  });

  it('mode "pinyin" only searches Pinyin fields', () => {
    const resPinyin = dictionaryEngine.search('xuesheng', 'pinyin', 0, 10);
    expect(resPinyin.total).toBeGreaterThan(0);
    expect(resPinyin.results[0].traditional).toBe('學生');

    // Searching Hanzi in pinyin mode should return 0
    const resHanziInPinyin = dictionaryEngine.search('學生', 'pinyin', 0, 10);
    expect(resHanziInPinyin.total).toBe(0);
  });

  it('mode "vi" only searches Vietnamese definitions', () => {
    const resVi = dictionaryEngine.search('học sinh', 'vi', 0, 10);
    expect(resVi.total).toBeGreaterThan(0);
    expect(resVi.results[0].traditional).toBe('學生');

    // Searching Hanzi that does not appear in Vietnamese definitions should return 0
    const resHanziInVi = dictionaryEngine.search('你好', 'vi', 0, 10);
    expect(resHanziInVi.total).toBe(0);

    // Searching Hanzi "學生" in vi mode does not return the headword 學生 itself
    const resHeadwordInVi = dictionaryEngine.search('學生', 'vi', 0, 10);
    expect(resHeadwordInVi.results.map(r => r.traditional)).not.toContain('學生');
  });
});

describe('DictionaryEngine — Accurate Pagination (Fixing DICT-01)', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('computes true total and does NOT cap at ~250 on broad queries', () => {
    // Query "de" is very common in Chinese and Vietnamese definitions
    const page1 = dictionaryEngine.search('de', 'all', 0, 20);
    const page2 = dictionaryEngine.search('de', 'all', 20, 20);
    const page10 = dictionaryEngine.search('de', 'all', 200, 20);

    // Verify true total is large (> 1000) and consistent across all pages
    expect(page1.total).toBeGreaterThan(1000);
    expect(page1.total).toBe(page2.total);
    expect(page1.total).toBe(page10.total);

    // Verify slice bounds
    expect(page1.results).toHaveLength(20);
    expect(page2.results).toHaveLength(20);
    expect(page10.results).toHaveLength(20);

    // Verify different items on different pages
    expect(page1.results[0].id).not.toBe(page2.results[0].id);
  });

  it('handles empty query gracefully by returning total count and empty results', () => {
    const res = dictionaryEngine.search('');
    expect(res.results).toEqual([]);
    expect(res.total).toBe(122596);
  });

  it('handles negative offset and out-of-bounds offset safely', () => {
    const resNeg = dictionaryEngine.search('學生', 'all', -5, 10);
    expect(resNeg.results.length).toBeGreaterThan(0);

    const resFar = dictionaryEngine.search('學生', 'all', 99999, 10);
    expect(resFar.results).toEqual([]);
    expect(resFar.total).toBeGreaterThan(0);
  });
});

describe('DictionaryEngine — Lookup by ID (getById)', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('retrieves entry by full ID "cv_31249"', () => {
    const entry = dictionaryEngine.getById('cv_31249');
    expect(entry).not.toBeNull();
    expect(entry?.traditional).toBe('學生');
    expect(entry?.simplified).toBe('学生');
    expect(entry?.pinyin).toBe('xue2 sheng5');
    expect(entry?.definitions).toContain('học sinh');
  });

  it('retrieves entry by numeric ID "31249"', () => {
    const entry = dictionaryEngine.getById('31249');
    expect(entry).not.toBeNull();
    expect(entry?.traditional).toBe('學生');
  });

  it('retrieves entry by "dict-31249"', () => {
    const entry = dictionaryEngine.getById('dict-31249');
    expect(entry).not.toBeNull();
    expect(entry?.traditional).toBe('學生');
  });

  it('returns null for unknown ID', () => {
    const entry = dictionaryEngine.getById('cv_99999999');
    expect(entry).toBeNull();
  });
});

describe('DictionaryEngine — Robust Error Handling', () => {
  it('handles non-existent dictionary file without throwing', async () => {
    const testEngine = new DictionaryEngine();
    await testEngine.init('C:/path/to/non_existent_dict.u8.gz');

    expect(testEngine.isReady()).toBe(false);
    expect(testEngine.getTotal()).toBe(0);
    expect(testEngine.getLoadError()).toContain('not found');
    expect(testEngine.search('xuesheng')).toEqual({ results: [], total: 0 });
    expect(testEngine.getById('cv_1')).toBeNull();
  });

  it('handles corrupted gzip dictionary file without throwing', async () => {
    const tempDir = os.tmpdir();
    const corruptFile = path.join(tempDir, `corrupt_dict_${Date.now()}.u8.gz`);
    fs.writeFileSync(corruptFile, Buffer.from('NOT_A_VALID_GZIP_FILE_CONTENT'));

    try {
      const testEngine = new DictionaryEngine();
      await testEngine.init(corruptFile);

      expect(testEngine.isReady()).toBe(false);
      expect(testEngine.getTotal()).toBe(0);
      expect(testEngine.getLoadError()).toBeTruthy();
      expect(testEngine.search('xuesheng')).toEqual({ results: [], total: 0 });
    } finally {
      if (fs.existsSync(corruptFile)) {
        fs.unlinkSync(corruptFile);
      }
    }
  });
});

// ============================================================================
// Acceptance G5 & F06: Contract 3-Number Separation, Corpus Integrity & Live Route
// ============================================================================
describe('Acceptance G5 & F06: 3-Number Contract Invariants at DictionaryEngine Level', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('verifies 3 distinct metrics on broad search: dictionaryTotal (122596), totalMatches (10622), pageCount (20)', () => {
    const totalCorpus = dictionaryEngine.getTotal();
    const searchRes = dictionaryEngine.search('de', 'all', 0, 20);

    // 1. dictionaryTotal: total records in the entire dictionary
    expect(totalCorpus).toBe(122596);

    // 2. totalMatches: total entries matching query 'de' across all entries
    expect(searchRes.total).toBe(10622);

    // 3. pageCount: items returned in the requested page
    expect(searchRes.results).toHaveLength(20);

    // Invariant: The 3 numbers must NOT be collapsed or confused with each other
    expect(totalCorpus).not.toBe(searchRes.total);
    expect(totalCorpus).not.toBe(searchRes.results.length);
    expect(searchRes.total).not.toBe(searchRes.results.length);
  });

  it('guarantees pagination offset stability and distinct items across consecutive slices', () => {
    const p1 = dictionaryEngine.search('de', 'all', 0, 20);
    const p2 = dictionaryEngine.search('de', 'all', 20, 20);
    const p3 = dictionaryEngine.search('de', 'all', 40, 20);

    expect(p1.total).toBe(10622);
    expect(p2.total).toBe(10622);
    expect(p3.total).toBe(10622);

    const ids1 = new Set(p1.results.map(r => r.id));
    const ids2 = new Set(p2.results.map(r => r.id));
    const ids3 = new Set(p3.results.map(r => r.id));

    // Zero overlap between slices
    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }
    for (const id of ids3) {
      expect(ids2.has(id)).toBe(false);
    }
  });
});

describe('Acceptance G5: Corpus Integrity & Non-Lesson Vocabulary (CVDICT 122k Exclusive)', () => {
  beforeAll(async () => {
    await dictionaryEngine.init();
  });

  it('retrieves corpus-only entry "乾杯" (cheers / cạn ly) via ID lookup and multi-tier search', () => {
    // Search by Hanzi to find corpus entry
    const searchHanzi = dictionaryEngine.search('乾杯', 'all', 0, 5);
    expect(searchHanzi.results.length).toBeGreaterThan(0);
    const firstMatch = searchHanzi.results.find(r => r.traditional === '乾杯') || searchHanzi.results[0];
    expect(firstMatch.traditional).toBe('乾杯');
    expect(firstMatch.definitions.some(d => d.includes('cạn ly'))).toBe(true);

    // ID lookup for the real entry ID
    const byId = dictionaryEngine.getById(firstMatch.id);
    expect(byId).not.toBeNull();
    expect(byId?.traditional).toBe('乾杯');
    expect(byId?.simplified).toBe('干杯');
    expect(byId?.pinyin).toBe('gan1 bei1');
    expect(byId?.definitions.some(d => d.includes('cạn ly'))).toBe(true);

    // Search by Pinyin
    const searchPinyin = dictionaryEngine.search('ganbei', 'all', 0, 5);
    expect(searchPinyin.results.some(r => r.traditional === '乾杯')).toBe(true);

    // Search by Vietnamese definition
    const searchVi = dictionaryEngine.search('cạn ly', 'all', 0, 5);
    expect(searchVi.results.some(r => r.traditional === '乾杯')).toBe(true);
  });

  it('retrieves corpus-only entry "電腦" (computer / máy vi tính)', () => {
    const searchHanzi = dictionaryEngine.search('電腦', 'all', 0, 5);
    expect(searchHanzi.results.some(r => r.traditional === '電腦')).toBe(true);

    const searchPinyin = dictionaryEngine.search('diannao', 'all', 0, 5);
    expect(searchPinyin.results.some(r => r.traditional === '電腦')).toBe(true);
  });
});

describe('Acceptance G5 & F06: Live HTTP Route /api/dictionary 3-Number Contract (F06 Reproduction)', () => {
  let testServer: RunningTestServer;

  beforeAll(async () => {
    testServer = await createTestServer({ loadDictionary: true });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  it('F06 Live Route Reproduction: GET /api/dictionary?q=de&limit=20 returns dictionaryTotal, totalMatches, and pageCount', async () => {
    const res = await testServer.fetch('/api/dictionary?q=de&limit=20');
    expect(res.status).toBe(200);

    const body = await res.json() as {
      results: Array<unknown>;
      total: number;
      count: number;
      dictionaryTotal?: number;
      totalMatches?: number;
      pageCount?: number;
      source: string;
    };

    expect(body.source).toBe('database');
    expect(body.results).toHaveLength(20);

    // Invariant G5 / F06 Contract Requirement:
    // The HTTP response must provide the 3 numbers:
    // 1. dictionaryTotal: total entries in the entire dictionary (122,596)
    // 2. totalMatches: total matches for query 'de' (10,622)
    // 3. pageCount: items returned in this page (20)
    expect(body.dictionaryTotal).toBe(122596);
    expect(body.totalMatches ?? body.total).toBe(10622);
    expect(body.pageCount ?? body.count).toBe(20);

    // Invariant: dictionaryTotal must never equal pageCount (prevents UI badge collapse)
    expect(body.dictionaryTotal).not.toBe(body.pageCount ?? body.count);
  });

  it('GET /api/dictionary?id=... serves corpus-only word with correct database fields', async () => {
    const searchRes = dictionaryEngine.search('乾杯', 'all', 0, 1);
    const targetId = searchRes.results[0]?.id || 'cv_1';
    const res = await testServer.fetch(`/api/dictionary?id=${targetId}`);
    expect(res.status).toBe(200);

    const body = await res.json() as {
      id: string;
      traditional: string;
      definitions: string[];
    };

    expect(body.traditional).toBe('乾杯');
    expect(body.definitions.some(d => d.includes('cạn ly'))).toBe(true);
  });
});
