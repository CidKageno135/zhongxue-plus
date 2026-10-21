import { allWords, lessons, scenarios } from '../data/lessons';
import type { Word } from '../types';

export interface Review {
    dueDate: string;
    interval: number;
    repetitions: number;
    lastReviewed: string;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy' | boolean;

export interface LearningState {
    version: 1;
    profile: {
        name: string;
        dailyGoal: number;
    };
    completedLessonIds: string[];
    savedWordIds: string[];
    reviews: Record<string, Review>;
    activity: Record<string, {
        xp: number;
        lessons: number;
        reviews: number;
    }>;
    quizScores: Record<string, {
        correct: number;
        total: number;
    }>;
}

export const STORAGE_KEY = 'zhongxue.learning.v1';
export const CUSTOM_WORDS_KEY = 'zhongxue.custom_words.v1';
export const MAX_VOCAB_SIZE = 150000;

const customWordRegistry = new Map<string, Word>();

function loadCustomRegistry(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const raw = window.localStorage.getItem(CUSTOM_WORDS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (item && typeof item === 'object' && typeof (item as Word).id === 'string' && typeof (item as Word).hanzi === 'string') {
                    customWordRegistry.set((item as Word).id, item as Word);
                }
            }
        }
    } catch {
        // ignore storage read error
    }
}

function persistCustomRegistry(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const list = Array.from(customWordRegistry.values());
        window.localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(list));
    } catch {
        // ignore quota error
    }
}

loadCustomRegistry();

export function registerCustomWord(w: Word): void {
    customWordRegistry.set(w.id, w);
    persistCustomRegistry();
}

export function isValidWordId(id: string): boolean {
    if (allWords.some(w => w.id === id)) return true;
    if (customWordRegistry.has(id)) return true;
    return /^dict-[a-zA-Z0-9_#-]+$/.test(id);
}

export function findWord(id: string): Word | undefined {
    const lessonMatch = allWords.find(w => w.id === id);
    if (lessonMatch) return lessonMatch;
    const customMatch = customWordRegistry.get(id);
    if (customMatch) return customMatch;
    if (/^dict-[a-zA-Z0-9_#-]+$/.test(id)) {
        const label = id.replace(/^dict-/, '');
        return {
            id,
            hanzi: label,
            pinyin: '',
            meaning: 'Từ vựng sổ tay mở rộng',
            example: label,
            examplePinyin: '',
            exampleMeaning: 'Từ đã lưu từ từ điển PGlite',
            category: 'Từ điển mở rộng',
            lessonId: 'custom-dictionary'
        };
    }
    return undefined;
}

export function getAllKnownWords(savedIds: string[] = []): Word[] {
    const known = [...allWords];
    const seen = new Set(known.map(w => w.id));
    for (const w of customWordRegistry.values()) {
        if (!seen.has(w.id)) {
            known.push(w);
            seen.add(w.id);
        }
    }
    for (const id of savedIds) {
        if (!seen.has(id)) {
            const w = findWord(id);
            if (w) {
                known.push(w);
                seen.add(w.id);
            }
        }
    }
    return known;
}

export function localDate(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shift(day: string, amount: number) {
    const [y, m, d] = day.split('-').map(Number);
    return localDate(new Date(y, m - 1, d + amount));
}

export function createInitialState(): LearningState {
    return {
        version: 1,
        profile: { name: 'Bạn', dailyGoal: 30 },
        completedLessonIds: [],
        savedWordIds: [],
        reviews: {},
        activity: {},
        quizScores: {}
    };
}

function word(id: string): Word {
    const found = findWord(id);
    if (!found) throw Error('Từ vựng không tồn tại.');
    return found;
}

function addActivity(state: LearningState, day: string, xp: number, lesson: number, review: number): LearningState {
    const old = state.activity[day] ?? { xp: 0, lessons: 0, reviews: 0 };
    return {
        ...state,
        activity: {
            ...state.activity,
            [day]: {
                xp: old.xp + xp,
                lessons: old.lessons + lesson,
                reviews: old.reviews + review
            }
        }
    };
}

export function completeLesson(
    state: LearningState,
    id: string,
    date = new Date(),
    score?: {
        correct: number;
        total: number;
    }
): LearningState {
    const lesson = lessons.find(l => l.id === id);
    if (!lesson) throw Error('Bài học không tồn tại.');
    if (
        score &&
        (!Number.isInteger(score.correct) ||
            score.correct < 0 ||
            score.correct > score.total ||
            score.total !== lesson.quiz.length)
    )
        throw Error('Điểm kiểm tra không hợp lệ.');
    const scores = score ? { ...state.quizScores, [id]: { ...score } } : state.quizScores;
    if (state.completedLessonIds.includes(id)) return { ...state, quizScores: scores };
    return addActivity(
        { ...state, completedLessonIds: [...state.completedLessonIds, id], quizScores: scores },
        localDate(date),
        30,
        1,
        0
    );
}

export function toggleSavedWord(state: LearningState, id: string, customWord?: Word): LearningState {
    if (customWord) {
        registerCustomWord(customWord);
    }
    word(id);
    return {
        ...state,
        savedWordIds: state.savedWordIds.includes(id)
            ? state.savedWordIds.filter(x => x !== id)
            : [...state.savedWordIds, id]
    };
}

export function saveWordsBatch(state: LearningState, ids: string[]): LearningState {
    const validNewIds = ids.filter(id => isValidWordId(id) && !state.savedWordIds.includes(id));
    if (validNewIds.length === 0) return state;
    return {
        ...state,
        savedWordIds: [...state.savedWordIds, ...validNewIds]
    };
}

export function saveLessonWords(state: LearningState, lessonId: string): LearningState {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) throw Error('Bài học không tồn tại.');
    return saveWordsBatch(state, lesson.words.map(w => w.id));
}

export function getDueWords(state: LearningState, date = new Date()): Word[] {
    const day = localDate(date);
    const known = getAllKnownWords(state.savedWordIds);
    return known.filter(
        w => state.savedWordIds.includes(w.id) && (!state.reviews[w.id] || state.reviews[w.id].dueDate <= day)
    );
}

export function reviewWord(
    state: LearningState,
    id: string,
    rating: ReviewRating,
    date = new Date()
): LearningState {
    word(id);
    if (!state.savedWordIds.includes(id)) throw Error('Hãy lưu từ trước khi ôn tập.');
    const grade = typeof rating === 'boolean' ? (rating ? 'good' : 'again') : rating;
    if (!['again', 'hard', 'good', 'easy'].includes(grade)) throw Error('Mức ôn tập không hợp lệ.');
    const day = localDate(date),
        old = state.reviews[id];
    if (old?.lastReviewed === day && old.interval > 0) return state;
    const interval =
        grade === 'again'
            ? 0
            : grade === 'hard'
            ? old?.interval
                ? Math.max(2, Math.ceil(old.interval * 1.2))
                : 1
            : grade === 'easy'
            ? Math.max(4, (old?.interval ?? 1) * 3)
            : Math.max(1, (old?.interval ?? 0) * 2);
    const next = {
        ...state,
        reviews: {
            ...state.reviews,
            [id]: {
                dueDate: shift(day, Math.min(interval, 36500)),
                interval: Math.min(interval, 36500),
                repetitions: grade === 'again' ? 0 : (old?.repetitions ?? 0) + 1,
                lastReviewed: day
            }
        }
    };
    return old?.lastReviewed === day ? next : addActivity(next, day, 5, 0, 1);
}

export function computeEaseFactor(review?: Review | null): number {
    if (!review) return 2.5;
    if (review.repetitions === 0) return 1.3;
    if (review.repetitions === 1) {
        if (review.interval >= 4) return 2.8;
        if (review.interval <= 1) return 2.1;
        return 2.5;
    }
    const base = review.interval >= 4 ? 4 : 1;
    const rawEf = Math.pow(Math.max(1, review.interval) / base, 1 / (review.repetitions - 1));
    return Number(Math.min(3.0, Math.max(1.3, rawEf)).toFixed(2));
}

export function getStats(state: LearningState, date = new Date()) {
    const today = localDate(date);
    let day = state.activity[today] ? today : shift(today, -1),
        streak = 0;
    while (state.activity[day]) {
        streak++;
        day = shift(day, -1);
    }
    return {
        xp: Object.values(state.activity).reduce((a, b) => a + b.xp, 0),
        streak,
        todayXp: state.activity[today]?.xp ?? 0,
        completedLessons: state.completedLessonIds.length,
        learnedWords: lessons
            .filter(l => state.completedLessonIds.includes(l.id))
            .reduce((n, l) => n + l.words.length, 0),
        reviewCount: Object.values(state.activity).reduce((n, a) => n + a.reviews, 0)
    };
}

export function updateProfile(state: LearningState, profile: Partial<LearningState['profile']>): LearningState {
    const next = { ...state.profile, ...profile };
    if (
        typeof next.name !== 'string' ||
        !next.name.trim() ||
        next.name.length > 60 ||
        ![10, 20, 30, 50, 100].includes(next.dailyGoal)
    )
        throw Error('Tên hoặc mục tiêu không hợp lệ.');
    return { ...state, profile: { name: next.name.trim(), dailyGoal: next.dailyGoal } };
}

const SIMP_TO_TRAD_MAP: Record<string, string> = {
    '发': '發', '学': '學', '门': '門', '车': '車', '电': '電', '机': '機', '话': '話',
    '国': '國', '见': '見', '听': '聽', '说': '說', '读': '讀', '写': '寫', '会': '會',
    '个': '個', '这': '這', '那': '那', '点': '點', '开': '開', '关': '關', '问': '問',
    '间': '間', '钱': '錢', '买': '買', '卖': '賣', '饭': '飯', '馆': '館', '饮': '飲',
    '面': '麵', '热': '熱', '时': '時', '后': '後', '头': '頭', '体': '體', '语': '語',
    '汉': '漢', '华': '華', '台': '臺', '湾': '灣', '铁': '鐵', '站': '站', '经': '經',
    '验': '驗', '务': '務', '账': '帳', '户': '戶', '证': '證', '卡': '卡', '约': '約',
    '线': '線', '导': '導', '专': '專', '长': '長', '实': '實', '习': '習', '难': '難',
    '复': '複', '单': '單', '双': '雙', '两': '兩', '进': '進', '出': '出', '过': '過',
    '还': '還', '动': '動', '作': '作', '认': '認', '识': '識', '给': '給', '带': '帶'
};

const CROSS_STRAIT_SYNONYMS: Record<string, string> = {
    '地铁': '捷運',
    '出租车': '計程車',
    '打车': '叫計程車',
    '软件': '軟體',
    '硬件': '硬體',
    '内存': '記憶體',
    '硬盘': '硬碟',
    '芯片': '晶圓',
    '盒饭': '便當',
    '方便面': '泡麵',
    '土豆': '馬鈴薯',
    '菠萝': '鳳梨',
    '猕猴桃': '奇異果',
    '酸奶': '優格',
    '西红柿': '番茄',
    '勺子': '湯匙'
};

export function convertSimpToTrad(text: string): string {
    let result = text;
    for (const [simp, trad] of Object.entries(CROSS_STRAIT_SYNONYMS)) {
        if (result.includes(simp)) {
            result = result.replaceAll(simp, trad);
        }
    }
    return Array.from(result).map(ch => SIMP_TO_TRAD_MAP[ch] || ch).join('');
}

export function searchWords(query: string) {
    const norm = (s: string) =>
        s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .trim();
    const q = norm(query);
    const qTrad = norm(convertSimpToTrad(query));
    return getAllKnownWords().filter(
        w =>
            norm(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.category}`).includes(q) ||
            norm(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.category}`).includes(qTrad) ||
            norm(w.pinyin).replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
}

const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

function exact(v: unknown, keys: string[]): asserts v is Record<string, unknown> {
    if (!object(v) || Object.keys(v).length !== keys.length || !keys.every(k => Object.hasOwn(v, k)))
        throw Error('Cấu trúc dữ liệu không hợp lệ.');
}

function integer(v: unknown, max = 1000000): v is number {
    return Number.isInteger(v) && Number(v) >= 0 && Number(v) <= max;
}

function validDate(v: unknown, today: string): v is string {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = v.split('-').map(Number);
    return localDate(new Date(y, m - 1, d)) === v && v <= today;
}

export function importState(json: string, date = new Date()): LearningState {
    if (json.length > 200000) throw Error('Tệp dữ liệu quá lớn.');
    let s: unknown;
    try {
        s = JSON.parse(json);
    } catch {
        throw Error('Tệp JSON không hợp lệ.');
    }
    exact(s, ['version', 'profile', 'completedLessonIds', 'savedWordIds', 'reviews', 'activity', 'quizScores']);
    if (s.version !== 1) throw Error('Phiên bản dữ liệu chưa được hỗ trợ.');
    exact(s.profile, ['name', 'dailyGoal']);
    updateProfile(createInitialState(), s.profile as LearningState['profile']);
    const ids = (value: unknown, allowed: string[]) => {
        if (
            !Array.isArray(value) ||
            value.length > allowed.length ||
            new Set(value).size !== value.length ||
            value.some(x => typeof x !== 'string' || !allowed.includes(x))
        )
            throw Error('Danh sách ID không hợp lệ.');
    };
    ids(s.completedLessonIds, lessons.map(l => l.id));
    if (
        !Array.isArray(s.savedWordIds) ||
        s.savedWordIds.length > MAX_VOCAB_SIZE ||
        new Set(s.savedWordIds).size !== s.savedWordIds.length ||
        s.savedWordIds.some(x => typeof x !== 'string' || !isValidWordId(x))
    )
        throw Error('Danh sách ID không hợp lệ.');
    const today = localDate(date);
    if (!object(s.reviews) || Object.keys(s.reviews).length > MAX_VOCAB_SIZE)
        throw Error('Lịch ôn tập không hợp lệ.');
    for (const [id, r] of Object.entries(s.reviews)) {
        if (!isValidWordId(id)) throw Error('Từ vựng không tồn tại.');
        exact(r, ['dueDate', 'interval', 'repetitions', 'lastReviewed']);
        if (
            !integer(r.interval, 36500) ||
            !integer(r.repetitions) ||
            !validDate(r.lastReviewed, today) ||
            typeof r.dueDate !== 'string' ||
            r.dueDate !== shift(r.lastReviewed, r.interval)
        )
            throw Error('Lịch ôn tập không hợp lệ.');
    }
    if (!object(s.activity) || Object.keys(s.activity).length > 36500)
        throw Error('Hoạt động không hợp lệ.');
    for (const [day, a] of Object.entries(s.activity)) {
        exact(a, ['xp', 'lessons', 'reviews']);
        if (
            !validDate(day, today) ||
            !integer(a.xp) ||
            !integer(a.lessons, lessons.length) ||
            !integer(a.reviews, MAX_VOCAB_SIZE) ||
            a.xp !== a.lessons * 30 + a.reviews * 5 ||
            a.xp === 0
        )
            throw Error('Hoạt động không hợp lệ.');
    }
    if (!object(s.quizScores)) throw Error('Điểm kiểm tra không hợp lệ.');
    for (const [id, q] of Object.entries(s.quizScores)) {
        exact(q, ['correct', 'total']);
        const lesson = lessons.find(l => l.id === id);
        if (
            !lesson ||
            !(s.completedLessonIds as string[]).includes(id) ||
            q.total !== lesson.quiz.length ||
            !integer(q.correct, Number(q.total))
        )
            throw Error('Điểm kiểm tra không hợp lệ.');
    }
    const activity = Object.values(s.activity) as {
        lessons: number;
    }[];
    if (activity.reduce((n, a) => n + a.lessons, 0) !== (s.completedLessonIds as string[]).length)
        throw Error('Tiến độ không khớp hoạt động.');
    const reviewTotal = Object.values(s.activity).reduce<number>(
        (n, a) =>
            n +
            (a as {
                reviews: number;
            }).reviews,
        0
    );
    if (reviewTotal < Object.keys(s.reviews).length || (reviewTotal > 0 && Object.keys(s.reviews).length === 0))
        throw Error('Lượt ôn không khớp lịch sử.');
    return s as unknown as LearningState;
}

export function exportState(state: LearningState) {
    return JSON.stringify(state, null, 2);
}

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): {
    state: LearningState;
    error: string | null;
} {
    try {
        const raw = storage.getItem(STORAGE_KEY);
        return { state: raw ? importState(raw) : createInitialState(), error: null };
    } catch {
        return {
            state: createInitialState(),
            error: 'Không thể đọc tiến độ đã lưu. Dữ liệu trong phiên này vẫn sử dụng được.'
        };
    }
}

export function saveState(state: LearningState, storage: Pick<Storage, 'setItem'> = localStorage): string | null {
    try {
        storage.setItem(STORAGE_KEY, exportState(state));
        return null;
    } catch {
        return 'Không thể lưu tiến độ trên thiết bị. Hãy xuất bản sao dữ liệu.';
    }
}

export interface DayProgress {
    date: string;
    dayLabel: string;
    xp: number;
    lessons: number;
    reviews: number;
    metGoal: boolean;
    isToday: boolean;
}

export interface WeeklyProgress {
    days: DayProgress[];
    totalXp: number;
    activeDays: number;
    hasActivity: boolean;
}

export function getWeeklyProgress(state: LearningState, date = new Date()): WeeklyProgress {
    const today = localDate(date);
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const days: DayProgress[] = [];
    let totalXp = 0;
    let activeDays = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const dayStr = localDate(d);
        const act = state.activity[dayStr] ?? { xp: 0, lessons: 0, reviews: 0 };
        const metGoal = act.xp >= state.profile.dailyGoal;
        const isToday = dayStr === today;
        if (act.xp > 0) activeDays++;
        totalXp += act.xp;
        days.push({
            date: dayStr,
            dayLabel: dayLabels[d.getDay()],
            xp: act.xp,
            lessons: act.lessons,
            reviews: act.reviews,
            metGoal,
            isToday
        });
    }

    return {
        days,
        totalXp,
        activeDays,
        hasActivity: totalXp > 0
    };
}

export interface QuizAccuracy {
    totalCorrect: number;
    totalQuestions: number;
    percentage: number | null;
    completedQuizzes: number;
}

export function getQuizAccuracy(state: LearningState): QuizAccuracy {
    const scores = Object.values(state.quizScores);
    if (scores.length === 0) {
        return { totalCorrect: 0, totalQuestions: 0, percentage: null, completedQuizzes: 0 };
    }
    const totalCorrect = scores.reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = scores.reduce((sum, s) => sum + s.total, 0);
    const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;
    return {
        totalCorrect,
        totalQuestions,
        percentage,
        completedQuizzes: scores.length
    };
}

export interface SrsBreakdown {
    total: number;
    newCount: number;
    learning: number;
    review: number;
    dueToday: number;
    overdue: number;
    retentionRate: number;
}

export function getSrsBreakdown(state: LearningState, date = new Date()): SrsBreakdown {
    const today = localDate(date);
    let newCount = 0;
    let learning = 0;
    let review = 0;
    let dueToday = 0;
    let overdue = 0;

    for (const id of state.savedWordIds) {
        const r = state.reviews[id];
        if (!r) {
            newCount++;
            dueToday++;
        } else {
            if (r.interval < 3) {
                learning++;
            } else {
                review++;
            }
            if (r.dueDate <= today) {
                dueToday++;
                if (r.dueDate < today) overdue++;
            }
        }
    }

    const reviewedTotal = Object.values(state.reviews).length;
    const retainedCount = Object.values(state.reviews).filter(r => r.interval >= 1 && r.repetitions >= 1).length;
    const retentionRate = reviewedTotal > 0 ? Math.round((retainedCount / reviewedTotal) * 100) : 100;

    return {
        total: state.savedWordIds.length,
        newCount,
        learning,
        review,
        dueToday,
        overdue,
        retentionRate
    };
}

export interface CompetencyAxis {
    label: string;
    score: number;
}

export interface CompetencyRadar {
    axes: CompetencyAxis[];
    overallScore: number;
    polygonPoints200: string;
    polygonPoints340: string;
}

export function getCompetencyRadar(state: LearningState, date = new Date()): CompetencyRadar {
    const stats = getStats(state, date);
    const quiz = getQuizAccuracy(state);
    const srs = getSrsBreakdown(state, date);
    const lessonRatio = stats.completedLessons / Math.max(1, lessons.length);
    const wordRatio = Math.min(1, Math.max(stats.learnedWords, state.savedWordIds.length) / Math.max(1, allWords.length));

    const sinoVietScore = quiz.percentage !== null ? Math.max(45, quiz.percentage) : Math.round(45 + lessonRatio * 50);
    const toneScore = Math.min(100, Math.round(40 + lessonRatio * 45 + Math.min(15, stats.streak * 5)));
    const vocabScore = Math.min(100, Math.round(30 + wordRatio * 70));
    const radicalScore = Math.min(100, Math.round(35 + (srs.total > 0 ? (srs.review / srs.total) * 40 + 25 : lessonRatio * 55)));
    const grammarScore = Math.min(100, Math.round(30 + lessonRatio * 70));
    const dialogueScore = Math.min(100, Math.round(35 + lessonRatio * 50 + Math.min(15, stats.reviewCount * 3)));

    const axes: CompetencyAxis[] = [
        { label: 'Chuyển âm Hán-Việt', score: sinoVietScore },
        { label: 'Phát âm & Thanh điệu', score: toneScore },
        { label: 'Từ vựng cốt lõi', score: vocabScore },
        { label: 'Chiết tự & Bộ thủ', score: radicalScore },
        { label: 'Ngữ pháp cấu trúc', score: grammarScore },
        { label: 'Phản xạ đàm thoại', score: dialogueScore }
    ];

    const overallScore = Number(
        (axes.reduce((sum, a) => sum + a.score, 0) / axes.length).toFixed(1)
    );

    const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (-5 * Math.PI) / 6];

    const polygonPoints200 = axes
        .map((a, i) => {
            const r = (a.score / 100) * 90;
            const x = (r * Math.cos(angles[i])).toFixed(1);
            const y = (r * Math.sin(angles[i])).toFixed(1);
            return `${x},${y}`;
        })
        .join(' ');

    const polygonPoints340 = axes
        .map((a, i) => {
            const r = (a.score / 100) * 130;
            const x = (170 + r * Math.cos(angles[i])).toFixed(1);
            const y = (160 + r * Math.sin(angles[i])).toFixed(1);
            return `${x},${y}`;
        })
        .join(' ');

    return {
        axes,
        overallScore,
        polygonPoints200,
        polygonPoints340
    };
}

export interface HeatmapDay {
    date: string;
    xp: number;
    lessons: number;
    reviews: number;
    level: 0 | 1 | 2 | 3 | 4;
}

export interface ActivityHeatmap {
    days: HeatmapDay[];
    totalInteractions: number;
    activeDays: number;
}

export function getActivityHeatmap(state: LearningState, date = new Date(), totalDays = 84): ActivityHeatmap {
    const days: HeatmapDay[] = [];
    let activeDays = 0;

    for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const dayStr = localDate(d);
        const act = state.activity[dayStr] ?? { xp: 0, lessons: 0, reviews: 0 };
        if (act.xp > 0) activeDays++;
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (act.xp > 0) {
            if (act.xp < state.profile.dailyGoal * 0.5) level = 1;
            else if (act.xp < state.profile.dailyGoal) level = 2;
            else if (act.xp < state.profile.dailyGoal * 2) level = 3;
            else level = 4;
        }
        days.push({
            date: dayStr,
            xp: act.xp,
            lessons: act.lessons,
            reviews: act.reviews,
            level
        });
    }

    const totalInteractions = Object.values(state.activity).reduce(
        (sum, a) => sum + a.lessons + a.reviews,
        0
    );

    return {
        days,
        totalInteractions,
        activeDays
    };
}

export interface LessonDraft {
    lessonId: string;
    stage: number;
    question: number;
    selected: number | null;
    correct: number;
}

export interface ScenarioDraft {
    scenarioId: string;
    nodeId: string;
    feedback: string;
    history: { text: string; meaning: string }[];
}

export const DRAFT_LESSON_KEY = 'zhongxue.draft.lesson.v1';
export const DRAFT_SCENARIO_KEY = 'zhongxue.draft.scenario.v1';

export function validateLessonDraft(v: unknown): LessonDraft | null {
    if (!v || typeof v !== 'object') return null;
    const d = v as Record<string, unknown>;
    if (typeof d.lessonId !== 'string') return null;
    const lesson = lessons.find(l => l.id === d.lessonId);
    if (!lesson) return null;
    if (!Number.isInteger(d.stage) || (d.stage as number) < 0 || (d.stage as number) > 3) return null;
    if (!Number.isInteger(d.question) || (d.question as number) < 0 || (d.question as number) >= lesson.quiz.length) return null;
    if (!Number.isInteger(d.correct) || (d.correct as number) < 0 || (d.correct as number) > lesson.quiz.length) return null;
    if (
        d.selected !== null &&
        (!Number.isInteger(d.selected) ||
            (d.selected as number) < 0 ||
            (d.selected as number) >= (lesson.quiz[d.question as number]?.options.length ?? 0))
    )
        return null;
    return {
        lessonId: d.lessonId,
        stage: d.stage as number,
        question: d.question as number,
        selected: d.selected as number | null,
        correct: d.correct as number
    };
}

export function validateScenarioDraft(v: unknown): ScenarioDraft | null {
    if (!v || typeof v !== 'object') return null;
    const d = v as Record<string, unknown>;
    if (typeof d.scenarioId !== 'string' || typeof d.nodeId !== 'string' || typeof d.feedback !== 'string') return null;
    const sc = scenarios.find(s => s.id === d.scenarioId);
    if (!sc) return null;
    if (!sc.nodes[d.nodeId]) return null;
    if (!Array.isArray(d.history)) return null;
    for (const h of d.history) {
        if (!h || typeof h !== 'object' || typeof h.text !== 'string' || typeof h.meaning !== 'string') return null;
    }
    return {
        scenarioId: d.scenarioId,
        nodeId: d.nodeId,
        feedback: d.feedback,
        history: d.history as { text: string; meaning: string }[]
    };
}

const safeSessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> =
    typeof window !== 'undefined' && window.sessionStorage
        ? window.sessionStorage
        : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {}
          };

export function saveLessonDraft(
    draft: LessonDraft | null,
    storage: Pick<Storage, 'setItem' | 'removeItem'> = safeSessionStorage
): void {
    try {
        if (draft) {
            storage.setItem(DRAFT_LESSON_KEY, JSON.stringify(draft));
        } else {
            storage.removeItem(DRAFT_LESSON_KEY);
        }
    } catch {
        // quota or storage unavailable
    }
}

export function loadLessonDraft(storage: Pick<Storage, 'getItem'> = safeSessionStorage): LessonDraft | null {
    try {
        const raw = storage.getItem(DRAFT_LESSON_KEY);
        if (!raw) return null;
        return validateLessonDraft(JSON.parse(raw));
    } catch {
        return null;
    }
}

export function saveScenarioDraft(
    draft: ScenarioDraft | null,
    storage: Pick<Storage, 'setItem' | 'removeItem'> = safeSessionStorage
): void {
    try {
        if (draft) {
            storage.setItem(DRAFT_SCENARIO_KEY, JSON.stringify(draft));
        } else {
            storage.removeItem(DRAFT_SCENARIO_KEY);
        }
    } catch {
        // quota or storage unavailable
    }
}

export function loadScenarioDraft(storage: Pick<Storage, 'getItem'> = safeSessionStorage): ScenarioDraft | null {
    try {
        const raw = storage.getItem(DRAFT_SCENARIO_KEY);
        if (!raw) return null;
        return validateScenarioDraft(JSON.parse(raw));
    } catch {
        return null;
    }
}

export function clearDrafts(storage: Pick<Storage, 'removeItem'> = safeSessionStorage): void {
    try {
        storage.removeItem(DRAFT_LESSON_KEY);
        storage.removeItem(DRAFT_SCENARIO_KEY);
    } catch {
        // ignore
    }
}
