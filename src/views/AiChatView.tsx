import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Volume2, Mic, MicOff, RefreshCw, Bot, Sparkles, X, RotateCcw } from 'lucide-react';
import { simulateLocalAiReply } from '../services/api';
import { speakChinese, speakChineseSlow } from '../services/speech';
import type { ConversationTurn, ConversationReply } from '../types';

const AI_CHAT_STORAGE_KEY = 'zhongxue.draft.aichat.v1';
const AI_CHAT_ROLE_STORAGE_KEY = 'zhongxue.draft.aichat.role.v1';

export interface ScenarioRole {
    id: string;
    label: string;
    aiGreeting: string;
}

export const SCENARIO_ROLES: ScenarioRole[] = [
    {
        id: 'free',
        label: '💬 Tự do',
        aiGreeting: `中文：你好！我是你的華語 AI 學習夥伴。今天想在臺灣練習什麼情境？比如點奶茶、搭捷運或問路？\nPinyin: Nǐ hǎo! Wǒ shì nǐ de huáyǔ AI xuéxí huǒbàn. Jīntiān xiǎng zài Táiwān liànxí shénme qíngjìng? Bǐrú diǎn nǎichá, dā jiéyùn huò wènlù?\nTiếng Việt: Xin chào! Tôi là bạn đồng hành học tiếng Trung AI của bạn. Hôm nay bạn muốn luyện tập tình huống nào ở Đài Loan? Ví dụ: gọi trà sữa, đi MRT hay hỏi đường?\n練習：Gợi ý: Hãy thử chào lại bằng "你好！" hoặc chọn một tình huống nhập vai bên trên nhé!`
    },
    {
        id: 'tea',
        label: '🧋 Trà sữa (50嵐)',
        aiGreeting: `中文：歡迎光臨 50嵐！請問今天要喝什麼飲料？甜度和冰塊要怎麼調整？\nPinyin: Huānyíng guānglín 50 Lán! Qǐngwèn jīntiān yào hē shénme yǐnliào? Tiándù hé bīngkuài yào zěnme tiáozhěng?\nTiếng Việt: Chào mừng bạn đến với 50 Lan! Xin hỏi hôm nay bạn muốn uống đồ uống gì? Độ ngọt và đá điều chỉnh thế nào?\n練習：Gợi ý phản xạ: 我要一杯珍珠奶茶，半糖少冰，外帶。(Cho tôi một ly trà sữa trân châu, nửa đường ít đá, mang đi).`
    },
    {
        id: 'mrt',
        label: '🚇 MRT & EasyCard',
        aiGreeting: `中文：捷運站服務處，您好！請問需要幫忙嗎？您可以詢問轉車路線或悠遊卡加值。\nPinyin: Jiéyùn zhàn fúwù chù, nín hǎo! Qǐngwèn xūyào bāngmáng ma? Nín kěyǐ xúnwèn zhuǎnchē lùxiàn huò yōuyóukǎ jiāzhí.\nTiếng Việt: Quầy dịch vụ ga MRT xin chào! Bạn cần giúp đỡ gì không? Bạn có thể hỏi đường chuyển tàu hoặc nạp tiền thẻ EasyCard.\n練習：Gợi ý phản xạ: 請問去台北車站要在哪裡轉車？(Xin hỏi muốn đến Ga Đài Bắc thì chuyển tàu ở đâu?).`
    },
    {
        id: 'store',
        label: '🛒 Tiện lợi 7-11',
        aiGreeting: `中文：叮咚！歡迎光臨！請問需要袋子嗎？發票要印出來還是存載具？現金還是刷卡？\nPinyin: Dīngdōng! Huānyíng guānglín! Qǐngwèn xūyào dàizi ma? Fāpiào yào yìn chūlái háishì cún zàijù? Xiànjīn háishì shuā kǎ?\nTiếng Việt: Ting-tong! Xin chào quý khách! Xin hỏi bạn cần túi không? Hóa đơn in ra hay lưu thẻ? Trả tiền mặt hay quẹt thẻ?\n練習：Gợi ý phản xạ: 不用袋子，請給我發票，我刷悠遊卡。(Không cần túi, xin cho tôi hóa đơn, tôi quẹt thẻ EasyCard).`
    },
    {
        id: 'nightmarket',
        label: '🍜 Chợ đêm & Mì bò',
        aiGreeting: `中文：帥哥美女，裡面坐！我們有招牌紅燒牛肉麵、滷肉飯和臭豆腐，要吃什麼？要不要加辣？\nPinyin: Shuàigē měinǚ, lǐmiàn zuò! Wǒmen yǒu zhāopái hóngshāo niúròu miàn, lǔròufàn hàn chòudòufu, yào chī shénme? Yào bú yào jiā là?\nTiếng Việt: Mời bạn vào trong ngồi! Quán chúng tôi có mì bò kho đặc biệt, cơm thịt kho và đậu phụ thối, bạn muốn ăn gì? Có thêm cay không?\n練習：Gợi ý phản xạ: 老闆，我要一碗牛肉麵，不要辣，謝謝！(Chủ quán, cho tôi một tô mì bò, không cay, cảm ơn!).`
    },
    {
        id: 'house',
        label: '🏠 Thuê phòng trọ',
        aiGreeting: `中文：你好！這間套房一個月房租八千元，押金兩個月，包水費不包電費。請問想什麼時候看房？\nPinyin: Nǐ hǎo! Zhè jiān tàofáng yí ge yuè fángzū bāqiān yuán, yājīn liǎng ge yuè, bāo shuǐfèi bù bāo diànfèi. Qǐngwèn xiǎng shénme shíhou kàn fáng?\nTiếng Việt: Chào bạn! Căn phòng khép kín này tiền thuê mỗi tháng 8.000 tệ, đặt cọc 2 tháng, bao tiền nước không bao tiền điện. Bạn muốn xem phòng lúc nào?\n練習：Gợi ý phản xạ: 請問離捷運站走路要多久？明天下午方便看房嗎？(Xin hỏi đi bộ ra ga MRT mất bao lâu? Chiều mai xem phòng được không?).`
    },
    {
        id: 'clinic',
        label: '🏥 Phòng khám & BHYT',
        aiGreeting: `中文：您好，請先出示健保卡掛號。請問您今天哪裡不舒服？有發燒或頭痛嗎？\nPinyin: Nín hǎo, qǐng xiān chūshì jiànbǎokǎ guàhào. Qǐngwèn nín jīntiān nǎlǐ bù shūfu? Yǒu fāshāo huò tóutòng ma?\nTiếng Việt: Chào bạn, vui lòng xuất trình thẻ Bảo hiểm Y tế để lấy số khám. Hôm nay bạn thấy khó chịu ở đâu? Có sốt hoặc đau đầu không?\n練習：Gợi ý phản xạ: 我從昨天開始有一點發燒和喉嚨痛。(Tôi bắt đầu sốt nhẹ và đau họng từ hôm qua).`
    },
    {
        id: 'scooter',
        label: '🛵 Thuê xe máy',
        aiGreeting: `中文：你好！租機車一天六百元，附兩頂安全帽。請問你有國際駕照或臺灣機車駕照嗎？\nPinyin: Nǐ hǎo! Zū jīchē yì tiān liùbǎi yuán, fù liǎng dǐng ānquánmào. Qǐngwèn nǐ yǒu guójì jiàzhào huò Táiwān jīchē jiàzhào ma?\nTiếng Việt: Chào bạn! Thuê xe máy một ngày 600 tệ, kèm 2 mũ bảo hiểm. Xin hỏi bạn có bằng lái quốc tế hoặc bằng lái xe máy Đài Loan không?\n練習：Gợi ý phản xạ: 我有國際駕照，請問前面有加油站嗎？(Tôi có bằng lái quốc tế, xin hỏi phía trước có cây xăng không?).`
    },
    {
        id: 'bank',
        label: '🏦 Ngân hàng & ARC',
        aiGreeting: `中文：您好，請問今天需要辦理什麼業務？開戶、換匯還是匯款回國？請先抽號碼牌。\nPinyin: Nín hǎo, qǐngwèn jīntiān xūyào bànlǐ shénme yèwù? Kāihù, huànhuì háishì huìkuǎn huíguó? Qǐng xiān chōu hàomǎpái.\nTiếng Việt: Xin chào, hôm nay bạn cần làm thủ tục gì? Mở tài khoản, đổi ngoại tệ hay chuyển tiền về nước? Xin hãy bốc số trước.\n練習：Gợi ý phản xạ: 我想開戶和辦提款卡，這是我的居留證和印章。(Tôi muốn mở tài khoản và làm thẻ ATM, đây là thẻ ARC và con dấu của tôi).`
    },
    {
        id: 'interview',
        label: '👔 Phỏng vấn xin việc',
        aiGreeting: `中文：你好，請坐！我們看過你的履歷表了，請先用中文做一分鐘的簡單自我介紹。\nPinyin: Nǐ hǎo, qǐng zuò! Wǒmen kànguo nǐ de lǚlìbiǎo le, qǐng xiān yòng zhōngwén zuò yì fēnzhōng de jiǎndān zìwǒ jièshào.\nTiếng Việt: Chào bạn, mời ngồi! Chúng tôi đã xem qua sơ yếu lý lịch của bạn, mời bạn giới thiệu ngắn gọn về bản thân bằng tiếng Hoa trong 1 phút.\n練習：Gợi ý phản xạ: 經理好！我叫小安，來自越南，有三年的軟體開發經驗。(Chào giám đốc! Tôi tên Tiểu An, đến từ Việt Nam, có 3 năm kinh nghiệm phát triển phần mềm).`
    },
    {
        id: 'factory',
        label: '🏭 Công xưởng & Tăng ca',
        aiGreeting: `中文：組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。另外請問今天晚上有需要配合加班嗎？\nPinyin: Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū. Lìngwài qǐngwèn jīntiān wǎnshang yǒu xūyào pèihé jiābān ma?\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa. Ngoài ra xin hỏi tối nay có cần phối hợp tăng ca không ạ?\n練習：Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時，下班時我會記得刷卡打卡。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng, khi tan ca em sẽ nhớ quẹt thẻ).`
    },
    {
        id: 'tax',
        label: '💰 Cục thuế & Cư trú',
        aiGreeting: `中文：您好！五月份是臺灣綜合所得稅申報期。請問您去年在臺灣居留是否滿183天？請出示您的居留證與扣繳憑單。\nPinyin: Nín hǎo! Wǔ yuèfèn shì Táiwān zōnghé suǒdéshuì shēnbào qī. Qǐngwèn nín qùnián zài Táiwān jūliú shìfǒu mǎn yībǎi bāshísān tiān? Qǐng chūshì nín de jūliúzhèng yǔ kòujiǎo píngdān.\nTiếng Việt: Xin chào! Tháng 5 là kỳ kê khai thuế thu nhập cá nhân tại Đài Loan. Xin hỏi năm ngoái bạn có cư trú đủ 183 ngày không? Vui lòng xuất trình thẻ ARC và chứng từ khấu trừ thuế.\n練習：Gợi ý phản xạ: 我去年居留超過183天，這是我的居留證與公司的扣繳憑單，想辦理線上退稅。(Năm ngoái tôi cư trú hơn 183 ngày, đây là thẻ ARC và chứng từ khấu trừ của công ty, tôi muốn làm thủ tục hoàn thuế trực tuyến).`
    },
    {
        id: 'tech',
        label: '💻 Bán dẫn & High-Tech',
        aiGreeting: `中文：工程師您好！這批3奈米晶圓正在無塵室進行先進製程曝光，目前的良率指標非常穩定。\nPinyin: Gōngchéngshī nín hǎo! Zhè pī sān nàimǐ jīngyuán zhèngzài wúchénshì jìnxíng xiānjìn zhìchéng pùguāng, mùqián de liánglǜ zhǐbiāo fēicháng wěndìng.\nTiếng Việt: Chào kỹ sư! Lô wafer 3nm này đang trong phòng sạch thực hiện quy trình quang khắc tiên tiến, chỉ số tỷ lệ thành phẩm (yield rate) hiện rất ổn định.\n練習：Gợi ý phản xạ: 請特別監控這道蝕刻步驟的良率變化，並與研發部門確認參數。(Xin đặc biệt theo dõi biến động tỷ lệ thành phẩm ở bước khắc này và xác nhận thông số với bộ phận R&D).`
    }
];

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    mode?: 'ai' | 'guided';
    model?: string;
    provider?: string;
    guidanceNote?: string;
    latencyMs?: number;
    source?: 'upstream' | 'local-fallback' | 'scenario-init';
    status?: 'success' | 'canceled' | 'error';
    retryText?: string;
}

function createInitialGreeting(role: ScenarioRole): ChatMessage {
    return {
        id: `greeting-${role.id}`,
        role: 'assistant',
        content: role.aiGreeting,
        timestamp: Date.now(),
        mode: 'guided',
        provider: 'Gia sư TOCFL Đài Loan',
        source: 'scenario-init',
        status: 'success'
    };
}

function loadInitialRole(): string {
    if (typeof window === 'undefined') return 'free';
    try {
        const stored = window.sessionStorage.getItem(AI_CHAT_ROLE_STORAGE_KEY);
        if (stored && SCENARIO_ROLES.some(r => r.id === stored)) {
            return stored;
        }
    } catch {
        // ignore
    }
    return 'free';
}

function loadInitialMessages(): ChatMessage[] {
    const initialRole = loadInitialRole();
    const matchedRole = SCENARIO_ROLES.find(r => r.id === initialRole) || SCENARIO_ROLES[0];
    const fallbackGreeting = createInitialGreeting(matchedRole);
    if (typeof window === 'undefined') return [fallbackGreeting];

    try {
        const raw = window.sessionStorage.getItem(AI_CHAT_STORAGE_KEY);
        if (!raw) return [fallbackGreeting];

        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.every(
                item =>
                    typeof item === 'object' &&
                    item !== null &&
                    ((item as ConversationTurn).role === 'user' ||
                        (item as ConversationTurn).role === 'assistant' ||
                        (item as ConversationTurn).role === 'system') &&
                    typeof (item as ConversationTurn).content === 'string'
            );

            if (valid) {
                return (parsed as Array<Record<string, unknown>>).map((item, idx) => ({
                    id: typeof item.id === 'string' ? item.id : `msg-${idx}-${Date.now()}`,
                    role: item.role as 'user' | 'assistant' | 'system',
                    content: item.content as string,
                    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
                    mode: item.mode === 'ai' || item.mode === 'guided' ? item.mode : (item.role === 'assistant' ? 'guided' : undefined),
                    model: typeof item.model === 'string' ? item.model : undefined,
                    provider: typeof item.provider === 'string' ? item.provider : undefined,
                    guidanceNote: typeof item.guidanceNote === 'string' ? item.guidanceNote : undefined,
                    latencyMs: typeof item.latencyMs === 'number' ? item.latencyMs : undefined,
                    source: item.source as 'upstream' | 'local-fallback' | 'scenario-init' | undefined,
                    status: item.status as 'success' | 'canceled' | 'error' | undefined,
                    retryText: typeof item.retryText === 'string' ? item.retryText : undefined
                }));
            }
        }
    } catch {
        // Fallback to default greeting
    }

    return [fallbackGreeting];
}

async function fetchConversationReply(
    messageText: string,
    history: ChatMessage[],
    roleId: string,
    modelCandidate: string,
    signal: AbortSignal
): Promise<ConversationReply> {
    let apiKey: string | undefined;
    let baseUrl: string | undefined;
    let model = modelCandidate;

    if (typeof window !== 'undefined') {
        try {
            const raw = window.localStorage.getItem('zhongxue.ai.config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.apiKey) apiKey = parsed.apiKey;
                if (parsed?.baseUrl) baseUrl = parsed.baseUrl;
                if (!model && parsed?.model) model = parsed.model;
            }
        } catch {
            // ignore
        }
    }

    model = (model || 'gpt-6.1-sol').trim();
    baseUrl = (baseUrl || 'https://agentrouter.org/v1').trim();

    const isUiNotice = (content: string) =>
        content.includes('⚠️ Yêu cầu đối thoại đã được hủy') ||
        content.includes('hủy theo lệnh của bạn') ||
        content.includes('Đã hủy yêu cầu đối thoại');

    const turns: ConversationTurn[] = [];
    for (const m of history) {
        if (m.status === 'canceled' || m.status === 'error' || isUiNotice(m.content)) {
            continue;
        }
        if (m.role === 'user' || m.role === 'assistant') {
            if (
                m.role === 'user' &&
                turns.length > 0 &&
                turns[turns.length - 1].role === 'user' &&
                turns[turns.length - 1].content === m.content
            ) {
                continue;
            }
            turns.push({ role: m.role, content: m.content });
        }
    }

    if (
        turns.length > 0 &&
        turns[turns.length - 1].role === 'user' &&
        turns[turns.length - 1].content === messageText
    ) {
        // Already in turns as the last user turn
    } else {
        turns.push({ role: 'user', content: messageText });
    }

    const payload = {
        action: 'chat',
        unitId: 1,
        roleId,
        messages: turns.slice(-10),
        model,
        baseUrl,
        apiKey: apiKey ? apiKey.trim() : undefined
    };

    const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
    });

    if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const errorMsg = errorJson?.error?.message || `Máy chủ phản hồi mã ${res.status}`;
        throw new Error(errorMsg);
    }

    return await res.json();
}

export interface AiChatViewProps {
    initialPrompt?: string;
    initialRoleId?: string;
    onResetPrompt?: () => void;
}

export function AiChatView({ initialPrompt, initialRoleId, onResetPrompt }: AiChatViewProps = {}) {
    const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
    const [activeRole, setActiveRole] = useState<string>(loadInitialRole);
    const [activeModel, setActiveModel] = useState<string>(() => {
        if (typeof window === 'undefined') return 'gpt-6.1-sol';
        try {
            const raw = window.localStorage.getItem('zhongxue.ai.config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.model) return parsed.model;
            }
        } catch {
            //
        }
        return 'gpt-6.1-sol';
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const activeAbortControllerRef = useRef<AbortController | null>(null);
    const lastDraftTextRef = useRef<string>('');
    const activeRoleRef = useRef<string>(activeRole);
    const generationIdRef = useRef<number>(0);
    const messagesRef = useRef<ChatMessage[]>(messages);

    // Keep activeRoleRef and sessionStorage in sync with activeRole
    useEffect(() => {
        activeRoleRef.current = activeRole;
        if (typeof window === 'undefined') return;
        try {
            window.sessionStorage.setItem(AI_CHAT_ROLE_STORAGE_KEY, activeRole);
        } catch {
            // ignore
        }
    }, [activeRole]);

    // Keep messagesRef and sessionStorage in sync with messages
    useEffect(() => {
        messagesRef.current = messages;
        if (typeof window === 'undefined') return;
        try {
            window.sessionStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch {
            // Ignore quota errors
        }
    }, [messages]);

    // Toggle between primary models
    function toggleModel() {
        const nextModel = activeModel === 'gpt-6.1-sol' ? 'deepseek-v4-flash' : 'gpt-6.1-sol';
        setActiveModel(nextModel);

        if (typeof window !== 'undefined') {
            try {
                const raw = window.localStorage.getItem('zhongxue.ai.config');
                const prev = raw ? JSON.parse(raw) : {};
                window.localStorage.setItem(
                    'zhongxue.ai.config',
                    JSON.stringify({
                        ...prev,
                        baseUrl: prev?.baseUrl || 'https://agentrouter.org/v1',
                        model: nextModel
                    })
                );
            } catch {
                //
            }
        }
        setVoiceNotice(`Đã chuyển sang mô hình: ${nextModel}`);
    }

    // Cancel an active in-flight request
    const handleCancelRequest = useCallback(() => {
        if (activeAbortControllerRef.current) {
            activeAbortControllerRef.current.abort();
            activeAbortControllerRef.current = null;
        }
        setLoading(false);

        // Draft preservation: Restore the typed input if empty so learner does not lose it
        if (!input.trim() && lastDraftTextRef.current) {
            setInput(lastDraftTextRef.current);
        }
        setVoiceNotice('Đã hủy yêu cầu đối thoại. Nội dung câu hỏi đã được giữ lại trong ô nhập.');
    }, [input]);

    // Abort pending request automatically on unmount to prevent leaks
    useEffect(() => {
        return () => {
            if (activeAbortControllerRef.current) {
                activeAbortControllerRef.current.abort();
                activeAbortControllerRef.current = null;
            }
        };
    }, []);

    // Switch scenario role: automatically abort any in-flight request and invalidate generation
    const switchRole = useCallback((role: ScenarioRole) => {
        generationIdRef.current += 1;

        if (activeAbortControllerRef.current) {
            activeAbortControllerRef.current.abort();
            activeAbortControllerRef.current = null;
        }
        setLoading(false);
        lastDraftTextRef.current = '';
        activeRoleRef.current = role.id;
        setActiveRole(role.id);
        setInput('');

        const greetingMsg = createInitialGreeting(role);
        messagesRef.current = [greetingMsg];
        setMessages([greetingMsg]);
        setVoiceNotice(null);

        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify([greetingMsg]));
                window.sessionStorage.setItem(AI_CHAT_ROLE_STORAGE_KEY, role.id);
            } catch {
                // Ignore
            }
        }
    }, []);

    // Auto-scroll ONLY internal chat message container, never scrolling the main page/window
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTo({
                top: chatMessagesRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, loading]);

    // Send chat message with generation guard, active AbortController and draft preservation
    const handleSend = useCallback(async (customText?: string) => {
        const textToSend = (customText || input).trim();
        if (!textToSend || loading) return; // Prevent double sending while in flight

        setVoiceNotice(null);

        const thisRequestId = ++generationIdRef.current;
        const thisRoleId = activeRoleRef.current;

        // Draft preservation: store draft for restoration upon cancel or error
        lastDraftTextRef.current = textToSend;

        if (!customText) {
            setInput('');
        }

        // Abort any existing in-flight request before sending a new one
        if (activeAbortControllerRef.current) {
            activeAbortControllerRef.current.abort();
            activeAbortControllerRef.current = null;
        }

        const controller = new AbortController();
        activeAbortControllerRef.current = controller;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };

        let currentHistory = messagesRef.current;
        // If the immediately preceding turn was a canceled message for the same query, clean it up to prevent duplicate turns
        if (
            currentHistory.length >= 2 &&
            currentHistory[currentHistory.length - 1].status === 'canceled' &&
            currentHistory[currentHistory.length - 2].role === 'user' &&
            currentHistory[currentHistory.length - 2].content === textToSend
        ) {
            currentHistory = currentHistory.slice(0, currentHistory.length - 2);
        }

        const newMessages = [...currentHistory, userMsg];
        messagesRef.current = newMessages;
        setMessages(newMessages);
        setLoading(true);

        const startTime = performance.now();

        try {
            const reply = await fetchConversationReply(
                textToSend,
                currentHistory,
                thisRoleId,
                activeModel,
                controller.signal
            );

            // Generation guard: discard response if user switched role or initiated newer request
            if (generationIdRef.current !== thisRequestId || activeRoleRef.current !== thisRoleId) {
                return;
            }

            const latencyMs = Math.round(performance.now() - startTime);

            // Success: clear draft
            lastDraftTextRef.current = '';

            const isLiveAi = reply.mode === 'ai';
            const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'assistant',
                content: reply.content,
                timestamp: Date.now(),
                mode: reply.mode,
                model: reply.model || (isLiveAi ? activeModel : undefined),
                provider: reply.provider || (isLiveAi ? 'AgentRouter' : 'Gia sư Hán học Cục bộ'),
                guidanceNote: reply.meta?.guidanceNote,
                latencyMs: reply.meta?.latencyMs ?? latencyMs,
                source: isLiveAi ? 'upstream' : 'local-fallback',
                status: 'success'
            };

            setMessages(prev => {
                const next = [...prev, assistantMsg];
                messagesRef.current = next;
                return next;
            });
        } catch (err) {
            // Generation guard: do not pollute other roles or newer requests upon abort/error
            if (generationIdRef.current !== thisRequestId || activeRoleRef.current !== thisRoleId) {
                return;
            }

            const isAbort = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError');

            if (isAbort) {
                // Request canceled by user
                if (!input.trim() && lastDraftTextRef.current) {
                    setInput(lastDraftTextRef.current);
                }
                setVoiceNotice('Đã hủy yêu cầu đối thoại. Nội dung câu hỏi đã được giữ lại trong ô nhập.');

                const canceledMsg: ChatMessage = {
                    id: `canceled-${Date.now()}`,
                    role: 'assistant',
                    content: '⚠️ Yêu cầu đối thoại đã được hủy theo lệnh của bạn. Bạn có thể chỉnh sửa câu hỏi hoặc bấm "Thử lại".',
                    timestamp: Date.now(),
                    mode: 'guided',
                    status: 'canceled',
                    retryText: textToSend
                };
                setMessages(prev => {
                    const next = [...prev, canceledMsg];
                    messagesRef.current = next;
                    return next;
                });
            } else {
                // Server or network error: activate resilient TOCFL local guided fallback
                const fallbackReply = simulateLocalAiReply(textToSend, thisRoleId);
                const fallbackMsg: ChatMessage = {
                    id: `fallback-${Date.now()}`,
                    role: 'assistant',
                    content: fallbackReply.content,
                    timestamp: Date.now(),
                    mode: 'guided',
                    model: 'Sinology Local Tutor',
                    provider: 'Gia sư Hán học Cục bộ (TOCFL Taiwan)',
                    guidanceNote: 'Kết nối mạng hoặc máy chủ AI trực tuyến gián đoạn. Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan để bạn không bị ngắt quãng bài học.',
                    source: 'local-fallback',
                    status: 'success'
                };
                setMessages(prev => {
                    const next = [...prev, fallbackMsg];
                    messagesRef.current = next;
                    return next;
                });
                setVoiceNotice('Đang sử dụng phản hồi từ Gia sư Hướng dẫn Cục bộ (TOCFL Taiwan).');
            }
        } finally {
            if (generationIdRef.current === thisRequestId && activeRoleRef.current === thisRoleId) {
                if (activeAbortControllerRef.current === controller) {
                    activeAbortControllerRef.current = null;
                }
                setLoading(false);
            }
        }
    }, [input, loading, activeModel]);

    // Handle retry for canceled turns: cleanly clean up canceled bubble and previous turn
    const handleRetry = useCallback((msgId: string, retryText: string) => {
        const cur = messagesRef.current;
        const idx = cur.findIndex(m => m.id === msgId);
        const next = [...cur];
        if (idx !== -1) {
            next.splice(idx, 1);
            if (idx > 0 && next[idx - 1].role === 'user' && next[idx - 1].content === retryText) {
                next.splice(idx - 1, 1);
            }
        }
        messagesRef.current = next;
        setMessages(next);
        void handleSend(retryText);
    }, [handleSend]);

    // Handle initial scenario prompt and role if injected from parent view
    useEffect(() => {
        if ((initialPrompt && initialPrompt.trim()) || initialRoleId) {
            const prompt = (initialPrompt || '').trim();
            const targetRoleId = initialRoleId;
            onResetPrompt?.();
            queueMicrotask(() => {
                let roleToActivate: ScenarioRole | undefined;
                if (targetRoleId) {
                    roleToActivate = SCENARIO_ROLES.find(r => r.id === targetRoleId);
                }
                if (!roleToActivate && prompt) {
                    const lower = prompt.toLowerCase();
                    roleToActivate = SCENARIO_ROLES.find(
                        r => r.id !== 'free' && (lower.includes(r.id) || lower.includes(r.label.slice(2).toLowerCase()))
                    );
                }
                if (roleToActivate) {
                    switchRole(roleToActivate);
                }
                if (prompt) {
                    void handleSend(prompt);
                }
            });
        }
    }, [initialPrompt, initialRoleId, onResetPrompt, handleSend, switchRole]);

    // Web Speech recognition
    function toggleVoiceInput() {
        if (typeof window === 'undefined') return;

        interface SpeechResult {
            transcript: string;
        }
        interface SpeechEvent {
            results: Array<Array<SpeechResult>>;
        }
        interface SpeechErrorEvent {
            error: string;
        }
        interface SpeechInstance {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onstart: () => void;
            onend: () => void;
            onerror: (event: SpeechErrorEvent) => void;
            onresult: (event: SpeechEvent) => void;
            start: () => void;
            stop: () => void;
        }
        type SpeechCtor = new () => SpeechInstance;
        const win = window as unknown as {
            SpeechRecognition?: SpeechCtor;
            webkitSpeechRecognition?: SpeechCtor;
        };
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRec) {
            setVoiceNotice(
                'Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech. Hãy nhập văn bản bằng bàn phím nhé!'
            );
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        try {
            setVoiceNotice('Đang lắng nghe phát âm tiếng Trung của bạn... Hãy nói vào microphone!');
            const recognition = new SpeechRec();
            recognition.lang = 'zh-TW';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: SpeechErrorEvent) => {
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    setVoiceNotice(
                        'Trình duyệt chưa được cấp quyền micro. Bạn hãy bấm vào biểu tượng ổ khóa cạnh URL để Cho phép Micro nhé!'
                    );
                } else if (event.error === 'no-speech') {
                    setVoiceNotice('Chưa nhận được âm thanh. Hãy thử lại và nói to, rõ hơn gần micro nhé!');
                } else if (event.error === 'audio-capture') {
                    setVoiceNotice('Không tìm thấy thiết bị thu âm (micro). Vui lòng kiểm tra lại micro.');
                } else {
                    setVoiceNotice(`Lỗi nhận diện âm thanh (${event.error}). Vui lòng thử lại.`);
                }
            };
            recognition.onresult = (event: SpeechEvent) => {
                const transcript = event.results[0]?.[0]?.transcript;
                if (transcript) {
                    setInput(transcript);
                    setVoiceNotice(`Đã thu âm: "${transcript}". Bạn có thể nhấn Gửi hoặc nhờ AI nhận xét phát âm!`);
                }
            };
            recognition.start();
        } catch {
            setIsListening(false);
            setVoiceNotice('Không thể kích hoạt microphone. Vui lòng thử lại.');
        }
    }

    const PROMPT_SUGGESTIONS = [
        { label: '👋 Chào hỏi', text: '你好！我正在學習繁體中文，請多指教。' },
        { label: '🧋 Gọi trà sữa', text: '你好！我要一杯珍珠奶茶，半糖微冰。' },
        { label: '🚇 Hỏi ga MRT', text: '請問最近的捷運站在哪裡？' },
        { label: '💰 Hỏi giá tiền', text: '老闆，這個多少錢？可以刷悠遊卡嗎？' },
        { label: '🥢 Chợ đêm', text: '請問這附近有推薦的夜市小吃嗎？' },
        { label: '🏠 Thuê nhà', text: '請問這間套房房租一個月多少錢？押金幾個月？' },
        { label: '🏥 Khám bệnh', text: '我有一點發燒和感冒，請問可以掛號看醫生嗎？' },
        { label: '💼 Công sở', text: '經理，這是今天的專案報告，請過目。' }
    ];

    const currentRoleObj = SCENARIO_ROLES.find(r => r.id === activeRole) || SCENARIO_ROLES[0];

    return (
        <section
            className="ai-chat-container panel"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 200px)',
                minHeight: '560px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px',
                border: '1px solid var(--border-strong)',
                background: 'var(--ivory-surface)'
            }}
        >
            {/* Chat Header Bar */}
            <div
                style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'rgba(250, 250, 247, 0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--vermilion-cinnabar), #e11d48)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(200, 50, 43, 0.25)',
                            flexShrink: 0
                        }}
                    >
                        <Bot size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                                Trợ lý Đối thoại AI (Hán ngữ Đài Loan)
                            </h2>
                            <button
                                type="button"
                                onClick={toggleModel}
                                style={{
                                    border: 'none',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: activeModel === 'gpt-6.1-sol' ? 'var(--gold-tint)' : 'var(--jade-tint)',
                                    color: activeModel === 'gpt-6.1-sol' ? 'var(--gold-dark, #b45309)' : 'var(--jade-emerald)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Nhấp để chuyển đổi giữa GPT-6.1 Sol và DeepSeek V4 Flash"
                            >
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: activeModel === 'gpt-6.1-sol' ? '#d97706' : 'var(--jade-emerald)'
                                    }}
                                />
                                <span>AgentRouter: {activeModel}</span>
                                <span style={{ fontSize: '9px', opacity: 0.7 }}>⇄</span>
                            </button>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                            Tự động phản hồi bằng Phồn thể ‧ Phiên âm Pinyin ‧ Dịch nghĩa tiếng Việt ‧ Sửa lỗi ngữ pháp
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                        style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'var(--surface-container)',
                            color: 'var(--vermilion-cinnabar)',
                            fontWeight: 600
                        }}
                    >
                        🎭 {currentRoleObj.label}
                    </span>
                    <button
                        type="button"
                        onClick={() => switchRole(SCENARIO_ROLES[0])}
                        className="filter-button"
                        style={{ fontSize: '12px', padding: '5px 10px', height: 'auto' }}
                        title="Bắt đầu hội thoại mới"
                    >
                        <RefreshCw size={13} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* AI Roleplay Scenario Selector Ribbon */}
            <div
                style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'rgba(245, 245, 240, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    WebkitOverflowScrolling: 'touch',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                <span
                    style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--on-surface-variant)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <Sparkles size={13} color="var(--vermilion-cinnabar)" /> Nhập vai AI:
                </span>
                {SCENARIO_ROLES.map(role => {
                    const active = activeRole === role.id;
                    return (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => switchRole(role)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                border: `1px solid ${active ? 'var(--vermilion-cinnabar)' : 'var(--border-subtle)'}`,
                                background: active ? 'var(--vermilion-cinnabar)' : 'var(--ivory-surface)',
                                color: active ? '#ffffff' : 'var(--on-surface)',
                                fontSize: '11px',
                                fontWeight: active ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                            }}
                        >
                            {role.label}
                        </button>
                    );
                })}
            </div>

            {voiceNotice && (
                <div
                    role="status"
                    style={{
                        padding: '8px 16px',
                        background: 'var(--gold-tint)',
                        borderBottom: '1px solid rgba(217, 119, 6, 0.25)',
                        fontSize: '12px',
                        color: 'var(--on-surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        boxSizing: 'border-box',
                        maxWidth: '100%'
                    }}
                >
                    <span style={{ wordBreak: 'break-word' }}>🎙️ {voiceNotice}</span>
                    <button
                        type="button"
                        onClick={() => setVoiceNotice(null)}
                        aria-label="Đóng thông báo"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: 'var(--on-surface-variant)',
                            flexShrink: 0
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Chat Message Scroll Area */}
            <div
                ref={chatMessagesRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                        <div
                            key={m.id || idx}
                            style={{
                                display: 'flex',
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                                gap: '10px',
                                maxWidth: '100%',
                                boxSizing: 'border-box'
                            }}
                        >
                            {!isUser && (
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--vermilion-cinnabar)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        flexShrink: 0
                                    }}
                                >
                                    中
                                </div>
                            )}

                            <div
                                style={{
                                    maxWidth: '85%',
                                    padding: '14px 18px',
                                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                    background: isUser ? 'var(--vermilion-cinnabar)' : 'var(--surface-container-low)',
                                    color: isUser ? '#ffffff' : 'var(--on-surface)',
                                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {isUser ? (
                                    <p style={{ margin: 0, fontWeight: 500 }}>{m.content}</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {/* Status & Provider Badge */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                marginBottom: '4px',
                                                flexWrap: 'wrap'
                                            }}
                                        >
                                            {m.mode === 'ai' ? (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                                        color: '#059669',
                                                        fontSize: '11px',
                                                        fontWeight: 700
                                                    }}
                                                    title={`Phản hồi trực tuyến từ mô hình ${m.model || activeModel} (${m.provider || 'AgentRouter'})`}
                                                >
                                                    <span
                                                        style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background: '#10b981'
                                                        }}
                                                    />
                                                    <span>[Trực tuyến - {m.model || activeModel}]</span>
                                                    {typeof m.latencyMs === 'number' && m.latencyMs > 0 && (
                                                        <span style={{ opacity: 0.8, fontSize: '10px', fontWeight: 500 }}>
                                                            ({(m.latencyMs / 1000).toFixed(1)}s)
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(99, 102, 241, 0.12)',
                                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                                        color: '#4338ca',
                                                        fontSize: '11px',
                                                        fontWeight: 700
                                                    }}
                                                    title="Gia sư Hán học cục bộ chuẩn TOCFL Đài Loan (Không tiêu tốn token mạng)"
                                                >
                                                    <span
                                                        style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background: '#6366f1'
                                                        }}
                                                    />
                                                    <span>[Gia sư hướng dẫn cục bộ]</span>
                                                </span>
                                            )}

                                            {m.status === 'canceled' && (
                                                <span
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#be123c',
                                                        fontWeight: 600,
                                                        background: '#fff1f2',
                                                        border: '1px solid #fecdd3',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    Đã hủy
                                                </span>
                                            )}
                                        </div>

                                        {/* Guidance Note for Local Fallback */}
                                        {m.mode === 'guided' && m.guidanceNote && (
                                            <div
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(99, 102, 241, 0.08)',
                                                    borderLeft: '3px solid #6366f1',
                                                    fontSize: '11.5px',
                                                    color: 'var(--on-surface-variant)',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '6px',
                                                    lineHeight: '1.4'
                                                }}
                                            >
                                                <span style={{ fontSize: '12px' }}>💡</span>
                                                <span>{m.guidanceNote}</span>
                                            </div>
                                        )}

                                        {/* Content Lines */}
                                        {m.content
                                            .split('\n')
                                            .filter(Boolean)
                                            .map((line, lIdx) => {
                                                const clean = line.replace(/^\*\*|\*\*$/g, '').trim();
                                                const isZhHeader =
                                                    clean.startsWith('中文：') ||
                                                    clean.startsWith('中文:') ||
                                                    (lIdx === 0 &&
                                                        /[\u4e00-\u9fa5]/.test(clean) &&
                                                        !clean.includes('Pinyin') &&
                                                        !clean.includes('Tiếng Việt'));

                                                if (isZhHeader) {
                                                    const zh = clean
                                                        .replace(/^中文[：:]\s*/, '')
                                                        .replace(/^\*\*|\*\*$/g, '')
                                                        .trim();
                                                    return (
                                                        <div
                                                            key={lIdx}
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '10px',
                                                                    flexWrap: 'wrap'
                                                                }}
                                                            >
                                                                <h3
                                                                    lang="zh-TW"
                                                                    style={{
                                                                        margin: 0,
                                                                        fontSize: '18px',
                                                                        fontWeight: 700,
                                                                        color: 'var(--vermilion-cinnabar)',
                                                                        fontFamily: 'var(--font-serif)',
                                                                        wordBreak: 'break-word'
                                                                    }}
                                                                >
                                                                    {zh}
                                                                </h3>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        flexWrap: 'wrap'
                                                                    }}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="icon-button"
                                                                        onClick={() => speakChinese(zh, 0.92)}
                                                                        title="Nghe phát âm chuẩn tự nhiên (1.0x)"
                                                                        style={{
                                                                            padding: '4px 8px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            fontSize: '11px',
                                                                            borderRadius: '6px',
                                                                            background: 'var(--surface-container)'
                                                                        }}
                                                                    >
                                                                        <Volume2 size={14} />
                                                                        <span>Chuẩn</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="icon-button"
                                                                        onClick={() => speakChineseSlow(zh)}
                                                                        title="Nghe phát âm chậm (0.7x) để bắt chước khẩu hình"
                                                                        style={{
                                                                            padding: '4px 8px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            fontSize: '11px',
                                                                            borderRadius: '6px',
                                                                            background: 'var(--surface-container)'
                                                                        }}
                                                                    >
                                                                        <span>🐢 Chậm</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="icon-button"
                                                                        onClick={() => {
                                                                            setInput(zh);
                                                                            setVoiceNotice(
                                                                                `Đã nạp câu "${zh}". Hãy bấm biểu tượng Micro bên dưới để nói thử!`
                                                                            );
                                                                        }}
                                                                        title="Luyện đọc câu này với Micro"
                                                                        style={{
                                                                            padding: '4px 8px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            fontSize: '11px',
                                                                            borderRadius: '6px',
                                                                            background: 'var(--vermilion-tint)',
                                                                            color: 'var(--vermilion-cinnabar)'
                                                                        }}
                                                                    >
                                                                        <Mic size={13} />
                                                                        <span>Luyện đọc</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (clean.startsWith('Pinyin:') || clean.startsWith('Pinyin：')) {
                                                    return (
                                                        <p
                                                            key={lIdx}
                                                            style={{
                                                                margin: 0,
                                                                fontSize: '13px',
                                                                color: 'var(--tone-1)',
                                                                fontWeight: 500,
                                                                fontFamily: 'monospace'
                                                            }}
                                                        >
                                                            {clean}
                                                        </p>
                                                    );
                                                }

                                                if (
                                                    clean.startsWith('Tiếng Việt:') ||
                                                    clean.startsWith('Tiếng Việt：')
                                                ) {
                                                    return (
                                                        <p
                                                            key={lIdx}
                                                            style={{
                                                                margin: 0,
                                                                fontSize: '13px',
                                                                color: 'var(--on-surface)',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {clean}
                                                        </p>
                                                    );
                                                }

                                                if (
                                                    clean.startsWith('練習：') ||
                                                    clean.startsWith('練習:') ||
                                                    clean.startsWith('Gợi ý:')
                                                ) {
                                                    return (
                                                        <div
                                                            key={lIdx}
                                                            style={{
                                                                marginTop: '4px',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                background: 'var(--gold-tint)',
                                                                fontSize: '12px',
                                                                color: 'var(--on-surface)',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Bấm để đưa câu này vào khung chat"
                                                            onClick={() => {
                                                                const quoteMatch = clean.match(/["“「](.+?)["”」]/);
                                                                if (quoteMatch && quoteMatch[1]) {
                                                                    setInput(quoteMatch[1]);
                                                                }
                                                            }}
                                                        >
                                                            💡 {clean}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <p key={lIdx} style={{ margin: 0 }}>
                                                        {clean}
                                                    </p>
                                                );
                                            })}

                                        {/* Retry Button for Canceled Messages */}
                                        {m.status === 'canceled' && m.retryText && (
                                            <div style={{ marginTop: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetry(m.id, m.retryText!)}
                                                    disabled={loading}
                                                    className="button"
                                                    style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        background: 'var(--surface-container)',
                                                        color: 'var(--vermilion-cinnabar)',
                                                        border: '1px solid var(--border-subtle)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <RotateCcw size={13} />
                                                    <span>Thử lại câu vừa hủy</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Loading indicator with visible Cancel Request Button */}
                {loading && (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: 'var(--surface-container-low)',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '100%',
                            fontSize: '13px',
                            flexWrap: 'wrap',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'var(--vermilion-cinnabar)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    flexShrink: 0
                                }}
                            >
                                中
                            </div>
                            <span
                                style={{
                                    fontStyle: 'italic',
                                    color: 'var(--on-surface-variant)',
                                    wordBreak: 'break-word'
                                }}
                            >
                                AI đối thoại đang soạn câu trả lời chuẩn Phồn thể... ⏳
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelRequest}
                            className="button"
                            style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#be123c',
                                borderColor: '#fda4af',
                                background: '#fff1f2',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                flexShrink: 0
                            }}
                            title="Hủy yêu cầu đối thoại này"
                        >
                            <X size={14} />
                            <span>Hủy yêu cầu</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Prompt Chips */}
            <div
                style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'rgba(250, 250, 247, 0.5)',
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    WebkitOverflowScrolling: 'touch',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                {PROMPT_SUGGESTIONS.map((p, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => void handleSend(p.text)}
                        disabled={loading}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--ivory-surface)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--on-surface)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* AI Pronunciation Evaluation Shortcut */}
            {input.trim() && (
                <div
                    style={{
                        padding: '6px 16px',
                        background: 'rgba(200, 50, 43, 0.06)',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                        boxSizing: 'border-box',
                        maxWidth: '100%'
                    }}
                >
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        🎯 Luyện phát âm: Nhờ AI đối thoại nhận xét âm điệu của câu bạn vừa gõ/thu âm
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            void handleSend(
                                `我正在練習這句繁體中文發音：「${input.trim()}」。請幫我檢查發音要點、聲調與給予評分建議。`
                            )
                        }
                        disabled={loading}
                        style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: 'none',
                            background: 'var(--vermilion-cinnabar)',
                            color: '#ffffff',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        <Sparkles size={12} />
                        <span>Nhờ AI sửa & chấm phát âm</span>
                    </button>
                </div>
            )}

            {/* Message Input Box */}
            <form
                onSubmit={e => {
                    e.preventDefault();
                    void handleSend();
                }}
                style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--ivory-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                <button
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label={isListening ? 'Dừng ghi âm' : 'Nói tiếng Trung bằng micro'}
                    title={isListening ? 'Đang lắng nghe... bấm để dừng' : 'Bấm để nói tiếng Trung'}
                    disabled={loading}
                    style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isListening ? '#e11d48' : 'var(--surface-container-low)',
                        color: isListening ? '#ffffff' : 'var(--on-surface-variant)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={
                        loading
                            ? 'Đang gửi yêu cầu... bấm "Hủy yêu cầu" nếu muốn dừng'
                            : 'Gõ câu tiếng Trung hoặc tiếng Việt (vd: Tôi muốn thuê xe máy / 請問捷運站在哪裡？)...'
                    }
                    disabled={loading}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 16px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-strong)',
                        background: loading ? 'var(--surface-container)' : 'var(--surface-container-low)',
                        fontSize: '14px',
                        color: 'var(--on-surface)',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />

                {loading ? (
                    <button
                        type="button"
                        onClick={handleCancelRequest}
                        className="button"
                        style={{
                            padding: '10px 16px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            background: '#fff1f2',
                            color: '#be123c',
                            border: '1px solid #fecdd3',
                            cursor: 'pointer',
                            fontWeight: 600,
                            flexShrink: 0
                        }}
                        title="Bấm để hủy yêu cầu đang chờ"
                    >
                        <span>Hủy yêu cầu</span>
                        <X size={15} />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="button button-primary"
                        style={{
                            padding: '10px 18px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            flexShrink: 0
                        }}
                    >
                        <span>Gửi</span>
                        <Send size={15} />
                    </button>
                )}
            </form>
        </section>
    );
}
