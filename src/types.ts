export interface Word {
    id: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
    example: string;
    examplePinyin: string;
    exampleMeaning: string;
    category: string;
    lessonId: string;
}
export interface QuizQuestion {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
}
export interface DialogueLine {
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
}
export interface Lesson {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    duration: number;
    icon: string;
    color: string;
    words: Word[];
    grammar: {
        title: string;
        pattern: string;
        explanation: string;
        example: string;
        meaning: string;
    }[];
    dialogue: DialogueLine[];
    quiz: QuizQuestion[];
}
export interface ScenarioChoice {
    text: string;
    pinyin: string;
    meaning: string;
    next: string;
    feedback: string;
    correct: boolean;
}
export interface ScenarioNode {
    id: string;
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
    choices: ScenarioChoice[];
    end?: boolean;
}
export interface Scenario {
    id: string;
    title: string;
    description: string;
    icon: string;
    level: string;
    start: string;
    nodes: Record<string, ScenarioNode>;
}

// ============================================================================
// Shared API Contract Types (ZhongXue V2 Architecture)
// ============================================================================

/** Database dictionary entry returned by /api/dictionary */
export interface DbDictionaryResult {
    id: string;
    traditional: string;
    simplified: string;
    pinyin: string;
    definitions: string[];
}

/** Paginated search response for dictionary searches */
export interface DictionarySearchResponse {
    results: DbDictionaryResult[];
    total: number;
    count: number;
    dictionaryTotal?: number;
    totalMatches?: number;
    pageCount?: number;
    offset: number;
    limit: number;
    query: string;
    mode: 'all' | 'hanzi' | 'pinyin' | 'vi';
    source: 'database' | 'local';
}

/** Legacy SearchResponse compatibility alias */
export type SearchResponse = DictionarySearchResponse;

/** Health endpoint response DTO (/api/health) */
export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    uptime: number;
    timestamp: string;
    dictionary: {
        loaded: boolean;
        totalEntries: number;
        loadTimeMs?: number;
    };
    ai: {
        configured: boolean;
        provider: string;
        model: string;
    };
    version: string;
}

/** Single turn in a conversation */
export interface ConversationTurn {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/** Supported conversation actions */
export type ConversationAction = 'chat' | 'ping' | 'health';

/** Request body for /api/conversation */
export interface ConversationRequestBody {
    action?: ConversationAction;
    unitId?: number;
    threadId?: number;
    roleId?: string;
    messages?: ConversationTurn[];
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
}

/** Conversation reply mode: live AI or local guided tutor */
export type ConversationReplyMode = 'ai' | 'guided';

/** Conversation reply response DTO */
export interface ConversationReply {
    mode: ConversationReplyMode;
    content: string;
    model?: string;
    provider?: string;
    thread?: {
        id: number;
        messages: ConversationTurn[];
    };
    meta?: {
        latencyMs?: number;
        fallbackReason?: 'timeout' | 'upstream_error' | 'no_key' | 'offline';
        guidanceNote?: string;
    };
}

/** Connection status for AI health/ping check */
export interface AiConnectionStatus {
    ok: boolean;
    provider: string;
    model: string;
    baseUrl: string;
    latencyMs?: number;
    statusCode?: number;
    error?: string;
}

/** Stroke data representation for handwriting recognition: [xCoords, yCoords, timeOffsets] */
export type HandwritingStroke = [number[], number[], number[]];

/** Request body for /api/handwriting */
export interface HandwritingRequestBody {
    strokes: HandwritingStroke[];
    width?: number;
    height?: number;
    language?: string;
}

/** Response from /api/handwriting */
export interface HandwritingResponse {
    candidates: string[];
    source: 'google' | 'local_fallback';
}

/** Standard API Error response structure */
export interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
