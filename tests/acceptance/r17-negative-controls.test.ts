import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  toggleSavedWord,
  saveState,
  loadState,
  exportState,
  importState,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  MAX_STATE_JSON_LENGTH,
  MAX_VOCAB_SIZE,
  clearCustomWordRegistry,
  findWord,
  reviewWord,
  updateProfile,
  getStats,
  getDueWords,
  computeEaseFactor,
  localDate,
} from '../../src/domain/learning';
import { allWords } from '../../src/data/lessons';
import type { Word, LearningState } from '../../src/types';

// Fresh isolated Storage mock
function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

// Adversarial dataset generator completely different from T09
// Features:
// - Rare traditional Taiwanese Hanzi & astral UTF-16 surrogate pairs (e.g. 𪚥, 𠮷, 𣛧)
// - Decomposed Unicode NFD pinyin with combining accents
// - Ultra-long meanings (400-800 characters) containing quotes, escaped characters, HTML/XML tags, emojis, zero-width spaces
// - Technical, legal, ecological and philosophical categories
function createAdversarialWord(index: number): Word {
  const astralChars = ['𪚥', '𠮷', '𡈽', '𪚥', '𣛧', '𤓓'];
  const astralChar = astralChars[index % astralChars.length];

  // Unicode NFD Pinyin: 'e\u0301' (é decomposed), 'a\u0300' (à decomposed), 'u\u0304' (ū decomposed), 'o\u030c' (ǒ decomposed)
  const nfdPinyinTemplates = [
    'zhe\u0301ng ya\u0300n lia\u0301ng li\u0300ng',
    'hu\u030cng lia\u0301ng sha\u0304n li\u0301ng',
    'tia\u0304n di\u0300 xu\u0301an hua\u0301ng',
    'yo\u030cng she\u0300n zhi\u0300 da\u0300o',
    'ku\u0300ang fe\u0304ng ba\u0300o yu\u030c',
    'ji\u0301ng we\u030ci f\u0304en mi\u0301ng',
  ];

  const categories = [
    'Thuật ngữ Pháp lý & Hành chính Đài Loan',
    'Văn học Cổ điển & Điển tích Đài Loan',
    'Triết học & Dân tộc học Nam Đảo',
    'Y học Cổ truyền & Dược điển Thảo mộc',
    'Địa chất & Sinh thái Rừng nguyên sinh A Lý Sơn',
    'Ngôn ngữ học & Thanh điệu Mân Nam Đài Loan',
  ];

  const category = categories[index % categories.length];
  const pinyinNfd = `${nfdPinyinTemplates[index % nfdPinyinTemplates.length]} #${index + 1}`;
  const id = `cv_adv_${index + 1}`;

  // Ultra-long meaning with special characters: quotes, newlines, tabs, HTML tags, emojis, zero-width space
  const meaning = [
    `【Mục từ #${index + 1} - ${astralChar}】Giải nghĩa chi tiết đa tầng nghĩa:`,
    `1. Nghĩa đen: Biểu thị hiện tượng tự nhiên hoặc khái niệm triết học sâu sắc trong văn hóa Đài Loan.`,
    `2. Ngữ cảnh sử dụng: Thường xuất hiện trong văn bản hành chính 《Công báo Đài Loan》 hoặc tác phẩm của văn hào Lại Hòa (賴和).`,
    `3. Dị bản & Chú giải ngữ âm: Chữ "${astralChar}" mang thanh điệu thứ ${ (index % 4) + 1 }, kết hợp thanh mẫu và vận mẫu đặc thù.`,
    `4. Cảnh báo lỗi ký tự: Kiểm tra an toàn ký tự đặc biệt: <script>alert("test")</script>, &amp;, &quot;, \\n, \\t, \\", "quotes", 'single-quotes'.`,
    `5. Emojis & Ký hiệu: 🏮 🇹🇼 📜 ⛰️ 🌊 ⚡ ⚖️ 🔬 [Ký tự Zero-Width: \u200B\u200B]`,
    `6. Phân tích chi tiết bổ sung: Đoạn văn phân tích mở rộng ngữ nghĩa nhằm kiểm tra sức chịu tải dung lượng bộ nhớ đối với các từ điển chuyên sâu có độ dài diễn giải cực lớn trên 500 ký tự.`,
  ].join(' | ');

  const example = `在臺灣文獻叢刊第${index + 1}卷中記載：「${astralChar}，天地之精華，山川之秀氣，未嘗一日不在人間也。」`;
  const examplePinyin = `Za\u0300i Ta\u0301iwa\u0304n we\u0301nxia\u0300n co\u0301ngka\u0304n di\u0300 ${index + 1} jua\u0300n zho\u0304ng ji\u0300za\u0300i.`;
  const exampleMeaning = `Trong tập số ${index + 1} của Văn hiến Tùng san Đài Loan có ghi chép: "${astralChar}, tinh hoa của trời đất, khí thiêng của núi sông, chưa từng một ngày nào vắng bóng nơi nhân gian."`;

  return {
    id,
    hanzi: `詞彙${astralChar}_${index + 1}`,
    pinyin: pinyinNfd,
    meaning,
    example,
    examplePinyin,
    exampleMeaning,
    category,
    lessonId: 'custom-dictionary',
  };
}

// Build state with N adversarial words
function buildAdversarialState(count: number, reviewRatio = 0.1): LearningState {
  let state = createInitialState();
  state = updateProfile(state, { name: 'Người nghiên cứu Hán ngữ Cổ & Đài Loan 🇹🇼', dailyGoal: 50 });

  const refDate = new Date(2026, 9, 22);
  const dayStr = localDate(refDate);

  const reviewCount = Math.floor(count * reviewRatio);

  for (let i = 0; i < count; i++) {
    const w = createAdversarialWord(i);
    state = toggleSavedWord(state, w.id, w);

    if (i < reviewCount) {
      state = {
        ...state,
        reviews: {
          ...state.reviews,
          [w.id]: {
            dueDate: '2026-10-27',
            interval: 5,
            repetitions: 2,
            lastReviewed: dayStr,
          },
        },
      };
    }
  }

  if (reviewCount > 0) {
    state = {
      ...state,
      activity: {
        [dayStr]: {
          xp: reviewCount * 5,
          lessons: 0,
          reviews: reviewCount,
        },
      },
    };
  }

  return state;
}

describe('R17 Data Reviewer Negative Controls & Falsification Suite', () => {
  beforeEach(() => {
    clearCustomWordRegistry();
  });

  describe('1. Scalability, Extreme Lengths, Unicode NFD & Astral Symbols', () => {
    it('saves, exports, imports and loads 1,200 adversarial words with Unicode NFD and special characters', () => {
      const state1200 = buildAdversarialState(1200, 0.2); // 240 reviewed words
      const storage1200 = createMockStorage();

      const saveErr = saveState(state1200, storage1200);
      expect(saveErr).toBeNull();

      const rawJson = storage1200.getItem(STORAGE_KEY);
      expect(rawJson).toBeTruthy();
      expect(rawJson!.length).toBeGreaterThan(500000);
      expect(rawJson!.length).toBeLessThan(MAX_STATE_JSON_LENGTH);

      // Verify fresh context load
      clearCustomWordRegistry();
      const loaded = loadState(storage1200);
      expect(loaded.error).toBeNull();
      expect(loaded.state.savedWordIds).toHaveLength(1200);
      expect(Object.keys(loaded.state.reviews)).toHaveLength(240);

      // Verify exact Unicode NFD, astral surrogate pair and special character preservation
      const w1 = findWord('cv_adv_1');
      expect(w1).toBeDefined();
      expect(w1?.pinyin).toContain('\u0301'); // Decomposed NFD accent mark preserved
      expect(w1?.meaning).toContain('<script>alert("test")</script>');
      expect(w1?.meaning).toContain('\u200B'); // Zero-width space preserved

      const w600 = findWord('cv_adv_600');
      expect(w600).toBeDefined();
      expect(w600?.hanzi).toContain('詞彙');

      const w1200 = findWord('cv_adv_1200');
      expect(w1200).toBeDefined();
      expect(w1200?.meaning).toContain('【Mục từ #1200');

      // Verify exportState -> importState symmetric roundtrip
      clearCustomWordRegistry();
      const exported = exportState(loaded.state);
      const imported = importState(exported);
      expect(imported.savedWordIds).toHaveLength(1200);
      expect(findWord('cv_adv_1200')).toBeDefined();
    });

    it('saves and loads 1,500 adversarial words without truncation or memory corruption', () => {
      const state1500 = buildAdversarialState(1500, 0.2); // 300 reviewed words
      const storage1500 = createMockStorage();

      const saveErr = saveState(state1500, storage1500);
      expect(saveErr).toBeNull();

      const rawJson = storage1500.getItem(STORAGE_KEY);
      expect(rawJson).toBeTruthy();
      expect(rawJson!.length).toBeGreaterThan(650000);
      expect(rawJson!.length).toBeLessThan(MAX_STATE_JSON_LENGTH);

      clearCustomWordRegistry();
      const loaded = loadState(storage1500);
      expect(loaded.error).toBeNull();
      expect(loaded.state.savedWordIds).toHaveLength(1500);
      expect(Object.keys(loaded.state.reviews)).toHaveLength(300);

      const w1500 = findWord('cv_adv_1500');
      expect(w1500).toBeDefined();
      expect(w1500?.meaning).toContain('【Mục từ #1500');
    });

    it('falsification boundary: protects raw data and backs up when payload exceeds MAX_STATE_JSON_LENGTH', () => {
      // Build a dataset that intentionally crosses MAX_STATE_JSON_LENGTH (2,000,000 chars)
      let stateHuge = createInitialState();
      const hugePadding = 'X'.repeat(2500);
      for (let i = 0; i < 900; i++) {
        const w: Word = {
          id: `cv_huge_${i + 1}`,
          hanzi: `字_${i + 1}`,
          pinyin: `zi_${i + 1}`,
          meaning: `Nghĩa mở rộng quá cỡ: ${hugePadding}`,
          example: 'Ví dụ',
          examplePinyin: 'vi du',
          exampleMeaning: 'vi du nghia',
          category: 'Test',
          lessonId: 'custom-dictionary',
        };
        stateHuge = toggleSavedWord(stateHuge, w.id, w);
      }

      const storage = createMockStorage();
      saveState(stateHuge, storage);
      const rawHuge = storage.getItem(STORAGE_KEY) ?? '';
      expect(rawHuge.length).toBeGreaterThan(MAX_STATE_JSON_LENGTH);

      // Attempt loadState in fresh context
      clearCustomWordRegistry();
      const loaded = loadState(storage);

      // Must NOT wipe storage, must create backup and return clear error
      expect(loaded.error).toBe('Không thể đọc tiến độ đã lưu. Dữ liệu trong phiên này vẫn sử dụng được.');
      expect(loaded.isCorrupt).toBe(true);
      expect(storage.getItem(STORAGE_KEY)).toBe(rawHuge);
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(rawHuge);
    });
  });

  describe('2. Storage Quota Exhaustion & Atomicity Stress Tests', () => {
    it('maintains absolute atomicity when setItem throws QuotaExceededError on saveState', () => {
      const storage = createMockStorage();
      const goodState = buildAdversarialState(40, 0.5);
      const initialSaveErr = saveState(goodState, storage);
      expect(initialSaveErr).toBeNull();

      const initialRaw = storage.getItem(STORAGE_KEY);
      expect(initialRaw).toBeTruthy();

      // Configure storage to simulate QuotaExceededError
      const quotaStorage: Storage = {
        ...storage,
        setItem: (key: string, value: string) => {
          if (key === STORAGE_KEY) {
            throw new Error('QuotaExceededError: DOMException 22 - The quota has been exceeded');
          }
          storage.setItem(key, value);
        },
      };

      const largeState = buildAdversarialState(1200, 0.2);
      const saveError = saveState(largeState, quotaStorage);

      expect(saveError).toBe('Không thể lưu tiến độ trên thiết bị. Hãy xuất bản sao dữ liệu.');
      expect(storage.getItem(STORAGE_KEY)).toBe(initialRaw);

      // Reloading must cleanly yield original 40 words
      clearCustomWordRegistry();
      const reloaded = loadState(storage);
      expect(reloaded.error).toBeNull();
      expect(reloaded.state.savedWordIds).toHaveLength(40);
    });

    it('gracefully handles QuotaExceededError when saving corrupted backup without crashing', () => {
      const storageQuotaBackup: Storage = {
        getItem: (key: string) => (key === STORAGE_KEY ? '{"version": 1, invalid_syntax' : null),
        setItem: (key: string) => {
          if (key === STORAGE_BACKUP_KEY) {
            throw new Error('QuotaExceededError: disk full cannot write backup');
          }
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 1,
      };

      // Must catch backup write quota error and return fallback initial state safely
      let loaded: any = null;
      expect(() => {
        loaded = loadState(storageQuotaBackup);
      }).not.toThrow();

      expect(loaded.error).toBeTruthy();
      expect(loaded.isCorrupt).toBe(true);
      expect(loaded.state.savedWordIds).toHaveLength(0);
    });
  });

  describe('3. Corrupted Raw Data, Backup Preservation & Overwrite Protection', () => {
    it('preserves corrupted raw data in STORAGE_BACKUP_KEY through multiple consecutive saveState calls', () => {
      const storage = createMockStorage();
      const corruptedRaw = '{"version": 1, "profile": {"name": "Lưu lạc"}, "broken": [UNPARSEABLE_DATA...';
      storage.setItem(STORAGE_KEY, corruptedRaw);

      // 1. Initial loadState detects corruption and creates backup
      const loaded1 = loadState(storage);
      expect(loaded1.error).toBeTruthy();
      expect(loaded1.isCorrupt).toBe(true);
      expect(storage.getItem(STORAGE_KEY)).toBe(corruptedRaw);
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(corruptedRaw);

      // 2. User action triggers first saveState on the fallback blank state
      const saveErr1 = saveState(loaded1.state, storage);
      expect(saveErr1).toBeNull();
      // Backup must STILL be the user's original corrupted raw data
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(corruptedRaw);

      // 3. User saves a new word and triggers a SECOND saveState
      const newState = toggleSavedWord(createInitialState(), allWords[0].id);
      const saveErr2 = saveState(newState, storage);
      expect(saveErr2).toBeNull();
      // Backup must NEVER be overwritten by subsequent valid saves!
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(corruptedRaw);

      // 4. User saves 100 words and triggers a THIRD saveState
      const state100 = buildAdversarialState(100, 0.1);
      const saveErr3 = saveState(state100, storage);
      expect(saveErr3).toBeNull();
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(corruptedRaw);
    });

    it('rejects all non-object root payloads and safely archives them into STORAGE_BACKUP_KEY', () => {
      const nonObjectPayloads = ['null', '12345678', '"bare string"', 'true', '[1, 2, 3]'];

      for (const payload of nonObjectPayloads) {
        const storage = createMockStorage();
        storage.setItem(STORAGE_KEY, payload);

        const loaded = loadState(storage);
        expect(loaded.error).toBeTruthy();
        expect(loaded.isCorrupt).toBe(true);
        expect(storage.getItem(STORAGE_KEY)).toBe(payload);
        expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(payload);
      }
    });

    it('rejects forged schemas and protects corrupted backup against silent loss', () => {
      const forgedState = {
        version: 1,
        profile: { name: 'Forged User', dailyGoal: 20 },
        completedLessonIds: [],
        savedWordIds: [allWords[0].id],
        reviews: {},
        activity: {
          '2026-10-22': { xp: 999999, lessons: 0, reviews: 0 }, // Forged XP violating formula!
        },
        quizScores: {},
      };
      const forgedRaw = JSON.stringify(forgedState);
      const storage = createMockStorage();
      storage.setItem(STORAGE_KEY, forgedRaw);

      const loaded = loadState(storage);
      expect(loaded.error).toBeTruthy();
      expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe(forgedRaw);
    });
  });

  describe('4. SM-2 Review Progression & Anti-XP Farming Under Multi-Review Scenarios', () => {
    it('verifies exact SM-2 interval progression and strict anti-XP farming during same-day re-reviews and next-day reviews', () => {
      const day1 = new Date(2026, 9, 22);
      const dayStr1 = localDate(day1);
      const wordId = allWords[0].id;

      let s = toggleSavedWord(createInitialState(), wordId);

      // Review 1 on Day 1: Grade 'good'
      s = reviewWord(s, wordId, 'good', day1);
      expect(s.reviews[wordId].interval).toBe(1);
      expect(s.reviews[wordId].repetitions).toBe(1);
      expect(s.reviews[wordId].lastReviewed).toBe(dayStr1);
      expect(getStats(s, day1).xp).toBe(5);

      // Review 2 on Day 1 (Review Ahead): Grade 'easy'
      // SM-2: easy => Math.max(4, 1 * 3) = 4
      s = reviewWord(s, wordId, 'easy', day1);
      expect(s.reviews[wordId].interval).toBe(4);
      expect(s.reviews[wordId].repetitions).toBe(2);
      expect(s.reviews[wordId].lastReviewed).toBe(dayStr1);
      expect(getStats(s, day1).xp).toBe(5); // ANTI-XP FARMING: No increase!

      // Review 3 on Day 1 (Review Ahead): Grade 'hard'
      // SM-2: hard => Math.max(2, Math.ceil(4 * 1.2)) = 5
      s = reviewWord(s, wordId, 'hard', day1);
      expect(s.reviews[wordId].interval).toBe(5);
      expect(s.reviews[wordId].repetitions).toBe(3);
      expect(getStats(s, day1).xp).toBe(5); // ANTI-XP FARMING: Stays 5!

      // Review 4 on Day 1: Grade 'again'
      // SM-2: again => interval = 0, repetitions = 0
      s = reviewWord(s, wordId, 'again', day1);
      expect(s.reviews[wordId].interval).toBe(0);
      expect(s.reviews[wordId].repetitions).toBe(0);
      expect(getStats(s, day1).xp).toBe(5);

      // Review 5 on Day 1: Grade 'good' (recovery from again)
      // SM-2: good from 0 => Math.max(1, 0 * 2) = 1
      s = reviewWord(s, wordId, 'good', day1);
      expect(s.reviews[wordId].interval).toBe(1);
      expect(s.reviews[wordId].repetitions).toBe(1);
      expect(getStats(s, day1).xp).toBe(5);

      // Next day: Day 2 (Legitimate new review)
      const day2 = new Date(2026, 9, 23);
      const dayStr2 = localDate(day2);
      s = reviewWord(s, wordId, 'good', day2);
      expect(s.reviews[wordId].interval).toBe(2);
      expect(s.reviews[wordId].repetitions).toBe(2);
      expect(s.reviews[wordId].lastReviewed).toBe(dayStr2);
      expect(getStats(s, day2).xp).toBe(10); // +5 XP awarded for genuine new day review!
    });

    it('verifies that spamming reviews on the same day never farms XP and caps interval at 36,500', () => {
      const day1 = new Date(2026, 9, 22);
      const wordId = allWords[0].id;
      let s = toggleSavedWord(createInitialState(), wordId);

      // First legitimate review
      s = reviewWord(s, wordId, 'good', day1);
      expect(getStats(s, day1).xp).toBe(5);

      // Rapidly spam 50 times with 'easy'
      for (let i = 0; i < 50; i++) {
        s = reviewWord(s, wordId, 'easy', day1);
      }

      // Must remain at exactly 5 XP
      expect(getStats(s, day1).xp).toBe(5);
      // Interval must be safely bounded to <= 36500 (100 years), never Infinity or NaN
      expect(s.reviews[wordId].interval).toBeLessThanOrEqual(36500);
      expect(s.reviews[wordId].interval).toBeGreaterThan(0);
      expect(Number.isFinite(s.reviews[wordId].interval)).toBe(true);
    });
  });
});
