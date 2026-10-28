import { describe, it, expect, beforeEach } from 'vitest';
import {
    saveState,
    loadState,
    STORAGE_KEY,
    STORAGE_BACKUP_KEY,
    createInitialState,
    exportState,
    MAX_STATE_JSON_LENGTH,
    parseImportState,
    getCustomWordRegistry,
    clearCustomWordRegistry
} from '../../src/domain/learning';

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

describe('T09 Acceptance: Storage Corruption Recovery & Safe Guarding (G1 Invariant)', () => {
    beforeEach(() => {
        clearCustomWordRegistry();
    });

    const BACKUP_KEY_CANDIDATES = [
        'zhongxue.learning.v1.corrupt_backup',
        'zhongxue.learning.corrupt.backup',
        'zhongxue.learning.backup',
        'zhongxue.learning.v1.backup'
    ];

    function getBackupRaw(storage: Storage): string | null {
        for (const key of BACKUP_KEY_CANDIDATES) {
            const val = storage.getItem(key);
            if (val) return val;
        }
        return null;
    }

    describe('1. Raw data preservation when storage is corrupted or unparseable', () => {
        it('preserves raw corrupted JSON during loadState and does not delete it from storage', () => {
            const storage = createFreshStorage();
            const brokenRaw = '{"version": 1, "profile": {"name": "Học sinh Đài Loan", "dailyGoal": 30}, "savedWordIds": [TRUNCATED_GARBAGE...';

            storage.setItem(STORAGE_KEY, brokenRaw);

            const loaded = loadState(storage);

            // INVARIANT: loadState must report error for corrupt data
            expect(loaded.error).toBeTruthy();

            // INVARIANT: loadState MUST NOT wipe or clear raw data at STORAGE_KEY
            expect(storage.getItem(STORAGE_KEY)).toBe(brokenRaw);
        });

        it('creates a backup of corrupted raw data so user history is never irrecoverable (REPRODUCES F01 recovery gap)', () => {
            const storage = createFreshStorage();
            const brokenRaw = '{"version": 1, "corrupted_syntax": true, "raw_unparseable_content": 123456';

            storage.setItem(STORAGE_KEY, brokenRaw);

            // Trigger load failure
            const loaded = loadState(storage);
            expect(loaded.error).toBeTruthy();

            // INVARIANT: A backup/recovery snapshot of the raw unreadable string must exist in storage
            // On baseline: No backup is ever created in storage; backup remains null
            const backupRaw = getBackupRaw(storage);
            expect(backupRaw).toBe(brokenRaw);
        });
    });

    describe('2. Protection against silent overwriting of corrupted raw data by initial state', () => {
        it('prevents silent destruction of corrupted raw data on subsequent saveState calls (REPRODUCES F01 data loss)', () => {
            const storage = createFreshStorage();
            const valuableCorruptedRaw = JSON.stringify({
                version: 1,
                profile: { name: 'Người học lâu năm', dailyGoal: 50 },
                savedWordIds: ['cv_1', 'cv_2'],
                // Simulate an invalid field that causes import validation to fail
                activity: { '2026-10-20': { xp: 999999, lessons: 999, reviews: 0 } }
            });

            storage.setItem(STORAGE_KEY, valuableCorruptedRaw);

            // 1. App starts and calls loadState
            const loaded = loadState(storage);
            expect(loaded.error).toBeTruthy();
            expect(loaded.state.savedWordIds).toHaveLength(0); // Fallback blank state

            // 2. User or UI useEffect triggers saveState on the fallback blank state
            saveState(loaded.state, storage);

            // INVARIANT: The user's original data MUST NOT be permanently destroyed without backup!
            // Either STORAGE_KEY still has the corrupted data (saveState refused to overwrite unrecovered corrupt state),
            // OR a backup key contains valuableCorruptedRaw.
            const currentRaw = storage.getItem(STORAGE_KEY);
            const backupRaw = getBackupRaw(storage);

            const wasPreserved = currentRaw === valuableCorruptedRaw || backupRaw === valuableCorruptedRaw;

            // On baseline: currentRaw was completely replaced by exportState(loaded.state),
            // and no backup was saved, resulting in 100% permanent data loss.
            expect(wasPreserved).toBe(true);
        });

        it('does not allow empty state to overwrite storage containing >200k chars when loadState failed due to size limit', () => {
            const storage = createFreshStorage();

            // Create a 600-word payload with rich examples (> 200,000 characters)
            const largeValidPayload = JSON.stringify({
                version: 1,
                profile: { name: 'Người học cao cấp', dailyGoal: 30 },
                completedLessonIds: [],
                savedWordIds: Array.from({ length: 600 }, (_, i) => `cv_${i + 1}`),
                reviews: {},
                activity: {},
                quizScores: {},
                customWords: Array.from({ length: 600 }, (_, i) => ({
                    id: `cv_${i + 1}`,
                    hanzi: `滷肉飯${i + 1}`,
                    pinyin: `lǔròufàn ${i + 1}`,
                    meaning: `Cơm thịt kho Đài Loan đậm đà hương vị truyền thống tiêu biểu (Mục #${i + 1})`,
                    example: `這家老店的滷肉飯淋上特製滷汁，香氣撲鼻，非常好吃。[Thẻ số ${i + 1}]`,
                    examplePinyin: `Zhè jiā lǎodiàn de lǔròufàn lín shàng tèzhì lǔzhī (#${i + 1})`,
                    exampleMeaning: `Món cơm thịt kho rưới nước sốt đặc chế của quán này rất thơm ngon (#${i + 1})`,
                    category: 'Ẩm thực Đài Loan',
                    lessonId: 'custom-dictionary'
                }))
            });

            expect(largeValidPayload.length).toBeGreaterThan(200000);
            storage.setItem(STORAGE_KEY, largeValidPayload);

            // 1. Load state on baseline: fails because >200,000 chars
            const loaded = loadState(storage);

            // 2. If loadState failed, saving fallback initial state must not wipe out the 600 words without backup
            if (loaded.error) {
                saveState(loaded.state, storage);

                const currentRaw = storage.getItem(STORAGE_KEY);
                const backupRaw = getBackupRaw(storage);

                const dataProtected = currentRaw === largeValidPayload || backupRaw === largeValidPayload;
                // On baseline: data is wiped immediately without backup, failing this invariant
                expect(dataProtected).toBe(true);
            } else {
                // If loaded successfully (fixed), state must contain all 600 words
                expect(loaded.state.savedWordIds).toHaveLength(600);
            }
        });
    });

    describe('3. Schema & Structural corruption recovery', () => {
        it('handles malformed root type (non-object or null) safely without wiping storage', () => {
            const storage = createFreshStorage();
            const garbage = '1234567890';
            storage.setItem(STORAGE_KEY, garbage);

            const loaded = loadState(storage);
            expect(loaded.error).toBeTruthy();
            expect(storage.getItem(STORAGE_KEY)).toBe(garbage);
        });

        it('handles unsupported version gracefully preserving raw payload', () => {
            const storage = createFreshStorage();
            const futureVersionPayload = JSON.stringify({
                version: 99,
                profile: { name: 'Người dùng tương lai', dailyGoal: 20 },
                completedLessonIds: [],
                savedWordIds: [],
                reviews: {},
                activity: {},
                quizScores: {}
            });
            storage.setItem(STORAGE_KEY, futureVersionPayload);

            const loaded = loadState(storage);
            expect(loaded.error).toBeTruthy();
            expect(storage.getItem(STORAGE_KEY)).toBe(futureVersionPayload);
        });
    });
});


describe('Save/read contract and recovery atomicity', () => {
    it('rejects an oversized export and save without replacing valid raw data', () => {
        const storage = createFreshStorage();
        const valid = createInitialState();
        expect(saveState(valid, storage)).toBeNull();
        const original = storage.getItem(STORAGE_KEY);
        const oversized = { ...valid, customWords: [{
            id: 'cv_oversized', hanzi: '字', pinyin: 'zi', meaning: 'x'.repeat(MAX_STATE_JSON_LENGTH),
            example: '', examplePinyin: '', exampleMeaning: '', category: '', lessonId: 'custom'
        }] };
        expect(() => exportState(oversized)).toThrow();
        expect(saveState(oversized, storage)).toBeTruthy();
        expect(storage.getItem(STORAGE_KEY)).toBe(original);
        expect(loadState(storage).error).toBeNull();
    });

    it('refuses to replace corrupt raw if backup cannot be written', () => {
        const storage = createFreshStorage();
        const broken = '{valuable raw';
        storage.setItem(STORAGE_KEY, broken);
        const quota = { getItem: storage.getItem, setItem(key: string, value: string) {
            if (key === STORAGE_BACKUP_KEY) throw Error('quota');
            storage.setItem(key, value);
        } };
        expect(saveState(createInitialState(), quota)).toBeTruthy();
        expect(storage.getItem(STORAGE_KEY)).toBe(broken);
    });

    it('preserves an existing different backup instead of replacing it with new corrupt raw', () => {
        const storage = createFreshStorage();
        storage.setItem(STORAGE_KEY, '{second valuable raw');
        storage.setItem(STORAGE_BACKUP_KEY, '{first valuable raw');
        loadState(storage);
        expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe('{first valuable raw');
        expect(saveState(createInitialState(), storage)).toBeTruthy();
        expect(storage.getItem(STORAGE_KEY)).toBe('{second valuable raw');
        expect(storage.getItem(STORAGE_BACKUP_KEY)).toBe('{first valuable raw');
    });
});


describe('Pure restore validation', () => {
    it('does not register imported words until restoration can commit', () => {
        clearCustomWordRegistry();
        const word = { id: 'cv_import_atomic', hanzi: '還原', pinyin: 'huányuán', meaning: 'khôi phục',
            example: '', examplePinyin: '', exampleMeaning: '', category: '', lessonId: 'custom' };
        const next = parseImportState(JSON.stringify({ ...createInitialState(), savedWordIds: [word.id], customWords: [word] }));
        expect(next.savedWordIds).toEqual([word.id]);
        expect(getCustomWordRegistry().has(word.id)).toBe(false);
        const raw = '{unrecoverable';
        const storage = { getItem: (key: string) => key === STORAGE_KEY ? raw : null,
            setItem: () => { throw Error('quota'); } };
        expect(saveState(next, storage)).toBeTruthy();
        expect(getCustomWordRegistry().has(word.id)).toBe(false);
    });
});
