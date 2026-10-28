import { describe, it, expect } from 'vitest';
import {
  normalizeVietnamese,
  convertToneMarksToNumbered,
  normalizePinyin,
  isHanziText,
  normalizeSearchQuery,
  matchesQuery
} from '../src/domain/searchNormalization';

describe('searchNormalization — Subagent A07 Unit Tests', () => {
  describe('1. normalizeVietnamese', () => {
    it('normalizes basic Vietnamese phrases without diacritics', () => {
      expect(normalizeVietnamese('học sinh')).toBe('hoc sinh');
      expect(normalizeVietnamese('hoc sinh')).toBe('hoc sinh');
      expect(normalizeVietnamese('tiếng việt')).toBe('tieng viet');
      expect(normalizeVietnamese('tieng viet')).toBe('tieng viet');
    });

    it('handles đ and Đ correctly', () => {
      expect(normalizeVietnamese('Đài Loan')).toBe('dai loan');
      expect(normalizeVietnamese('đài loan')).toBe('dai loan');
      expect(normalizeVietnamese('dai loan')).toBe('dai loan');
      expect(normalizeVietnamese('Đà Nẵng')).toBe('da nang');
      expect(normalizeVietnamese('đồng hồ')).toBe('dong ho');
    });

    it('supports preserveCase option when requested', () => {
      expect(normalizeVietnamese('Đài Loan', { preserveCase: true })).toBe('Dai Loan');
      expect(normalizeVietnamese('Việt Nam', { preserveCase: true })).toBe('Viet Nam');
      expect(normalizeVietnamese('ĐỒNG NAI', { preserveCase: true })).toBe('DONG NAI');
    });

    it('covers all Vietnamese vowels across all 5 tones and modifications', () => {
      const vowelsWithAllTones =
        'a ă â e ê i o ô ơ u ư y á à ả ã ạ ắ ằ ẳ ẵ ặ ấ ầ ẩ ẫ ậ é è ẻ ẽ ẹ ế ề ể ễ ệ í ì ỉ ĩ ị ó ò ỏ õ ọ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ú ù ủ ũ ụ ứ ừ ử ữ ự ý ỳ ỷ ỹ ỵ';
      const normalized = normalizeVietnamese(vowelsWithAllTones);
      // All characters should be plain ASCII a, e, i, o, u, y
      expect(normalized).toBe(
        'a a a e e i o o o u u y a a a a a a a a a a a a a a a e e e e e e e e e e i i i i i o o o o o o o o o o o o o o o u u u u u u u u u u y y y y y'
      );
    });

    it('handles decomposed Unicode (NFD) identically to precomposed (NFC)', () => {
      const nfc = 'tiếng việt';
      const nfd = 'tiếng việt'.normalize('NFD');
      expect(nfc).not.toBe(nfd);
      expect(normalizeVietnamese(nfc)).toBe('tieng viet');
      expect(normalizeVietnamese(nfd)).toBe('tieng viet');
    });

    it('preserves Pinyin phonetic distinction so ü / u: is converted to v rather than stripped to u', () => {
      expect(normalizeVietnamese('lǜ')).toBe('lv');
      expect(normalizeVietnamese('lu:4')).toBe('lv4');
      expect(normalizeVietnamese('lù')).toBe('lu');
    });

    it('safely handles edge cases like empty strings, non-string, or whitespace', () => {
      expect(normalizeVietnamese('')).toBe('');
      expect(normalizeVietnamese('   ')).toBe('');
      // @ts-expect-error test non-string runtime safety
      expect(normalizeVietnamese(null)).toBe('');
      // @ts-expect-error test non-string runtime safety
      expect(normalizeVietnamese(undefined)).toBe('');
    });
  });

  describe('2. convertToneMarksToNumbered', () => {
    it('converts single syllables with all 4 tones correctly', () => {
      expect(convertToneMarksToNumbered('mā')).toBe('ma1');
      expect(convertToneMarksToNumbered('má')).toBe('ma2');
      expect(convertToneMarksToNumbered('mǎ')).toBe('ma3');
      expect(convertToneMarksToNumbered('mà')).toBe('ma4');
    });

    it('converts diphthongs placing tone numbers at the end of the syllable', () => {
      expect(convertToneMarksToNumbered('hǎo')).toBe('hao3');
      expect(convertToneMarksToNumbered('lèi')).toBe('lei4');
      expect(convertToneMarksToNumbered('lái')).toBe('lai2');
      expect(convertToneMarksToNumbered('dòu')).toBe('dou4');
    });

    it('converts nasal codas (n, ng) placing tone numbers at the end', () => {
      expect(convertToneMarksToNumbered('shēng')).toBe('sheng1');
      expect(convertToneMarksToNumbered('jiàn')).toBe('jian4');
      expect(convertToneMarksToNumbered('zhōng')).toBe('zhong1');
      expect(convertToneMarksToNumbered('tiān')).toBe('tian1');
      expect(convertToneMarksToNumbered('rén')).toBe('ren2');
    });

    it('handles compound words with and without spaces', () => {
      expect(convertToneMarksToNumbered('xuéshēng')).toBe('xue2sheng1');
      expect(convertToneMarksToNumbered('xué shēng')).toBe('xue2 sheng1');
      expect(convertToneMarksToNumbered('tàiwān')).toBe('tai4wan1');
      expect(convertToneMarksToNumbered('běijīng')).toBe('bei3jing1');
      expect(convertToneMarksToNumbered('hǎokàn')).toBe('hao3kan4');
    });

    it('handles ü, ǖ, ǘ, ǚ, ǜ, u:, and v correctly', () => {
      expect(convertToneMarksToNumbered('lù')).toBe('lu4');
      expect(convertToneMarksToNumbered('lǜ')).toBe('lv4');
      expect(convertToneMarksToNumbered('nǚ')).toBe('nv3');
      expect(convertToneMarksToNumbered('nu:3')).toBe('nv3');
      expect(convertToneMarksToNumbered('lu:4')).toBe('lv4');
      expect(convertToneMarksToNumbered('lü')).toBe('lv');
    });

    it('preserves Hanzi characters intact', () => {
      expect(convertToneMarksToNumbered('學生')).toBe('學生');
      expect(convertToneMarksToNumbered('學生 [xuéshēng]')).toBe('學生 [xue2sheng1]');
    });
  });

  describe('3. normalizePinyin', () => {
    it('normalizes target terms xuéshēng, xue2 sheng1, xue2sheng1, xuesheng', () => {
      const p1 = normalizePinyin('xuéshēng');
      const p2 = normalizePinyin('xue2 sheng1');
      const p3 = normalizePinyin('xue2sheng1');
      const p4 = normalizePinyin('xuesheng');

      expect(p1.clean).toBe('xuesheng');
      expect(p2.clean).toBe('xuesheng');
      expect(p3.clean).toBe('xuesheng');
      expect(p4.clean).toBe('xuesheng');

      expect(p1.numbered).toBe('xue2sheng1');
      expect(p2.numbered).toBe('xue2 sheng1');
      expect(p3.numbered).toBe('xue2sheng1');
      expect(p4.numbered).toBe('xuesheng');
    });

    it('differentiates lù vs lǜ and nù vs nǚ consistently', () => {
      const pLu = normalizePinyin('lù');
      const pLv = normalizePinyin('lǜ');
      const pLvCC = normalizePinyin('lu:4');
      const pLvV = normalizePinyin('lv4');

      expect(pLu.clean).toBe('lu');
      expect(pLv.clean).toBe('lv');
      expect(pLvCC.clean).toBe('lv');
      expect(pLvV.clean).toBe('lv');
      expect(pLu.clean).not.toBe(pLv.clean);

      const pNu = normalizePinyin('nù');
      const pNv = normalizePinyin('nǚ');
      const pNvCC = normalizePinyin('nu:3');
      expect(pNu.clean).toBe('nu');
      expect(pNv.clean).toBe('nv');
      expect(pNvCC.clean).toBe('nv');
      expect(pNu.clean).not.toBe(pNv.clean);
    });

    it('strips punctuation, spaces, and hyphens in clean', () => {
      expect(normalizePinyin('xué-shēng').clean).toBe('xuesheng');
      expect(normalizePinyin('xué_shēng').clean).toBe('xuesheng');
      expect(normalizePinyin('  xue2   sheng1  ').clean).toBe('xuesheng');
      expect(normalizePinyin('[xue2 sheng1]').clean).toBe('xuesheng');
    });

    it('handles uppercase and mixed case correctly', () => {
      expect(normalizePinyin('XUÉSHĒNG').clean).toBe('xuesheng');
      expect(normalizePinyin('XuéShēng').clean).toBe('xuesheng');
      expect(normalizePinyin('XUE2 SHENG1').clean).toBe('xuesheng');
    });

    it('preserves Hanzi in both numbered and clean', () => {
      const res = normalizePinyin('學生');
      expect(res.clean).toBe('學生');
      expect(res.numbered).toBe('學生');
      expect(res.original).toBe('學生');
    });

    it('handles empty and invalid input safely', () => {
      expect(normalizePinyin('')).toEqual({ original: '', numbered: '', clean: '' });
      // @ts-expect-error test non-string safety
      expect(normalizePinyin(null)).toEqual({ original: '', numbered: '', clean: '' });
    });
  });

  describe('4. isHanziText', () => {
    it('identifies pure Hanzi strings correctly', () => {
      expect(isHanziText('學生')).toBe(true);
      expect(isHanziText('台灣')).toBe(true);
      expect(isHanziText('你好')).toBe(true);
      expect(isHanziText('臺北')).toBe(true);
      expect(isHanziText('學')).toBe(true);
    });

    it('identifies Hanzi with punctuation or whitespace', () => {
      expect(isHanziText('  學生  ')).toBe(true);
      expect(isHanziText('台灣？')).toBe(true);
      expect(isHanziText('你好！')).toBe(true);
    });

    it('returns false for Latin, Vietnamese, or Pinyin strings', () => {
      expect(isHanziText('xuesheng')).toBe(false);
      expect(isHanziText('xuéshēng')).toBe(false);
      expect(isHanziText('học sinh')).toBe(false);
      expect(isHanziText('Đài Loan')).toBe(false);
      expect(isHanziText('12345')).toBe(false);
      expect(isHanziText('')).toBe(false);
    });
  });

  describe('5. normalizeSearchQuery', () => {
    it('generates multi-mode components for Hanzi query', () => {
      const q = normalizeSearchQuery('學生');
      expect(q.raw).toBe('學生');
      expect(q.clean).toBe('學生');
      expect(q.isHanzi).toBe(true);
      expect(q.pinyinClean).toBe('學生');
    });

    it('generates multi-mode components for Pinyin query', () => {
      const q = normalizeSearchQuery('xuéshēng');
      expect(q.raw).toBe('xuéshēng');
      expect(q.isHanzi).toBe(false);
      expect(q.pinyinClean).toBe('xuesheng');
    });

    it('generates multi-mode components for Vietnamese query', () => {
      const q = normalizeSearchQuery('học sinh');
      expect(q.raw).toBe('học sinh');
      expect(q.isHanzi).toBe(false);
      expect(q.viClean).toBe('hoc sinh');
    });

    it('handles empty query safely', () => {
      const q = normalizeSearchQuery('');
      expect(q.raw).toBe('');
      expect(q.clean).toBe('');
      expect(q.isHanzi).toBe(false);
    });
  });

  describe('6. matchesQuery — Complete Multi-Domain Matching', () => {
    const entryStudent = '學生 [xue2 sheng1] /học sinh/';
    const entryTaiwan = '台灣 [Tai2 wan1] /Đài Loan/';
    const entryHello = '你好 [ni3 hao3] /xin chào/';
    const entryLu = '路 [lu4] /đường/';
    const entryLv = '綠 绿 [lu:4] /màu xanh lá/';
    const entryNv = '女 [nu:3] /phụ nữ/';

    describe('Hanzi Queries', () => {
      it('matches 學生, 台灣, 你好 against dictionary entries', () => {
        expect(matchesQuery(entryStudent, '學生')).toBe(true);
        expect(matchesQuery(entryTaiwan, '台灣')).toBe(true);
        expect(matchesQuery(entryHello, '你好')).toBe(true);
      });

      it('does not match unrelated Hanzi', () => {
        expect(matchesQuery(entryStudent, '老師')).toBe(false);
        expect(matchesQuery(entryTaiwan, '日本')).toBe(false);
      });
    });

    describe('Pinyin Queries', () => {
      it('matches all forms of xuesheng (xuesheng, xuéshēng, xue2 sheng1, xue2sheng1)', () => {
        expect(matchesQuery(entryStudent, 'xuesheng')).toBe(true);
        expect(matchesQuery(entryStudent, 'xuéshēng')).toBe(true);
        expect(matchesQuery(entryStudent, 'xue2 sheng1')).toBe(true);
        expect(matchesQuery(entryStudent, 'xue2sheng1')).toBe(true);
        expect(matchesQuery(entryStudent, 'XUÉSHĒNG')).toBe(true);
      });

      it('strictly distinguishes lù (road) and lǜ (green)', () => {
        // Matches for lù
        expect(matchesQuery(entryLu, 'lù')).toBe(true);
        expect(matchesQuery(entryLu, 'lu4')).toBe(true);
        expect(matchesQuery(entryLu, 'lu')).toBe(true);
        expect(matchesQuery(entryLu, 'lǜ')).toBe(false);
        expect(matchesQuery(entryLu, 'lv4')).toBe(false);
        expect(matchesQuery(entryLu, 'lu:4')).toBe(false);

        // Matches for lǜ
        expect(matchesQuery(entryLv, 'lǜ')).toBe(true);
        expect(matchesQuery(entryLv, 'lu:4')).toBe(true);
        expect(matchesQuery(entryLv, 'lv4')).toBe(true);
        expect(matchesQuery(entryLv, 'lv')).toBe(true);
        expect(matchesQuery(entryLv, 'lù')).toBe(false);
        expect(matchesQuery(entryLv, 'lu4')).toBe(false);
        expect(matchesQuery(entryLv, 'lu')).toBe(false);
      });

      it('strictly distinguishes nǚ (woman) and nù (angry)', () => {
        expect(matchesQuery(entryNv, 'nǚ')).toBe(true);
        expect(matchesQuery(entryNv, 'nu:3')).toBe(true);
        expect(matchesQuery(entryNv, 'nv3')).toBe(true);
        expect(matchesQuery(entryNv, 'nv')).toBe(true);
        expect(matchesQuery(entryNv, 'nù')).toBe(false);
        expect(matchesQuery(entryNv, 'nu4')).toBe(false);
      });
    });

    describe('Vietnamese Queries', () => {
      it('matches both accented and unaccented Vietnamese', () => {
        expect(matchesQuery(entryStudent, 'học sinh')).toBe(true);
        expect(matchesQuery(entryStudent, 'hoc sinh')).toBe(true);
        expect(matchesQuery(entryTaiwan, 'Đài Loan')).toBe(true);
        expect(matchesQuery(entryTaiwan, 'dai loan')).toBe(true);
        expect(matchesQuery(entryHello, 'xin chào')).toBe(true);
        expect(matchesQuery(entryHello, 'xin chao')).toBe(true);
      });

      it('supports bidirectional matching between accented and unaccented targets', () => {
        expect(matchesQuery('Đài Loan', 'dai loan')).toBe(true);
        expect(matchesQuery('dai loan', 'Đài Loan')).toBe(true);
        expect(matchesQuery('tiếng việt', 'tieng viet')).toBe(true);
        expect(matchesQuery('tieng viet', 'tiếng việt')).toBe(true);
        expect(matchesQuery('hoc sinh gioi', 'học sinh')).toBe(true);
        expect(matchesQuery('hoc sinh', 'học sinh')).toBe(true);
        expect(matchesQuery('học sinh', 'hocsinh')).toBe(true);
      });
    });

    describe('Unicode NFC / NFD and Robustness', () => {
      it('matches decomposed NFD queries with precomposed NFC targets', () => {
        const nfdStudentPinyin = 'xuéshēng'.normalize('NFD');
        const nfdVietnamese = 'học sinh'.normalize('NFD');
        const nfdLv = 'lǜ'.normalize('NFD');

        expect(matchesQuery(entryStudent, nfdStudentPinyin)).toBe(true);
        expect(matchesQuery(entryStudent, nfdVietnamese)).toBe(true);
        expect(matchesQuery(entryLv, nfdLv)).toBe(true);
      });

      it('handles excess whitespace, hyphens, and mixed casing', () => {
        expect(matchesQuery(entryStudent, '  xue2    sheng1  ')).toBe(true);
        expect(matchesQuery(entryStudent, 'xué-shēng')).toBe(true);
        expect(matchesQuery('xuesheng', 'XUÉSHĒNG')).toBe(true);
        expect(matchesQuery('ĐÀI LOAN', 'đài loan')).toBe(true);
      });

      it('returns false for empty or non-matching inputs', () => {
        expect(matchesQuery('', 'xuesheng')).toBe(false);
        expect(matchesQuery(entryStudent, '')).toBe(false);
        expect(matchesQuery(entryStudent, '   ')).toBe(false);
        expect(matchesQuery(entryStudent, 'không liên quan')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Acceptance G5: Search Normalization Invariant Matrix for 學生
  // ==========================================================================
  describe('Acceptance G5: Complete Search Normalization Matrix for 學生', () => {
    // Dictionary entry format with traditional, simplified, tone-marked/numbered pinyin, and definitions
    const studentTarget = '學生 学生 [xue2 sheng1] [xue2 sheng5] /học sinh; sinh viên; học trò/';

    const testMatrix = [
      { type: 'Traditional Hanzi', query: '學生', expected: true },
      { type: 'Simplified Hanzi', query: '学生', expected: true },
      { type: 'Toneless Pinyin', query: 'xuesheng', expected: true },
      { type: 'Accented Pinyin (single word)', query: 'xuéshēng', expected: true },
      { type: 'Accented Pinyin (with space)', query: 'xué shēng', expected: true },
      { type: 'Tone-numbered Pinyin (with space)', query: 'xue2 sheng1', expected: true },
      { type: 'Tone-numbered Pinyin (without space)', query: 'xue2sheng1', expected: true },
      { type: 'Tone-numbered Pinyin (neutral tone 5)', query: 'xue2 sheng5', expected: true },
      { type: 'Accented Vietnamese', query: 'học sinh', expected: true },
      { type: 'Unaccented Vietnamese', query: 'hoc sinh', expected: true },
      { type: 'Decomposed Unicode (NFD) Pinyin', query: 'xuéshēng'.normalize('NFD'), expected: true },
      { type: 'Decomposed Unicode (NFD) Vietnamese', query: 'học sinh'.normalize('NFD'), expected: true }
    ];

    for (const { type, query, expected } of testMatrix) {
      it(`correctly matches ${type}: "${query}"`, () => {
        expect(matchesQuery(studentTarget, query)).toBe(expected);
      });
    }

    it('rejects queries for unrelated words', () => {
      expect(matchesQuery(studentTarget, 'laoshi')).toBe(false);
      expect(matchesQuery(studentTarget, 'thầy giáo')).toBe(false);
      expect(matchesQuery(studentTarget, 'nihao')).toBe(false);
    });
  });
});
