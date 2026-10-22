import { describe, it, expect, beforeEach } from 'vitest';
import {
    createInitialState,
    toggleSavedWord,
    saveState,
    loadState,
    exportState,
    importState,
    STORAGE_KEY,
    clearCustomWordRegistry,
    findWord,
    reviewWord,
    updateProfile,
    localDate
} from '../../src/domain/learning';
import type { Word, LearningState } from '../../src/types';

// Fixture generator for realistic Taiwanese vocabulary entries with rich examples
function createRealisticWord(index: number): Word {
    const templates = [
        {
            hanzi: '滷肉飯',
            pinyin: 'lǔròufàn',
            meaning: 'Cơm thịt kho Đài Loan đậm đà hương vị truyền thống',
            example: '這家老店的滷肉飯淋上特製滷汁，香氣撲鼻，非常好吃。',
            examplePinyin: 'Zhè jiā lǎodiàn de lǔròufàn lín shàng tèzhì lǔzhī, xiāngqì pūbí, fēicháng hǎochī.',
            exampleMeaning: 'Món cơm thịt kho của quán lâu đời này rưới nước sốt đặc chế, thơm nức mũi, rất ngon.',
            category: 'Ẩm thực Đài Loan'
        },
        {
            hanzi: '珍珠奶茶',
            pinyin: 'zhēnzhūnǎichá',
            meaning: 'Trà sữa trân châu Đài Loan nổi tiếng thế giới',
            example: '到臺灣旅遊一定要喝一杯微糖微冰的黑糖珍珠奶茶。',
            examplePinyin: 'Dào Táiwān lǚyóu yīdìng yào hē yībēi wēitáng wēibīng de hēitáng zhēnzhūnǎichá.',
            exampleMeaning: 'Đến Đài Loan du lịch nhất định phải uống một ly trà sữa trân châu đường đen ít đường ít đá.',
            category: 'Đồ uống Đài Loan'
        },
        {
            hanzi: '捷運系統',
            pinyin: 'jiéyùn xìtǒng',
            meaning: 'Hệ thống tàu điện ngầm đô thị MRT Đài Loan hiện đại',
            example: '搭乘捷運從台北車站前往淡水老街只要約四十分鐘。',
            examplePinyin: 'Dāchéng jiéyùn cóng Táiběi chēzhàn qiánwǎng Dànshuǐ lǎojiē zhǐ yào yuē sìshí fēnzhōng.',
            exampleMeaning: 'Đi tàu điện ngầm MRT từ ga Đài Bắc đến phố cổ Đạm Thủy chỉ mất khoảng 40 phút.',
            category: 'Giao thông Đài Loan'
        },
        {
            hanzi: '排骨便當',
            pinyin: 'páigǔ biàndang',
            meaning: 'Cơm hộp sườn heo chiên Đài Loan đặc trưng ga tàu',
            example: '搭乘台鐵長途列車時，買一個台鐵排骨便當是經典體驗。',
            examplePinyin: 'Dāchéng Táitiě chángtú lièchē shí, mǎi yīgè Táitiě páigǔ biàndang shì jīngdiǎn tǐyàn.',
            exampleMeaning: 'Khi đi tàu hỏa đường dài, mua một hộp cơm sườn heo đường sắt là trải nghiệm kinh điển.',
            category: 'Ẩm thực Đài Loan'
        },
        {
            hanzi: '悠遊卡',
            pinyin: 'yōuyóukǎ',
            meaning: 'Thẻ thông minh EasyCard đa năng tại Đài Loan',
            example: '悠遊卡除了搭乘公車與捷運，也可以在四大便利超商感應小額消費。',
            examplePinyin: 'Yōuyóukǎ chúle dāchéng gōngchē yǔ jiéyùn, yě kěyǐ zài sìdà biànlì chāoshāng gǎnyìng xiǎo\'é xiāofèi.',
            exampleMeaning: 'Thẻ EasyCard ngoài đi xe buýt và MRT, còn có thể quẹt thanh toán tại 4 hệ thống cửa hàng tiện lợi lớn.',
            category: 'Đời sống Đài Loan'
        },
        {
            hanzi: '饒河夜市',
            pinyin: 'Ráohé yèshì',
            meaning: 'Chợ đêm Nhiêu Hà nổi tiếng tại Tùng Sơn, Đài Bắc',
            example: '饒河街觀光夜市入口處的胡椒餅每天都大排長龍。',
            examplePinyin: 'Ráohéjiē guānguāng yèshì rùkǒuchù de hújiāobǐng měitiān dōu dàpái chánglóng.',
            exampleMeaning: 'Bánh tiêu tiêu ở cổng vào chợ đêm du lịch phố Nhiêu Hà mỗi ngày đều xếp hàng dài rồng rắn.',
            category: 'Du lịch Đài Loan'
        },
        {
            hanzi: '高鐵商務廂',
            pinyin: 'gāotiě shāngwùxiāng',
            meaning: 'Toa thương gia tàu cao tốc Đài Loan (THSR Business Car)',
            example: '搭乘高鐵商務車廂提供免費點心、飲品以及當日熱門報紙。',
            examplePinyin: 'Dāchéng gāotiě shāngwù chēxiāng tígōng miǎnfèi diǎnxin, yǐnpǐn yǐjí dāngrì rèmén bàozhǐ.',
            exampleMeaning: 'Đi toa hạng thương gia tàu cao tốc được phục vụ miễn phí bánh ngọt, đồ uống và báo chí trong ngày.',
            category: 'Giao thông Đài Loan'
        },
        {
            hanzi: '冬瓜檸檬',
            pinyin: 'dōngguā níngméng',
            meaning: 'Trà bí đao chanh tươi giải nhiệt Đài Loan',
            example: '炎熱的夏天來一杯現榨冬瓜檸檬，生津止渴又解膩。',
            examplePinyin: 'Yánrè de xiàtiān lái yībēi xiànzhà dōngguā níngméng, shēngjīn zhǐkě yòu jiěnì.',
            exampleMeaning: 'Mùa hè oi bức thưởng thức một ly bí đao chanh vắt tươi, vừa thanh nhiệt giải khát lại chống ngấy.',
            category: 'Đồ uống Đài Loan'
        }
    ];

    const tpl = templates[index % templates.length];
    const id = `cv_${index + 1}`;
    return {
        id,
        hanzi: `${tpl.hanzi}${index + 1}`,
        pinyin: `${tpl.pinyin} ${index + 1}`,
        meaning: `${tpl.meaning} [Mục số ${index + 1}]`,
        example: `${tpl.example} (Thẻ mẫu #${index + 1})`,
        examplePinyin: `${tpl.examplePinyin} (#${index + 1})`,
        exampleMeaning: `${tpl.exampleMeaning} (Ví dụ từ vựng #${index + 1})`,
        category: tpl.category,
        lessonId: 'custom-dictionary'
    };
}

// Build state containing N words with real SRS reviews and activity records
function buildStateWithWords(count: number): LearningState {
    let state = createInitialState();
    state = updateProfile(state, { name: 'Người học Đài Loan', dailyGoal: 30 });

    const reviewDate = new Date(2026, 9, 20);
    const dayStr = localDate(reviewDate);

    for (let i = 0; i < count; i++) {
        const word = createRealisticWord(i);
        state = toggleSavedWord(state, word.id, word);

        // Add real SM-2 reviews to the first 100 words
        if (i < 100 && i < count) {
            state = {
                ...state,
                reviews: {
                    ...state.reviews,
                    [word.id]: {
                        dueDate: '2026-10-25',
                        interval: 5,
                        repetitions: 2,
                        lastReviewed: dayStr
                    }
                }
            };
        }
    }

    if (count > 0) {
        const reviewedCount = Math.min(count, 100);
        state = {
            ...state,
            activity: {
                [dayStr]: {
                    xp: reviewedCount * 5,
                    lessons: 0,
                    reviews: reviewedCount
                }
            }
        };
    }

    return state;
}

// Fresh isolated Storage implementation
function createFreshStorage(): Storage {
    const map = new Map<string, string>();
    return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => { map.set(key, value); },
        removeItem: (key: string) => { map.delete(key); },
        clear: () => { map.clear(); },
        key: (index: number) => Array.from(map.keys())[index] ?? null,
        length: map.size
    };
}

describe('T09 Acceptance: Storage Roundtrip & Volume Scalability (G1 Invariant)', () => {
    beforeEach(() => {
        clearCustomWordRegistry();
    });

    describe('1. saveState => loadState roundtrip in fresh context (500, 600, 1000 words)', () => {
        it('successfully saves and loads 500 words with rich vocabulary metadata', () => {
            const count = 500;
            const state = buildStateWithWords(count);
            const storage = createFreshStorage();

            const saveError = saveState(state, storage);
            expect(saveError).toBeNull();

            const rawJson = storage.getItem(STORAGE_KEY);
            expect(rawJson).toBeTruthy();

            // Clear in-memory singleton registry to verify load from storage
            clearCustomWordRegistry();

            const loaded = loadState(storage);
            expect(loaded.error).toBeNull();
            expect(loaded.state.savedWordIds).toHaveLength(count);
            expect(loaded.state.profile.name).toBe('Người học Đài Loan');
            expect(loaded.state.profile.dailyGoal).toBe(30);
            expect(Object.keys(loaded.state.reviews)).toHaveLength(100);

            // Verify first and last words can be found and have complete metadata
            const firstWord = findWord('cv_1');
            expect(firstWord).toBeDefined();
            expect(firstWord?.hanzi).toContain('滷肉飯');

            const lastWord = findWord(`cv_${count}`);
            expect(lastWord).toBeDefined();
            expect(lastWord?.meaning).toContain(`[Mục số ${count}]`);
        });

        it('saves and loads 600 words without data loss (REPRODUCES F01: fails on baseline when JSON > 200k)', () => {
            const count = 600;
            const state = buildStateWithWords(count);
            const storage = createFreshStorage();

            const saveError = saveState(state, storage);
            expect(saveError).toBeNull();

            const rawJson = storage.getItem(STORAGE_KEY);
            expect(rawJson).toBeTruthy();
            expect(rawJson!.length).toBeGreaterThan(200000); // Exceeds baseline 200,000 threshold

            clearCustomWordRegistry();

            // INVARIANT: saveState succeeded => loadState in fresh context MUST load 100% of data
            // On baseline: F01 causes loadState to fail with "Không thể đọc tiến độ đã lưu..."
            // and loaded.state has 0 words instead of 600.
            const loaded = loadState(storage);
            expect(loaded.error).toBeNull();
            expect(loaded.state.savedWordIds).toHaveLength(600);
            expect(loaded.state.profile.name).toBe('Người học Đài Loan');
            expect(Object.keys(loaded.state.reviews)).toHaveLength(100);

            const word600 = findWord('cv_600');
            expect(word600).toBeDefined();
            expect(word600?.meaning).toContain('[Mục số 600]');
        });

        it('saves and loads 1,000 words without data loss (REPRODUCES F01: fails on baseline when JSON > 340k)', () => {
            const count = 1000;
            const state = buildStateWithWords(count);
            const storage = createFreshStorage();

            const saveError = saveState(state, storage);
            expect(saveError).toBeNull();

            const rawJson = storage.getItem(STORAGE_KEY);
            expect(rawJson).toBeTruthy();
            expect(rawJson!.length).toBeGreaterThan(340000);

            clearCustomWordRegistry();

            // INVARIANT: loadState must load all 1,000 words without truncation or reset
            const loaded = loadState(storage);
            expect(loaded.error).toBeNull();
            expect(loaded.state.savedWordIds).toHaveLength(1000);
            expect(loaded.state.profile.name).toBe('Người học Đài Loan');

            const word1000 = findWord('cv_1000');
            expect(word1000).toBeDefined();
            expect(word1000?.meaning).toContain('[Mục số 1000]');
        });
    });

    describe('2. exportState => importState roundtrip in fresh context (600, 1000 words)', () => {
        it('exports and imports 600 words preserving all metadata (REPRODUCES F01: importState throws on baseline)', () => {
            const count = 600;
            const state = buildStateWithWords(count);

            const exportedJson = exportState(state);
            expect(exportedJson.length).toBeGreaterThan(200000);

            clearCustomWordRegistry();

            // INVARIANT: exportState succeeded => importState in fresh context MUST restore state
            // On baseline: importState line 490 checks `if (json.length > 200000) throw Error('Tệp dữ liệu quá lớn.')`
            const imported = importState(exportedJson);
            expect(imported.savedWordIds).toHaveLength(600);
            expect(imported.profile.name).toBe('Người học Đài Loan');
            expect(Object.keys(imported.reviews)).toHaveLength(100);

            const restoredWord = findWord('cv_600');
            expect(restoredWord).toBeDefined();
            expect(restoredWord?.hanzi).toBeDefined();
        });

        it('exports and imports 1,000 words preserving all metadata (REPRODUCES F01: importState throws on baseline)', () => {
            const count = 1000;
            const state = buildStateWithWords(count);

            const exportedJson = exportState(state);
            expect(exportedJson.length).toBeGreaterThan(340000);

            clearCustomWordRegistry();

            const imported = importState(exportedJson);
            expect(imported.savedWordIds).toHaveLength(1000);
            expect(imported.profile.name).toBe('Người học Đài Loan');

            const restoredWord = findWord('cv_1000');
            expect(restoredWord).toBeDefined();
        });
    });

    describe('3. Storage Quota Exceeded Protection & Atomicity (G1 Invariant)', () => {
        it('reports clear error on quota limit and preserves existing good state without corruption', () => {
            const storage = createFreshStorage();

            // Save an initial good state with 10 words
            const initialGoodState = buildStateWithWords(10);
            const initialSaveError = saveState(initialGoodState, storage);
            expect(initialSaveError).toBeNull();

            const initialRawJson = storage.getItem(STORAGE_KEY);
            expect(initialRawJson).toBeTruthy();

            // Simulate storage quota exhaustion on next save attempt
            const quotaStorage: Storage = {
                ...storage,
                setItem: (key: string, value: string) => {
                    if (key === STORAGE_KEY) {
                        throw new Error('QuotaExceededError: DOMException 22');
                    }
                    storage.setItem(key, value);
                }
            };

            const largeState = buildStateWithWords(500);
            const errorReported = saveState(largeState, quotaStorage);

            // INVARIANT: Clear error reported on quota exhaustion
            expect(errorReported).toBe('Không thể lưu tiến độ trên thiết bị. Hãy xuất bản sao dữ liệu.');

            // INVARIANT: Storage data is NOT partially written or wiped; original state remains intact
            const currentRawJson = storage.getItem(STORAGE_KEY);
            expect(currentRawJson).toBe(initialRawJson);

            const reloaded = loadState(storage);
            expect(reloaded.error).toBeNull();
            expect(reloaded.state.savedWordIds).toHaveLength(10);
        });
    });

    describe('4. Backward Compatibility with Legacy v1 payload (G1 Invariant)', () => {
        it('imports legacy v1 format without customWords key cleanly', () => {
            const legacyPayload = {
                version: 1,
                profile: { name: 'Học viên khóa cũ', dailyGoal: 20 },
                completedLessonIds: [],
                savedWordIds: ['cv_1', 'dict-old_entry'],
                reviews: {},
                activity: {},
                quizScores: {}
            };

            const imported = importState(JSON.stringify(legacyPayload));
            expect(imported.version).toBe(1);
            expect(imported.profile.name).toBe('Học viên khóa cũ');
            expect(imported.savedWordIds).toContain('cv_1');
            expect(imported.savedWordIds).toContain('dict-old_entry');
        });
    });
});
