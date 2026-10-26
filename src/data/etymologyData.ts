export interface CharacterDecomposition {
    char: string;
    pinyin: string;
    sinoViet: string;
    meaning: string;
    ruleNote?: string;
    radical?: string;
    strokes?: number;
}

export interface WordEtymology {
    wordId: string;
    sinoViet: string;
    radical: string;
    radicalName: string;
    strokes: number;
    toneClass: string;
    cognateTip: string;
    decomposition: CharacterDecomposition[];
}

export interface StarterDeck {
    id: string;
    titleZh: string;
    titleVi: string;
    badge: string;
    badgeClass: 'badge-vermilion' | 'badge-jade' | 'badge-gold' | 'badge-neutral';
    desc: string;
    lessonIds: string[];
    wordIds: string[];
    title?: string;
    subtitle?: string;
    icon?: string;
}

export interface DailyRadical {
    dayOfWeek: number;
    radical: string;
    kangxiIndex: number;
    strokes: number;
    pinyin: string;
    sinoViet: string;
    pictographMeaning: string;
    associatedWords: {
        hanzi: string;
        pinyin: string;
        sinoViet: string;
        meaning: string;
    }[];
}

export const etymologyMap: Record<string, WordEtymology> = {
    'lesson-1-word-1': {
        wordId: 'lesson-1-word-1',
        sinoViet: 'NHĨ HẢO',
        radical: '亻',
        radicalName: 'Bộ Nhân #9 · 2 nét',
        strokes: 7,
        toneClass: 'Thanh 3 ˇ (Biến điệu 2 ↗ + 3 ˇ)',
        cognateTip: 'Quy luật biến điệu Thanh 3: Khi hai thanh 3 đi liền nhau (nǐ + hǎo), chữ đầu đọc thành thanh 2 (ní hǎo).',
        decomposition: [
            { char: '你', pinyin: 'nǐ', sinoViet: 'Nhĩ', meaning: 'Bạn, ngôi thứ hai', ruleNote: 'N ↔ NH (nǐ ➔ nhĩ)' },
            { char: '好', pinyin: 'hǎo', sinoViet: 'Hảo', meaning: 'Tốt, khỏe, lành', ruleNote: 'H ↔ H (hǎo ➔ hảo)' }
        ]
    },
    'lesson-1-word-2': {
        wordId: 'lesson-1-word-2',
        sinoViet: 'TẠ TẠ',
        radical: '言',
        radicalName: 'Bộ Ngôn #149 · 7 nét',
        strokes: 17,
        toneClass: 'Thanh 4 ˋ + Thanh nhẹ',
        cognateTip: 'Phụ âm X- trong Pinyin thường ứng với âm T- hoặc X- trong Hán-Việt (xiè ➔ tạ, đa tạ, cảm tạ).',
        decomposition: [
            { char: '謝', pinyin: 'xiè', sinoViet: 'Tạ', meaning: 'Cảm tạ, biết ơn', ruleNote: 'X ↔ T (xiè ➔ tạ)' }
        ]
    },
    'lesson-1-word-3': {
        wordId: 'lesson-1-word-3',
        sinoViet: 'DANH TỰ',
        radical: '口',
        radicalName: 'Bộ Khẩu #30 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 2 ↗ + Thanh nhẹ',
        cognateTip: 'M ↔ D/M (míng ➔ danh: danh tính, họ tên); Z ↔ T (zì ➔ tự: chữ viết, tên tự).',
        decomposition: [
            { char: '名', pinyin: 'míng', sinoViet: 'Danh', meaning: 'Tên gọi, danh tiếng', ruleNote: 'M ↔ D (míng ➔ danh)' },
            { char: '字', pinyin: 'zi', sinoViet: 'Tự', meaning: 'Chữ viết, tên chữ', ruleNote: 'Z ↔ T (zì ➔ tự)' }
        ]
    },
    'lesson-1-word-4': {
        wordId: 'lesson-1-word-4',
        sinoViet: 'VIỆT NAM',
        radical: '走',
        radicalName: 'Bộ Tẩu #156 · 7 nét',
        strokes: 12,
        toneClass: 'Thanh 4 ˋ + Thanh 2 ↗',
        cognateTip: 'Yuè ➔ Việt (vượt qua, bách Việt); Nán ➔ Nam (phương Nam). Tương ứng 100% âm Hán-Việt.',
        decomposition: [
            { char: '越', pinyin: 'Yuè', sinoViet: 'Việt', meaning: 'Vượt qua, nước Việt', ruleNote: 'Y ↔ V (yuè ➔ việt)' },
            { char: '南', pinyin: 'nán', sinoViet: 'Nam', meaning: 'Phương Nam', ruleNote: 'N ↔ N (nán ➔ nam)' }
        ]
    },
    'lesson-1-word-5': {
        wordId: 'lesson-1-word-5',
        sinoViet: 'HẨN CAO HỨNG',
        radical: '彳',
        radicalName: 'Bộ Xích #60 · 3 nét',
        strokes: 9,
        toneClass: 'Thanh 3 ˇ + Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Gāoxìng ➔ Cao hứng (hứng khởi, vui mừng). Người Việt dùng nguyên từ Hán-Việt "cao hứng"!',
        decomposition: [
            { char: '高', pinyin: 'gāo', sinoViet: 'Cao', meaning: 'Cao ráo, dâng cao', ruleNote: 'G ↔ C (gāo ➔ cao)' },
            { char: '興', pinyin: 'xìng', sinoViet: 'Hứng', meaning: 'Hứng thú, vui vẻ', ruleNote: 'X ↔ H (xìng ➔ hứng)' }
        ]
    },
    'lesson-2-word-1': {
        wordId: 'lesson-2-word-1',
        sinoViet: 'TRÂN CHÂU NÃI TRÀ',
        radical: '玉',
        radicalName: 'Bộ Ngọc #96 · 5 nét',
        strokes: 10,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ + Thanh 3 ˇ + Thanh 2 ↗',
        cognateTip: 'ZH ↔ TR/CH: zhēn ➔ trân; zhū ➔ châu; nǎi ➔ nãi (sữa); chá ➔ trà. Ghép sát 100% âm Hán-Việt!',
        decomposition: [
            { char: '珍', pinyin: 'zhēn', sinoViet: 'Trân', meaning: 'Quý giá (trân quý)', ruleNote: 'ZH ↔ TR' },
            { char: '珠', pinyin: 'zhū', sinoViet: 'Châu', meaning: 'Hạt ngọc (châu báu)', ruleNote: 'ZH ↔ CH' },
            { char: '奶', pinyin: 'nǎi', sinoViet: 'Nãi', meaning: 'Sữa', ruleNote: 'N ↔ N' },
            { char: '茶', pinyin: 'chá', sinoViet: 'Trà', meaning: 'Trà, chè', ruleNote: 'CH ↔ TR' }
        ]
    },
    'lesson-2-word-2': {
        wordId: 'lesson-2-word-2',
        sinoViet: 'THIỂU BĂNG',
        radical: '小',
        radicalName: 'Bộ Tiểu #42 · 3 nét',
        strokes: 4,
        toneClass: 'Thanh 3 ˇ + Thanh 1 ˉ',
        cognateTip: 'SH ↔ TH (shǎo ➔ thiểu: tối thiểu, thiểu số = ít); B ↔ B (bīng ➔ băng: nước đá, băng giá).',
        decomposition: [
            { char: '少', pinyin: 'shǎo', sinoViet: 'Thiểu', meaning: 'Ít (thiểu số)', ruleNote: 'SH ↔ TH' },
            { char: '冰', pinyin: 'bīng', sinoViet: 'Băng', meaning: 'Nước đá, băng tuyết', ruleNote: 'B ↔ B' }
        ]
    },
    'lesson-2-word-3': {
        wordId: 'lesson-2-word-3',
        sinoViet: 'BÁN ĐƯỜNG',
        radical: '十',
        radicalName: 'Bộ Thập #24 · 2 nét',
        strokes: 5,
        toneClass: 'Thanh 4 ˋ + Thanh 2 ↗',
        cognateTip: 'Bàn ➔ Bán (một nửa: bán cầu, bán đảo); Táng ➔ Đường (kẹo đường, đường phèn).',
        decomposition: [
            { char: '半', pinyin: 'bàn', sinoViet: 'Bán', meaning: 'Một nửa (50%)', ruleNote: 'B ↔ B (bàn ➔ bán)' },
            { char: '糖', pinyin: 'táng', sinoViet: 'Đường', meaning: 'Đường ngọt', ruleNote: 'T ↔ Đ (táng ➔ đường)' }
        ]
    },
    'lesson-2-word-4': {
        wordId: 'lesson-2-word-4',
        sinoViet: 'NHẤT BÔI',
        radical: '木',
        radicalName: 'Bộ Mộc #75 · 4 nét',
        strokes: 8,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ',
        cognateTip: 'Yī ➔ Nhất (một); Bēi ➔ Bôi (chiếc cốc/ly: giao bôi, cạn bôi).',
        decomposition: [
            { char: '一', pinyin: 'yì', sinoViet: 'Nhất', meaning: 'Số một', ruleNote: 'Y ↔ NH' },
            { char: '杯', pinyin: 'bēi', sinoViet: 'Bôi', meaning: 'Ly, tách, cốc', ruleNote: 'B ↔ B (bēi ➔ bôi)' }
        ]
    },
    'lesson-2-word-5': {
        wordId: 'lesson-2-word-5',
        sinoViet: 'NGOẠI ĐỚI',
        radical: '夕',
        radicalName: 'Bộ Tịch #36 · 3 nét',
        strokes: 5,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Wài ➔ Ngoại (bên ngoài); Dài ➔ Đới (mang theo, đới theo). Ngoại đới = mua mang đi!',
        decomposition: [
            { char: '外', pinyin: 'wài', sinoViet: 'Ngoại', meaning: 'Bên ngoài', ruleNote: 'W ↔ NG' },
            { char: '帶', pinyin: 'dài', sinoViet: 'Đới', meaning: 'Mang theo, đem đi', ruleNote: 'D ↔ Đ' }
        ]
    },
    'lesson-3-word-1': {
        wordId: 'lesson-3-word-1',
        sinoViet: 'TIỆP VẬN',
        radical: '辶',
        radicalName: 'Bộ Sước #162 · 7 nét',
        strokes: 11,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Jié ➔ Tiệp (nhanh nhẹn, tốc độ); Yùn ➔ Vận (vận chuyển). Tiệp vận là Hệ thống tàu điện nhanh MRT Đài Loan.',
        decomposition: [
            { char: '捷', pinyin: 'jié', sinoViet: 'Tiệp', meaning: 'Nhanh chóng', ruleNote: 'J ↔ T (jié ➔ tiệp)' },
            { char: '運', pinyin: 'yùn', sinoViet: 'Vận', meaning: 'Vận chuyển, đi lại', ruleNote: 'Y ↔ V (yùn ➔ vận)' }
        ]
    },
    'lesson-3-word-2': {
        wordId: 'lesson-3-word-2',
        sinoViet: 'XA TRẠM',
        radical: '車',
        radicalName: 'Bộ Xa #159 · 7 nét',
        strokes: 7,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Chē ➔ Xa (xe cộ: hỏa xa); Zhàn ➔ Trạm (trạm dừng, nhà ga).',
        decomposition: [
            { char: '車', pinyin: 'chē', sinoViet: 'Xa', meaning: 'Xe, tàu', ruleNote: 'CH ↔ X (chē ➔ xa)' },
            { char: '站', pinyin: 'zhàn', sinoViet: 'Trạm', meaning: 'Nhà ga, trạm dừng', ruleNote: 'ZH ↔ TR (zhàn ➔ trạm)' }
        ]
    },
    'lesson-3-word-3': {
        wordId: 'lesson-3-word-3',
        sinoViet: 'DU DU TẠP',
        radical: '心',
        radicalName: 'Bộ Tâm #61 · 4 nét',
        strokes: 11,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗ + Thanh 3 ˇ',
        cognateTip: 'Yōuyóu ➔ Du du (thong dong chu du); Kǎ ➔ Tạp (thẻ card). Tên tiếng Hoa của thẻ EasyCard Đài Loan.',
        decomposition: [
            { char: '悠', pinyin: 'yōu', sinoViet: 'Du', meaning: 'Thong thả, ung dung', ruleNote: 'Y ↔ D' },
            { char: '遊', pinyin: 'yóu', sinoViet: 'Du', meaning: 'Du lịch, đi lại', ruleNote: 'Y ↔ D' },
            { char: '卡', pinyin: 'kǎ', sinoViet: 'Tạp', meaning: 'Thẻ từ (Card)', ruleNote: 'K ↔ T/C' }
        ]
    },
    'lesson-3-word-4': {
        wordId: 'lesson-3-word-4',
        sinoViet: 'XUẤT KHẨU',
        radical: '口',
        radicalName: 'Bộ Khẩu #30 · 3 nét',
        strokes: 5,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ',
        cognateTip: 'Chū ➔ Xuất (đi ra); Kǒu ➔ Khẩu (cửa, miệng). Xuất khẩu trong giao thông nghĩa là Lối ra (Exit).',
        decomposition: [
            { char: '出', pinyin: 'chū', sinoViet: 'Xuất', meaning: 'Đi ra ngoài', ruleNote: 'CH ↔ X' },
            { char: '口', pinyin: 'kǒu', sinoViet: 'Khẩu', meaning: 'Cửa, lối thông', ruleNote: 'K ↔ KH' }
        ]
    },
    'lesson-3-word-5': {
        wordId: 'lesson-3-word-5',
        sinoViet: 'CHUYỂN XA',
        radical: '車',
        radicalName: 'Bộ Xa #159 · 7 nét',
        strokes: 18,
        toneClass: 'Thanh 3 ˇ + Thanh 1 ˉ',
        cognateTip: 'Zhuǎn ➔ Chuyển (đổi hướng, trung chuyển); Chē ➔ Xa (tàu/xe). Chuyển xa = Đổi tuyến tàu/xe.',
        decomposition: [
            { char: '轉', pinyin: 'zhuǎn', sinoViet: 'Chuyển', meaning: 'Chuyển đổi', ruleNote: 'ZH ↔ CH' },
            { char: '車', pinyin: 'chē', sinoViet: 'Xa', meaning: 'Tàu, xe', ruleNote: 'CH ↔ X' }
        ]
    },
    'lesson-4-word-1': {
        wordId: 'lesson-4-word-1',
        sinoViet: 'DẠ THỊ',
        radical: '夕',
        radicalName: 'Bộ Tịch #36 · 3 nét',
        strokes: 8,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Yè ➔ Dạ (ban đêm: dạ tiệc); Shì ➔ Thị (chợ: siêu thị, thị trường). Dạ thị = Chợ đêm!',
        decomposition: [
            { char: '夜', pinyin: 'yè', sinoViet: 'Dạ', meaning: 'Ban đêm', ruleNote: 'Y ↔ D (yè ➔ dạ)' },
            { char: '市', pinyin: 'shì', sinoViet: 'Thị', meaning: 'Chợ, phố thị', ruleNote: 'SH ↔ TH (shì ➔ thị)' }
        ]
    },
    'lesson-4-word-2': {
        wordId: 'lesson-4-word-2',
        sinoViet: 'NGƯU NHỤC MIẾN',
        radical: '牛',
        radicalName: 'Bộ Ngưu #93 · 4 nét',
        strokes: 4,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Niú ➔ Ngưu (bò); Ròu ➔ Nhục (thịt); Miàn ➔ Miến/Mì. Món mì bò quốc dân của Đài Loan.',
        decomposition: [
            { char: '牛', pinyin: 'niú', sinoViet: 'Ngưu', meaning: 'Bò, trâu', ruleNote: 'N ↔ NG' },
            { char: '肉', pinyin: 'ròu', sinoViet: 'Nhục', meaning: 'Thịt', ruleNote: 'R ↔ NH' },
            { char: '麵', pinyin: 'miàn', sinoViet: 'Miến', meaning: 'Mì sợi', ruleNote: 'M ↔ M' }
        ]
    },
    'lesson-4-word-3': {
        wordId: 'lesson-4-word-3',
        sinoViet: 'BẤT YẾU LẠT',
        radical: '辛',
        radicalName: 'Bộ Tân #160 · 7 nét',
        strokes: 14,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Bú yào ➔ Bất yếu (đừng, không cần); Là ➔ Lạt (vị cay nồng).',
        decomposition: [
            { char: '不', pinyin: 'bú', sinoViet: 'Bất', meaning: 'Không', ruleNote: 'B ↔ B' },
            { char: '要', pinyin: 'yào', sinoViet: 'Yếu', meaning: 'Muốn, cần', ruleNote: 'Y ↔ Y' },
            { char: '辣', pinyin: 'là', sinoViet: 'Lạt', meaning: 'Cay', ruleNote: 'L ↔ L' }
        ]
    },
    'lesson-4-word-4': {
        wordId: 'lesson-4-word-4',
        sinoViet: 'ĐA THIỂU TIỀN',
        radical: '金',
        radicalName: 'Bộ Kim #167 · 8 nét',
        strokes: 16,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ + Thanh 2 ↗',
        cognateTip: 'Duōshǎo ➔ Đa thiểu (nhiều hay ít = bao nhiêu); Qián ➔ Tiền (tiền bạc).',
        decomposition: [
            { char: '多', pinyin: 'duō', sinoViet: 'Đa', meaning: 'Nhiều', ruleNote: 'D ↔ Đ' },
            { char: '少', pinyin: 'shǎo', sinoViet: 'Thiểu', meaning: 'Ít', ruleNote: 'SH ↔ TH' },
            { char: '錢', pinyin: 'qián', sinoViet: 'Tiền', meaning: 'Tiền tệ', ruleNote: 'Q ↔ T' }
        ]
    },
    'lesson-4-word-5': {
        wordId: 'lesson-4-word-5',
        sinoViet: 'HẢO KHẤT',
        radical: '口',
        radicalName: 'Bộ Khẩu #30 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 3 ˇ + Thanh 1 ˉ',
        cognateTip: 'Hǎo ➔ Hảo (tốt, ngon); Chī ➔ Khất (ăn). Ghép lại nghĩa là ăn rất ngon!',
        decomposition: [
            { char: '好', pinyin: 'hǎo', sinoViet: 'Hảo', meaning: 'Tốt, hay, ngon', ruleNote: 'H ↔ H' },
            { char: '吃', pinyin: 'chī', sinoViet: 'Khất', meaning: 'Ăn uống', ruleNote: 'CH ↔ KH' }
        ]
    },
    'lesson-5-word-1': {
        wordId: 'lesson-5-word-1',
        sinoViet: 'TIỆN LỢI THƯƠNG ĐIẾM',
        radical: '亻',
        radicalName: 'Bộ Nhân #9 · 2 nét',
        strokes: 9,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ + Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Biànlì ➔ Tiện lợi; Shāngdiàn ➔ Thương điếm (cửa hàng buôn bán). Trùng khớp 100% Hán-Việt!',
        decomposition: [
            { char: '便', pinyin: 'biàn', sinoViet: 'Tiện', meaning: 'Thuận tiện', ruleNote: 'B ↔ T' },
            { char: '利', pinyin: 'lì', sinoViet: 'Lợi', meaning: 'Ích lợi, nhanh nhạy', ruleNote: 'L ↔ L' },
            { char: '商', pinyin: 'shāng', sinoViet: 'Thương', meaning: 'Buôn bán (thương mại)', ruleNote: 'SH ↔ TH' },
            { char: '店', pinyin: 'diàn', sinoViet: 'Điếm', meaning: 'Cửa tiệm, quán', ruleNote: 'D ↔ Đ' }
        ]
    },
    'lesson-5-word-2': {
        wordId: 'lesson-5-word-2',
        sinoViet: 'ĐẠI TỬ',
        radical: '衣',
        radicalName: 'Bộ Y #145 · 6 nét',
        strokes: 11,
        toneClass: 'Thanh 4 ˋ + Thanh nhẹ',
        cognateTip: 'Dài ➔ Đại (bao, túi đựng); Zi ➔ Tử (hậu tố danh từ).',
        decomposition: [
            { char: '袋', pinyin: 'dài', sinoViet: 'Đại', meaning: 'Túi, bao đựng', ruleNote: 'D ↔ Đ' },
            { char: '子', pinyin: 'zi', sinoViet: 'Tử', meaning: 'Hậu tố danh từ', ruleNote: 'Z ↔ T' }
        ]
    },
    'lesson-5-word-3': {
        wordId: 'lesson-5-word-3',
        sinoViet: 'PHÁT PHIẾU',
        radical: '癶',
        radicalName: 'Bộ Bát #105 · 5 nét',
        strokes: 12,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Fā ➔ Phát (phát hành); Piào ➔ Phiếu (vé, hóa đơn). Hóa đơn mua hàng có mã xổ số tại Đài Loan.',
        decomposition: [
            { char: '發', pinyin: 'fā', sinoViet: 'Phát', meaning: 'Phát ra, xuất ra', ruleNote: 'F ↔ PH' },
            { char: '票', pinyin: 'piào', sinoViet: 'Phiếu', meaning: 'Tờ phiếu, hóa đơn', ruleNote: 'P ↔ PH' }
        ]
    },
    'lesson-5-word-4': {
        wordId: 'lesson-5-word-4',
        sinoViet: 'HIỆN KIM',
        radical: '金',
        radicalName: 'Bộ Kim #167 · 8 nét',
        strokes: 8,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ',
        cognateTip: 'Xiàn ➔ Hiện (hiện tại, có sẵn); Jīn ➔ Kim (vàng, tiền). Hiện kim = Tiền mặt!',
        decomposition: [
            { char: '現', pinyin: 'xiàn', sinoViet: 'Hiện', meaning: 'Hiện có, trực tiếp', ruleNote: 'X ↔ H' },
            { char: '金', pinyin: 'jīn', sinoViet: 'Kim', meaning: 'Vàng, tiền bạc', ruleNote: 'J ↔ K' }
        ]
    },
    'lesson-5-word-5': {
        wordId: 'lesson-5-word-5',
        sinoViet: 'SOÁT TẠP',
        radical: '刀',
        radicalName: 'Bộ Đao #18 · 2 nét',
        strokes: 8,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ',
        cognateTip: 'Shuā ➔ Soát (quét, chải); Kǎ ➔ Tạp (thẻ). Quẹt thẻ thanh toán.',
        decomposition: [
            { char: '刷', pinyin: 'shuā', sinoViet: 'Soát', meaning: 'Quẹt, quét qua', ruleNote: 'SH ↔ S' },
            { char: '卡', pinyin: 'kǎ', sinoViet: 'Tạp', meaning: 'Thẻ ngân hàng / thẻ từ', ruleNote: 'K ↔ T' }
        ]
    },
    'lesson-6-word-1': {
        wordId: 'lesson-6-word-1',
        sinoViet: 'TÔ PHÒNG TỬ',
        radical: '禾',
        radicalName: 'Bộ Hòa #115 · 5 nét',
        strokes: 10,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗ + Thanh nhẹ',
        cognateTip: 'Zū ➔ Tô (thuê mướn, tiền tô); Fángzi ➔ Phòng tử (căn nhà/phòng).',
        decomposition: [
            { char: '租', pinyin: 'zū', sinoViet: 'Tô', meaning: 'Thuê mướn', ruleNote: 'Z ↔ T' },
            { char: '房', pinyin: 'fáng', sinoViet: 'Phòng', meaning: 'Nhà cửa, căn phòng', ruleNote: 'F ↔ PH' },
            { char: '子', pinyin: 'zi', sinoViet: 'Tử', meaning: 'Hậu tố danh từ', ruleNote: 'Z ↔ T' }
        ]
    },
    'lesson-6-word-2': {
        wordId: 'lesson-6-word-2',
        sinoViet: 'PHÒNG TÔ',
        radical: '戶',
        radicalName: 'Bộ Hộ #63 · 4 nét',
        strokes: 8,
        toneClass: 'Thanh 2 ↗ + Thanh 1 ˉ',
        cognateTip: 'Fáng ➔ Phòng (nhà); Zū ➔ Tô (tiền thuê). Đảo ngược từ "租房" (thuê nhà) thành "房租" (tiền thuê nhà).',
        decomposition: [
            { char: '房', pinyin: 'fáng', sinoViet: 'Phòng', meaning: 'Căn nhà, phòng ở', ruleNote: 'F ↔ PH' },
            { char: '租', pinyin: 'zū', sinoViet: 'Tô', meaning: 'Tiền thuê', ruleNote: 'Z ↔ T' }
        ]
    },
    'lesson-6-word-3': {
        wordId: 'lesson-6-word-3',
        sinoViet: 'ÁP KIM',
        radical: '扌',
        radicalName: 'Bộ Thủ #64 · 3 nét',
        strokes: 8,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ',
        cognateTip: 'Yā ➔ Áp (thế chấp, giữ làm tin); Jīn ➔ Kim (tiền). Áp kim = Tiền đặt cọc.',
        decomposition: [
            { char: '押', pinyin: 'yā', sinoViet: 'Áp', meaning: 'Thế chấp, đặt cọc', ruleNote: 'Y ↔ Á' },
            { char: '金', pinyin: 'jīn', sinoViet: 'Kim', meaning: 'Tiền bạc', ruleNote: 'J ↔ K' }
        ]
    },
    'lesson-6-word-4': {
        wordId: 'lesson-6-word-4',
        sinoViet: 'THỦY ĐIỆN PHÍ',
        radical: '水',
        radicalName: 'Bộ Thủy #85 · 4 nét',
        strokes: 4,
        toneClass: 'Thanh 3 ˇ + Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Shuǐ ➔ Thủy (nước); Diàn ➔ Điện; Fèi ➔ Phí (chi phí). Thủy điện phí = Tiền điện nước!',
        decomposition: [
            { char: '水', pinyin: 'shuǐ', sinoViet: 'Thủy', meaning: 'Nước sinh hoạt', ruleNote: 'SH ↔ TH' },
            { char: '電', pinyin: 'diàn', sinoViet: 'Điện', meaning: 'Điện năng', ruleNote: 'D ↔ Đ' },
            { char: '費', pinyin: 'fèi', sinoViet: 'Phí', meaning: 'Chi phí, lệ phí', ruleNote: 'F ↔ PH' }
        ]
    },
    'lesson-6-word-5': {
        wordId: 'lesson-6-word-5',
        sinoViet: 'PHỤ CẬN',
        radical: '辶',
        radicalName: 'Bộ Sước #162 · 7 nét',
        strokes: 8,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Fù ➔ Phụ (bên cạnh); Jìn ➔ Cận (gần: lân cận). Phụ cận = Khu vực gần đây.',
        decomposition: [
            { char: '附', pinyin: 'fù', sinoViet: 'Phụ', meaning: 'Gắn liền, kề bên', ruleNote: 'F ↔ PH' },
            { char: '近', pinyin: 'jìn', sinoViet: 'Cận', meaning: 'Gần (lân cận)', ruleNote: 'J ↔ C' }
        ]
    },
    'lesson-7-word-1': {
        wordId: 'lesson-7-word-1',
        sinoViet: 'QUÁI HÀO',
        radical: '扌',
        radicalName: 'Bộ Thủ #64 · 3 nét',
        strokes: 11,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Guà ➔ Quái (treo, ghi danh); Hào ➔ Hào (số thứ tự). Bốc số đăng ký khám bệnh tại Đài Loan.',
        decomposition: [
            { char: '掛', pinyin: 'guà', sinoViet: 'Quái', meaning: 'Đăng ký, ghi tên', ruleNote: 'G ↔ QU' },
            { char: '號', pinyin: 'hào', sinoViet: 'Hào', meaning: 'Số hiệu, mã số', ruleNote: 'H ↔ H' }
        ]
    },
    'lesson-7-word-2': {
        wordId: 'lesson-7-word-2',
        sinoViet: 'KIỆN BẢO TẠP',
        radical: '亻',
        radicalName: 'Bộ Nhân #9 · 2 nét',
        strokes: 11,
        toneClass: 'Thanh 4 ˋ + Thanh 3 ˇ + Thanh 3 ˇ',
        cognateTip: 'Jiàn ➔ Kiện (sức khỏe: tráng kiện); Bǎo ➔ Bảo (bảo hiểm); Kǎ ➔ Tạp (thẻ). Thẻ Bảo hiểm Y tế Quốc dân Đài Loan.',
        decomposition: [
            { char: '健', pinyin: 'jiàn', sinoViet: 'Kiện', meaning: 'Khỏe mạnh (y tế)', ruleNote: 'J ↔ K' },
            { char: '保', pinyin: 'bǎo', sinoViet: 'Bảo', meaning: 'Bảo hiểm, bảo vệ', ruleNote: 'B ↔ B' },
            { char: '卡', pinyin: 'kǎ', sinoViet: 'Tạp', meaning: 'Thẻ chip', ruleNote: 'K ↔ T' }
        ]
    },
    'lesson-7-word-3': {
        wordId: 'lesson-7-word-3',
        sinoViet: 'ĐẦU THỐNG',
        radical: '頁',
        radicalName: 'Bộ Hiệt #181 · 9 nét',
        strokes: 16,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Tóu ➔ Đầu; Tòng ➔ Thống (đau đớn: thống khổ). Đầu thống = Đau đầu.',
        decomposition: [
            { char: '頭', pinyin: 'tóu', sinoViet: 'Đầu', meaning: 'Cái đầu', ruleNote: 'T ↔ Đ' },
            { char: '痛', pinyin: 'tòng', sinoViet: 'Thống', meaning: 'Đau nhức (bộ Nạch 疒)', ruleNote: 'T ↔ TH' }
        ]
    },
    'lesson-7-word-4': {
        wordId: 'lesson-7-word-4',
        sinoViet: 'PHÁT THIÊU',
        radical: '火',
        radicalName: 'Bộ Hỏa #86 · 4 nét',
        strokes: 16,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ',
        cognateTip: 'Fā ➔ Phát (bốc lên); Shāo ➔ Thiêu (nóng, đốt cháy, có bộ Hỏa 火). Cơ thể phát nóng = Bị sốt!',
        decomposition: [
            { char: '發', pinyin: 'fā', sinoViet: 'Phát', meaning: 'Phát khởi', ruleNote: 'F ↔ PH' },
            { char: '燒', pinyin: 'shāo', sinoViet: 'Thiêu', meaning: 'Nóng sốt, đốt nóng', ruleNote: 'SH ↔ TH' }
        ]
    },
    'lesson-7-word-5': {
        wordId: 'lesson-7-word-5',
        sinoViet: 'BẤT THƯ PHỤC',
        radical: '舌',
        radicalName: 'Bộ Thiệt #135 · 6 nét',
        strokes: 12,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ + Thanh nhẹ',
        cognateTip: 'Shūfu ➔ Thư phục (thư thái, dễ chịu). Thêm 不 (bất) = Không khỏe, khó chịu trong người.',
        decomposition: [
            { char: '不', pinyin: 'bù', sinoViet: 'Bất', meaning: 'Không', ruleNote: 'B ↔ B' },
            { char: '舒', pinyin: 'shū', sinoViet: 'Thư', meaning: 'Thư thái, thoải mái', ruleNote: 'SH ↔ TH' },
            { char: '服', pinyin: 'fu', sinoViet: 'Phục', meaning: 'Thích ứng, dễ chịu', ruleNote: 'F ↔ PH' }
        ]
    },
    'lesson-8-word-1': {
        wordId: 'lesson-8-word-1',
        sinoViet: 'THƯỢNG BAN',
        radical: '一',
        radicalName: 'Bộ Nhất #1 · 1 nét',
        strokes: 3,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ',
        cognateTip: 'Shàng ➔ Thượng (bắt đầu, lên); Bān ➔ Ban (ca làm việc: trực ban). Thượng ban = Đi làm!',
        decomposition: [
            { char: '上', pinyin: 'shàng', sinoViet: 'Thượng', meaning: 'Lên, vào ca', ruleNote: 'SH ↔ TH' },
            { char: '班', pinyin: 'bān', sinoViet: 'Ban', meaning: 'Ca làm việc', ruleNote: 'B ↔ B' }
        ]
    },
    'lesson-8-word-2': {
        wordId: 'lesson-8-word-2',
        sinoViet: 'KHAI HỘI',
        radical: '門',
        radicalName: 'Bộ Môn #169 · 8 nét',
        strokes: 12,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Kāi ➔ Khai (mở ra: khai mạc); Huì ➔ Hội (cuộc họp: hội nghị). Khai hội = Họp hành.',
        decomposition: [
            { char: '開', pinyin: 'kāi', sinoViet: 'Khai', meaning: 'Mở, bắt đầu', ruleNote: 'K ↔ KH' },
            { char: '會', pinyin: 'huì', sinoViet: 'Hội', meaning: 'Cuộc họp, hội họp', ruleNote: 'H ↔ H' }
        ]
    },
    'lesson-8-word-3': {
        wordId: 'lesson-8-word-3',
        sinoViet: 'BANG MANG',
        radical: '巾',
        radicalName: 'Bộ Cân #50 · 3 nét',
        strokes: 17,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗',
        cognateTip: 'Bāng ➔ Bang (trợ giúp: bang trợ); Máng ➔ Mang (việc bận). Bang mang = Giúp đỡ công việc.',
        decomposition: [
            { char: '幫', pinyin: 'bāng', sinoViet: 'Bang', meaning: 'Giúp sức, hỗ trợ', ruleNote: 'B ↔ B' },
            { char: '忙', pinyin: 'máng', sinoViet: 'Mang', meaning: 'Bận rộn', ruleNote: 'M ↔ M' }
        ]
    },
    'lesson-8-word-4': {
        wordId: 'lesson-8-word-4',
        sinoViet: 'THỈNH GIẢ',
        radical: '言',
        radicalName: 'Bộ Ngôn #149 · 7 nét',
        strokes: 15,
        toneClass: 'Thanh 3 ˇ + Thanh 4 ˋ',
        cognateTip: 'Qǐng ➔ Thỉnh (xin phép); Jià ➔ Giả (kỳ nghỉ: hưu giả). Thỉnh giả = Xin nghỉ phép.',
        decomposition: [
            { char: '請', pinyin: 'qǐng', sinoViet: 'Thỉnh', meaning: 'Xin phép, mời', ruleNote: 'Q ↔ TH' },
            { char: '假', pinyin: 'jià', sinoViet: 'Giả', meaning: 'Ngày nghỉ phép', ruleNote: 'J ↔ GI' }
        ]
    },
    'lesson-8-word-5': {
        wordId: 'lesson-8-word-5',
        sinoViet: 'TÁI THUYẾT NHẤT THỨ',
        radical: '言',
        radicalName: 'Bộ Ngôn #149 · 7 nét',
        strokes: 14,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ + Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Zài ➔ Tái (lặp lại: tái bản); Shuō ➔ Thuyết (nói: thuyết trình); Yí cì ➔ Nhất thứ (một lần).',
        decomposition: [
            { char: '再', pinyin: 'zài', sinoViet: 'Tái', meaning: 'Lại một lần nữa', ruleNote: 'Z ↔ T' },
            { char: '說', pinyin: 'shuō', sinoViet: 'Thuyết', meaning: 'Nói, giải thích', ruleNote: 'SH ↔ TH' },
            { char: '一', pinyin: 'yí', sinoViet: 'Nhất', meaning: 'Một', ruleNote: 'Y ↔ NH' },
            { char: '次', pinyin: 'cì', sinoViet: 'Thứ', meaning: 'Lần, lượt', ruleNote: 'C ↔ TH' }
        ]
    },
    // --- TOCFL B1 (Lesson 9 - 12) ---
    'lesson-9-word-1': {
        wordId: 'lesson-9-word-1',
        sinoViet: 'NGÂN HÀNG',
        radical: '金',
        radicalName: 'Bộ Kim #167 · 8 nét',
        strokes: 14,
        toneClass: 'Thanh 2 ↗ + Thanh 2 ↗',
        cognateTip: 'Yín ➔ Ngân (tiền bạc, ngân sách); Háng ➔ Hàng (tiệm buôn, hãng kinh doanh). Ngân hàng là nơi lưu trữ và lưu thông tiền tệ.',
        decomposition: [
            { char: '銀', radical: '金', strokes: 14, pinyin: 'yín', sinoViet: 'Ngân', meaning: 'Bạc trắng, tiền tệ ngân quỹ', ruleNote: 'Y ↔ NG (yín ➔ ngân)' },
            { char: '行', radical: '行', strokes: 6, pinyin: 'háng', sinoViet: 'Hàng', meaning: 'Nơi kinh doanh, hãng buôn', ruleNote: 'H ↔ H (háng ➔ hàng)' }
        ]
    },
    'lesson-9-word-2': {
        wordId: 'lesson-9-word-2',
        sinoViet: 'KHAI HỘ',
        radical: '門',
        radicalName: 'Bộ Môn #169 · 8 nét',
        strokes: 12,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Kāi ➔ Khai (mở ra, khai trương); Hù ➔ Hộ (hộ gia đình, tài khoản định danh). Khai hộ = mở tài khoản ngân hàng.',
        decomposition: [
            { char: '開', radical: '門', strokes: 12, pinyin: 'kāi', sinoViet: 'Khai', meaning: 'Mở rộng cửa, khởi tạo', ruleNote: 'K ↔ KH (kāi ➔ khai)' },
            { char: '戶', radical: '戶', strokes: 4, pinyin: 'hù', sinoViet: 'Hộ', meaning: 'Cửa một cánh, tài khoản khách hàng', ruleNote: 'H ↔ H (hù ➔ hộ)' }
        ]
    },
    'lesson-9-word-3': {
        wordId: 'lesson-9-word-3',
        sinoViet: 'ẤN CHƯƠNG',
        radical: '卩',
        radicalName: 'Bộ Tiết #26 · 2 nét',
        strokes: 6,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ',
        cognateTip: 'Yìn ➔ Ấn (con dấu, đóng dấu, in ấn); Zhāng ➔ Chương (văn chương, huy hiệu biểu trưng). Ở Đài Loan con dấu có giá trị pháp lý tương đương chữ ký.',
        decomposition: [
            { char: '印', radical: '卩', strokes: 6, pinyin: 'yìn', sinoViet: 'Ấn', meaning: 'Đóng dấu niêm phong, dấu in', ruleNote: 'Y ↔ Â (yìn ➔ ấn)' },
            { char: '章', radical: '立', strokes: 11, pinyin: 'zhāng', sinoViet: 'Chương', meaning: 'Con dấu chức danh, huy hiệu', ruleNote: 'ZH ↔ CH (zhāng ➔ chương)' }
        ]
    },
    'lesson-9-word-4': {
        wordId: 'lesson-9-word-4',
        sinoViet: 'CƯ LƯU CHỨNG',
        radical: '尸',
        radicalName: 'Bộ Thi #44 · 3 nét',
        strokes: 8,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Jū ➔ Cư (an cư, cư trú); Liú ➔ Lưu (lưu trú, ở lại); Zhèng ➔ Chứng (chứng chỉ, giấy tờ). Cư lưu chứng = Thẻ cư trú ARC (Alien Resident Certificate).',
        decomposition: [
            { char: '居', radical: '尸', strokes: 8, pinyin: 'jū', sinoViet: 'Cư', meaning: 'Ở lại, định cư', ruleNote: 'J ↔ C (jū ➔ cư)' },
            { char: '留', radical: '田', strokes: 10, pinyin: 'liú', sinoViet: 'Lưu', meaning: 'Giữ lại, lưu lại dài hạn', ruleNote: 'L ↔ L (liú ➔ lưu)' },
            { char: '證', radical: '言', strokes: 19, pinyin: 'zhèng', sinoViet: 'Chứng', meaning: 'Bằng chứng, giấy tờ chứng nhận', ruleNote: 'ZH ↔ CH (zhèng ➔ chứng)' }
        ]
    },
    'lesson-9-word-5': {
        wordId: 'lesson-9-word-5',
        sinoViet: 'HỐI KHOẢN',
        radical: '匚',
        radicalName: 'Bộ Phương #22 · 2 nét',
        strokes: 13,
        toneClass: 'Thanh 4 ˋ + Thanh 3 ˇ',
        cognateTip: 'Huì ➔ Hối (hối đoái, quy tụ dòng tiền qua ngân hàng); Kuǎn ➔ Khoản (tiền bạc, khoản chi trả). Hối khoản = chuyển khoản ngân hàng, kiều hối quốc tế.',
        decomposition: [
            { char: '匯', radical: '匚', strokes: 13, pinyin: 'huì', sinoViet: 'Hối', meaning: 'Quy tụ tiền tệ, luân chuyển dòng tiền', ruleNote: 'H ↔ H (huì ➔ hối)' },
            { char: '款', radical: '欠', strokes: 12, pinyin: 'kuǎn', sinoViet: 'Khoản', meaning: 'Khoản tiền, số tiền giao dịch', ruleNote: 'K ↔ KH (kuǎn ➔ khoản)' }
        ]
    },
    'lesson-10-word-1': {
        wordId: 'lesson-10-word-1',
        sinoViet: 'CƠ XA',
        radical: '木',
        radicalName: 'Bộ Mộc #75 · 4 nét',
        strokes: 16,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ',
        cognateTip: 'Jī ➔ Cơ (động cơ cơ giới); Chē ➔ Xa (xe cộ, xa mã). Cơ xa là thuật ngữ tiếng Đài thông dụng nhất chỉ xe gắn máy / xe scooter.',
        decomposition: [
            { char: '機', radical: '木', strokes: 16, pinyin: 'jī', sinoViet: 'Cơ', meaning: 'Máy móc, động cơ cơ giới', ruleNote: 'J ↔ C (jī ➔ cơ)' },
            { char: '車', radical: '車', strokes: 7, pinyin: 'chē', sinoViet: 'Xa', meaning: 'Xe cộ, phương tiện bánh lăn', ruleNote: 'CH ↔ X (chē ➔ xa)' }
        ]
    },
    'lesson-10-word-2': {
        wordId: 'lesson-10-word-2',
        sinoViet: 'AN TOÀN MẠO',
        radical: '宀',
        radicalName: 'Bộ Miên #40 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Ān ➔ An (an toàn, bình an); Quán ➔ Toàn (hoàn toàn, vẹn toàn); Mào ➔ Mạo (mũ đội đầu: mũ mạo). An toàn mạo = Mũ bảo hiểm bắt buộc khi đi xe máy.',
        decomposition: [
            { char: '安', radical: '宀', strokes: 6, pinyin: 'ān', sinoViet: 'An', meaning: 'Yên ổn, bình an', ruleNote: 'A ↔ A (ān ➔ an)' },
            { char: '全', radical: '入', strokes: 6, pinyin: 'quán', sinoViet: 'Toàn', meaning: 'Trọn vẹn, không sứt mẻ', ruleNote: 'Q ↔ T (quán ➔ toàn)' },
            { char: '帽', radical: '巾', strokes: 12, pinyin: 'mào', sinoViet: 'Mạo', meaning: 'Mũ che đầu bảo vệ', ruleNote: 'M ↔ M (mào ➔ mạo)' }
        ]
    },
    'lesson-10-word-3': {
        wordId: 'lesson-10-word-3',
        sinoViet: 'GIA DU TRẠM',
        radical: '力',
        radicalName: 'Bộ Lực #19 · 2 nét',
        strokes: 5,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Jiā ➔ Gia (gia tăng, thêm vào); Yóu ➔ Du (dầu mỡ, nhiên liệu xăng dầu); Zhàn ➔ Trạm (trạm dừng chân). Gia du trạm = Trạm cấp xăng dầu.',
        decomposition: [
            { char: '加', radical: '力', strokes: 5, pinyin: 'jiā', sinoViet: 'Gia', meaning: 'Tăng thêm, gia nạp', ruleNote: 'J ↔ G (jiā ➔ gia)' },
            { char: '油', radical: '水', strokes: 8, pinyin: 'yóu', sinoViet: 'Du', meaning: 'Nhiên liệu lỏng, xăng dầu', ruleNote: 'Y ↔ D (yóu ➔ du)' },
            { char: '站', radical: '立', strokes: 10, pinyin: 'zhàn', sinoViet: 'Trạm', meaning: 'Điểm dừng xe, trạm tiếp nhiên liệu', ruleNote: 'ZH ↔ TR (zhàn ➔ trạm)' }
        ]
    },
    'lesson-10-word-4': {
        wordId: 'lesson-10-word-4',
        sinoViet: 'GIÁ CHIẾU',
        radical: '馬',
        radicalName: 'Bộ Mã #187 · 10 nét',
        strokes: 15,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Jià ➔ Giá (cầm cương lái xe ngựa: giá ngự); Zhào ➔ Chiếu (giấy phép chứng nhận: chấp chiếu, hộ chiếu). Giá chiếu = Giấy phép lái xe / Bằng lái xe.',
        decomposition: [
            { char: '駕', radical: '馬', strokes: 15, pinyin: 'jià', sinoViet: 'Giá', meaning: 'Điều khiển xe cộ, cầm lái', ruleNote: 'J ↔ GI (jià ➔ giá)' },
            { char: '照', radical: '火', strokes: 13, pinyin: 'zhào', sinoViet: 'Chiếu', meaning: 'Giấy chứng nhận có ảnh chụp', ruleNote: 'ZH ↔ CH (zhào ➔ chiếu)' }
        ]
    },
    'lesson-10-word-5': {
        wordId: 'lesson-10-word-5',
        sinoViet: 'PHONG CẢNH',
        radical: '風',
        radicalName: 'Bộ Phong #182 · 9 nét',
        strokes: 9,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ',
        cognateTip: 'Fēng ➔ Phong (gió trời mát mẻ); Jǐng ➔ Cảnh (quang cảnh non nước). Phong cảnh tiếng Việt tương đồng 100% âm Hán-Việt với nghĩa cảnh quan thiên nhiên.',
        decomposition: [
            { char: '風', radical: '風', strokes: 9, pinyin: 'fēng', sinoViet: 'Phong', meaning: 'Gió trời, phong khí tự nhiên', ruleNote: 'F ↔ PH (fēng ➔ phong)' },
            { char: '景', radical: '日', strokes: 12, pinyin: 'jǐng', sinoViet: 'Cảnh', meaning: 'Ánh nắng rọi sáng cảnh vật đẹp', ruleNote: 'J ↔ C (jǐng ➔ cảnh)' }
        ]
    },
    'lesson-11-word-1': {
        wordId: 'lesson-11-word-1',
        sinoViet: 'LÝ LỊCH',
        radical: '尸',
        radicalName: 'Bộ Thi #44 · 3 nét',
        strokes: 15,
        toneClass: 'Thanh 3 ˇ + Thanh 4 ˋ',
        cognateTip: 'Lǚ ➔ Lý (bước chân đi thực địa, lý trình); Lì ➔ Lịch (từng trải qua: lịch sử, lịch duyệt). Lý lịch biểu (lǚlì biǎo) = Bản sơ yếu lý lịch / CV xin việc.',
        decomposition: [
            { char: '履', radical: '尸', strokes: 15, pinyin: 'lǚ', sinoViet: 'Lý', meaning: 'Giày dép, bước chân từng dẫm qua', ruleNote: 'L ↔ L (lǚ ➔ lý)' },
            { char: '歷', radical: '止', strokes: 16, pinyin: 'lì', sinoViet: 'Lịch', meaning: 'Trải qua tháng ngày, dòng thời gian', ruleNote: 'L ↔ L (lì ➔ lịch)' }
        ]
    },
    'lesson-11-word-2': {
        wordId: 'lesson-11-word-2',
        sinoViet: 'DIỆN THÍ',
        radical: '面',
        radicalName: 'Bộ Diện #176 · 9 nét',
        strokes: 9,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Miàn ➔ Diện (mặt đối mặt, diện kiến); Shì ➔ Thí (thử thách, thi cử: khảo thí). Diện thí = Buổi phỏng vấn trực tiếp người tìm việc.',
        decomposition: [
            { char: '面', radical: '面', strokes: 9, pinyin: 'miàn', sinoViet: 'Diện', meaning: 'Gặp gỡ trực diện, đối mặt', ruleNote: 'M ↔ D (miàn ➔ diện)' },
            { char: '試', radical: '言', strokes: 13, pinyin: 'shì', sinoViet: 'Thí', meaning: 'Khảo sát năng lực qua vấn đáp', ruleNote: 'SH ↔ TH (shì ➔ thí)' }
        ]
    },
    'lesson-11-word-3': {
        wordId: 'lesson-11-word-3',
        sinoViet: 'KINH NGHIỆM',
        radical: '糸',
        radicalName: 'Bộ Mịch #120 · 6 nét',
        strokes: 13,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Jīng ➔ Kinh (kinh qua, trải dọc suốt con đường sự nghiệp); Yàn ➔ Nghiệm (kiểm nghiệm thực tiễn). Kinh nghiệm tích lũy qua năm tháng làm việc.',
        decomposition: [
            { char: '經', radical: '糸', strokes: 13, pinyin: 'jīng', sinoViet: 'Kinh', meaning: 'Trải qua con đường, mạch thẳng', ruleNote: 'J ↔ K (jīng ➔ kinh)' },
            { char: '驗', radical: '馬', strokes: 23, pinyin: 'yàn', sinoViet: 'Nghiệm', meaning: 'Kiểm nghiệm, chứng thực qua thực tiễn', ruleNote: 'Y ↔ NGH (yàn ➔ nghiệm)' }
        ]
    },
    'lesson-11-word-4': {
        wordId: 'lesson-11-word-4',
        sinoViet: 'TÂN THỦY',
        radical: '艸',
        radicalName: 'Bộ Thảo #140 · 6 nét',
        strokes: 17,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ',
        cognateTip: 'Xīn ➔ Tân (củi đun: tân thảo); Shuǐ ➔ Thủy (nước uống). Cổ nhân gọi tiền trang trải củi đuốc nước uống hàng ngày là "tân thủy" ➔ nghĩa là tiền lương đãi ngộ.',
        decomposition: [
            { char: '薪', radical: '艸', strokes: 17, pinyin: 'xīn', sinoViet: 'Tân', meaning: 'Củi đun, tiền thù lao nuôi sống', ruleNote: 'X ↔ T (xīn ➔ tân)' },
            { char: '水', radical: '水', strokes: 4, pinyin: 'shuǐ', sinoViet: 'Thủy', meaning: 'Nước uống, nhu cầu căn bản đời sống', ruleNote: 'SH ↔ TH (shuǐ ➔ thủy)' }
        ]
    },
    'lesson-11-word-5': {
        wordId: 'lesson-11-word-5',
        sinoViet: 'CHUYÊN TRƯỜNG',
        radical: '寸',
        radicalName: 'Bộ Thốn #41 · 3 nét',
        strokes: 11,
        toneClass: 'Thanh 1 ˉ + Thanh 2 ↗',
        cognateTip: 'Zhuān ➔ Chuyên (chuyên tâm nghiên cứu sâu); Cháng ➔ Trường (sở trường, điểm mạnh vượt trội). Chuyên trường = Năng lực chuyên môn / Sở trường mũi nhọn.',
        decomposition: [
            { char: '專', radical: '寸', strokes: 11, pinyin: 'zhuān', sinoViet: 'Chuyên', meaning: 'Tập trung chuyên sâu một lĩnh vực', ruleNote: 'ZH ↔ CH (zhuān ➔ chuyên)' },
            { char: '長', radical: '長', strokes: 8, pinyin: 'cháng', sinoViet: 'Trường', meaning: 'Sở trường, điểm sáng tài năng', ruleNote: 'CH ↔ TR (cháng ➔ trường)' }
        ]
    },
    'lesson-12-word-1': {
        wordId: 'lesson-12-word-1',
        sinoViet: 'TRUNG THU TIẾT',
        radical: '丨',
        radicalName: 'Bộ Cổn #2 · 1 nét',
        strokes: 4,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ + Thanh 2 ↗',
        cognateTip: 'Zhōng ➔ Trung (ở giữa); Qiū ➔ Thu (tiết thu); Jié ➔ Tiết (lễ hội tiết mùa). Trung thu tiết = Ngày Tết Trung thu rằm tháng 8 âm lịch.',
        decomposition: [
            { char: '中', radical: '丨', strokes: 4, pinyin: 'zhōng', sinoViet: 'Trung', meaning: 'Chính giữa mùa thu 3 tháng', ruleNote: 'ZH ↔ TR (zhōng ➔ trung)' },
            { char: '秋', radical: '禾', strokes: 9, pinyin: 'qiū', sinoViet: 'Thu', meaning: 'Mùa thu mát mẻ, lúa chín', ruleNote: 'Q ↔ TH (qiū ➔ thu)' },
            { char: '節', radical: '竹', strokes: 13, pinyin: 'jié', sinoViet: 'Tiết', meaning: 'Đốt tre, ngày hội truyền thống', ruleNote: 'J ↔ T (jié ➔ tiết)' }
        ]
    },
    'lesson-12-word-2': {
        wordId: 'lesson-12-word-2',
        sinoViet: 'KHẢO NHỤC',
        radical: '火',
        radicalName: 'Bộ Hỏa #86 · 4 nét',
        strokes: 10,
        toneClass: 'Thanh 3 ˇ + Thanh 4 ˋ',
        cognateTip: 'Kǎo ➔ Khảo (nung nóng trên lửa đỏ: nướng); Ròu ➔ Nhục (thịt động vật). Khảo nhục = Tiệc nướng thịt BBQ ngoài trời, nét văn hóa đặc sắc đêm Trung thu Đài Loan.',
        decomposition: [
            { char: '烤', radical: '火', strokes: 10, pinyin: 'kǎo', sinoViet: 'Khảo', meaning: 'Nướng chín trên than lửa', ruleNote: 'K ↔ KH (kǎo ➔ khảo)' },
            { char: '肉', radical: '肉', strokes: 6, pinyin: 'ròu', sinoViet: 'Nhục', meaning: 'Miếng thịt tươi', ruleNote: 'R ↔ NH (ròu ➔ nhục)' }
        ]
    },
    'lesson-12-word-3': {
        wordId: 'lesson-12-word-3',
        sinoViet: 'PHƯỢNG LÊ TÔ',
        radical: '鳥',
        radicalName: 'Bộ Điểu #196 · 11 nét',
        strokes: 14,
        toneClass: 'Thanh 4 ˋ + Thanh 2 ↗ + Thanh 1 ˉ',
        cognateTip: 'Fènglí ➔ Phượng lê (tiếng Mân Nam phát âm là "ông-lâi" 旺來 mang ý tài lộc đến nhà); Sū ➔ Tô (vỏ bánh thơm giòn xốp). Bánh dứa đặc sản số 1 Đài Loan.',
        decomposition: [
            { char: '鳳', radical: '鳥', strokes: 14, pinyin: 'fèng', sinoViet: 'Phượng', meaning: 'Chim phượng hoàng quý phái', ruleNote: 'F ↔ PH (fèng ➔ phượng)' },
            { char: '梨', radical: '木', strokes: 11, pinyin: 'lí', sinoViet: 'Lê', meaning: 'Cây ăn trái thanh ngọt', ruleNote: 'L ↔ L (lí ➔ lê)' },
            { char: '酥', radical: '酉', strokes: 12, pinyin: 'sū', sinoViet: 'Tô', meaning: 'Bánh xốp giòn làm từ bột và bơ sữa', ruleNote: 'S ↔ T (sū ➔ tô)' }
        ]
    },
    'lesson-12-word-4': {
        wordId: 'lesson-12-word-4',
        sinoViet: 'TRUYỀN THỐNG',
        radical: '亻',
        radicalName: 'Bộ Nhân #9 · 2 nét',
        strokes: 13,
        toneClass: 'Thanh 2 ↗ + Thanh 3 ˇ',
        cognateTip: 'Chuán ➔ Truyền (truyền nối, lưu truyền qua thế hệ); Tǒng ➔ Thống (mối tơ liên kết, thống nhất). Truyền thống là những tập quán quý báu được trao truyền lại.',
        decomposition: [
            { char: '傳', radical: '亻', strokes: 13, pinyin: 'chuán', sinoViet: 'Truyền', meaning: 'Trao lại cho đời sau gìn giữ', ruleNote: 'CH ↔ TR (chuán ➔ truyền)' },
            { char: '統', radical: '糸', strokes: 12, pinyin: 'tǒng', sinoViet: 'Thống', meaning: 'Mối nối các thế hệ liên tục', ruleNote: 'T ↔ TH (tǒng ➔ thống)' }
        ]
    },
    'lesson-12-word-5': {
        wordId: 'lesson-12-word-5',
        sinoViet: 'NHIỆT TÌNH',
        radical: '灬',
        radicalName: 'Bộ Hỏa #86 · 4 nét',
        strokes: 15,
        toneClass: 'Thanh 4 ˋ + Thanh 2 ↗',
        cognateTip: 'Rè ➔ Nhiệt (nóng ấm, nồng hậu); Qíng ➔ Tình (tình người, chân tình). Người dân Đài Loan nổi tiếng thế giới bởi tấm lòng hiếu khách nhiệt tình.',
        decomposition: [
            { char: '熱', radical: '灬', strokes: 15, pinyin: 'rè', sinoViet: 'Nhiệt', meaning: 'Hơi ấm bốc lên, nồng nhiệt', ruleNote: 'R ↔ NH (rè ➔ nhiệt)' },
            { char: '情', radical: '忄', strokes: 11, pinyin: 'qíng', sinoViet: 'Tình', meaning: 'Tình cảm nảy sinh từ trái tim', ruleNote: 'Q ↔ T (qíng ➔ tình)' }
        ]
    },
    // --- TOCFL B2 (Lesson 13 - 16) ---
    'lesson-13-word-1': {
        wordId: 'lesson-13-word-1',
        sinoViet: 'HỢP ƯỚC',
        radical: '口',
        radicalName: 'Bộ Khẩu #30 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 2 ↗ + Thanh 1 ˉ',
        cognateTip: 'Hé ➔ Hợp (hòa hợp, cùng nhau nhất trí); Yuē ➔ Ước (giao ước, cam kết). Hợp ước (héyuē) là từ ngữ chuẩn mực trong thương mại chỉ văn bản hợp đồng pháp lý.',
        decomposition: [
            { char: '合', radical: '口', strokes: 6, pinyin: 'hé', sinoViet: 'Hợp', meaning: 'Hòa hợp, ăn khớp các bên', ruleNote: 'H ↔ H (hé ➔ hợp)' },
            { char: '約', radical: '糸', strokes: 9, pinyin: 'yuē', sinoViet: 'Ước', meaning: 'Sợi dây ràng buộc lời hứa, giao ước', ruleNote: 'Y ↔ Ư (yuē ➔ ước)' }
        ]
    },
    'lesson-13-word-2': {
        wordId: 'lesson-13-word-2',
        sinoViet: 'HỢP TÁC',
        radical: '口',
        radicalName: 'Bộ Khẩu #30 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Hé ➔ Hợp (kết hợp sức mạnh); Zuò ➔ Tác (thao tác, hành động làm việc). Hợp tác kinh doanh là phối hợp chung tay kiến tạo giá trị đôi bên.',
        decomposition: [
            { char: '合', radical: '口', strokes: 6, pinyin: 'hé', sinoViet: 'Hợp', meaning: 'Cùng chung ý chí và định hướng', ruleNote: 'H ↔ H (hé ➔ hợp)' },
            { char: '作', radical: '亻', strokes: 7, pinyin: 'zuò', sinoViet: 'Tác', meaning: 'Bắt tay thực hiện công việc', ruleNote: 'Z ↔ T (zuò ➔ tác)' }
        ]
    },
    'lesson-13-word-3': {
        wordId: 'lesson-13-word-3',
        sinoViet: 'ĐIỀU KIỆN',
        radical: '木',
        radicalName: 'Bộ Mộc #75 · 4 nét',
        strokes: 11,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Tiáo ➔ Điều (nhánh nhỏ, từng điều khoản); Jiàn ➔ Kiện (sự kiện, yếu tố riêng rẽ). Điều kiện là tiêu chí căn bản cần đáp ứng trong thỏa thuận thương vụ.',
        decomposition: [
            { char: '條', radical: '木', strokes: 11, pinyin: 'tiáo', sinoViet: 'Điều', meaning: 'Từng cành nhánh nhỏ, điều mục văn bản', ruleNote: 'T ↔ Đ (tiáo ➔ điều)' },
            { char: '件', radical: '亻', strokes: 6, pinyin: 'jiàn', sinoViet: 'Kiện', meaning: 'Mỗi một yếu tố, sự kiện xác định', ruleNote: 'J ↔ K (jiàn ➔ kiện)' }
        ]
    },
    'lesson-13-word-4': {
        wordId: 'lesson-13-word-4',
        sinoViet: 'THIÊM ƯỚC',
        radical: '竹',
        radicalName: 'Bộ Trúc #118 · 6 nét',
        strokes: 19,
        toneClass: 'Thanh 1 ˉ + Thanh 1 ˉ',
        cognateTip: 'Qiān ➔ Thiêm (thẻ tre khắc tên, ký tên xác nhận); Yuē ➔ Ước (giao ước hợp đồng). Thiêm ước = Ký kết hợp đồng正式簽約.',
        decomposition: [
            { char: '簽', radical: '竹', strokes: 19, pinyin: 'qiān', sinoViet: 'Thiêm', meaning: 'Cây bút tre ghi tên ký duyệt', ruleNote: 'Q ↔ TH (qiān ➔ thiêm)' },
            { char: '約', radical: '糸', strokes: 9, pinyin: 'yuē', sinoViet: 'Ước', meaning: 'Lời ước thề pháp lý ràng buộc đôi bên', ruleNote: 'Y ↔ Ư (yuē ➔ ước)' }
        ]
    },
    'lesson-13-word-5': {
        wordId: 'lesson-13-word-5',
        sinoViet: 'LỢI NHUẬN',
        radical: '刀',
        radicalName: 'Bộ Đao #18 · 2 nét',
        strokes: 7,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Lì ➔ Lợi (thu hoạch lúa tốt, có lãi); Rùn ➔ Nhuận (ẩm ướt, mỡ màu, sinh sôi nảy nở). Lợi nhuận là phần thặng dư tài chính thu được sau đầu tư sản xuất.',
        decomposition: [
            { char: '利', radical: '刀', strokes: 7, pinyin: 'lì', sinoViet: 'Lợi', meaning: 'Lưỡi liềm gặt lúa trĩu bông, ích lợi', ruleNote: 'L ↔ L (lì ➔ lợi)' },
            { char: '潤', radical: '水', strokes: 15, pinyin: 'rùn', sinoViet: 'Nhuận', meaning: 'Dòng nước thấm nhuần tài lộc sinh sôi', ruleNote: 'R ↔ NH (rùn ➔ nhuận)' }
        ]
    },
    'lesson-14-word-1': {
        wordId: 'lesson-14-word-1',
        sinoViet: 'TINH PHIẾN',
        radical: '日',
        radicalName: 'Bộ Nhật #72 · 4 nét',
        strokes: 12,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Jīng ➔ Tinh (ba mặt trời tỏa sáng rực rỡ, tinh thể silicon thuần khiết); Piàn ➔ Phiến (phiến đá mỏng, lát wafer bán dẫn). Tinh phiến = vi mạch bán dẫn / microchip.',
        decomposition: [
            { char: '晶', radical: '日', strokes: 12, pinyin: 'jīng', sinoViet: 'Tinh', meaning: 'Tinh thể pha lê trong suốt tinh khiết', ruleNote: 'J ↔ T (jīng ➔ tinh)' },
            { char: '片', radical: '片', strokes: 4, pinyin: 'piàn', sinoViet: 'Phiến', meaning: 'Lát mỏng vi mạch cắt từ wafer', ruleNote: 'P ↔ PH (piàn ➔ phiến)' }
        ]
    },
    'lesson-14-word-2': {
        wordId: 'lesson-14-word-2',
        sinoViet: 'BÁN ĐẠO THỂ',
        radical: '十',
        radicalName: 'Bộ Thập #24 · 2 nét',
        strokes: 5,
        toneClass: 'Thanh 4 ˋ + Thanh 3 ˇ + Thanh 3 ˇ (Biến điệu 4 + 2 + 3)',
        cognateTip: 'Bàn ➔ Bán (một nửa); Dǎo ➔ Đạo (dẫn truyền electron); Tǐ ➔ Thể (vật thể chất liệu). Bán đạo thể = Chất bán dẫn semiconductor, ngành công nghiệp trụ cột của Đài Loan.',
        decomposition: [
            { char: '半', radical: '十', strokes: 5, pinyin: 'bàn', sinoViet: 'Bán', meaning: 'Phân nửa, trạng thái trung gian', ruleNote: 'B ↔ B (bàn ➔ bán)' },
            { char: '導', radical: '寸', strokes: 15, pinyin: 'dǎo', sinoViet: 'Đạo', meaning: 'Dẫn dắt, tải dẫn dòng điện', ruleNote: 'D ↔ Đ (dǎo ➔ đạo)' },
            { char: '體', radical: '骨', strokes: 23, pinyin: 'tǐ', sinoViet: 'Thể', meaning: 'Thân thể, chất thể vật chất', ruleNote: 'T ↔ TH (tǐ ➔ thể)' }
        ]
    },
    'lesson-14-word-3': {
        wordId: 'lesson-14-word-3',
        sinoViet: 'SÁNG TÂN',
        radical: '刀',
        radicalName: 'Bộ Đao #18 · 2 nét',
        strokes: 12,
        toneClass: 'Thanh 4 ˋ + Thanh 1 ˉ',
        cognateTip: 'Chuàng ➔ Sáng (sáng tạo, khai mở nhát gươm đầu tiên); Xīn ➔ Tân (mới mẻ đột phá). Sáng tân = Đổi mới sáng tạo (innovation), động lực duy trì ngôi vương công nghệ.',
        decomposition: [
            { char: '創', radical: '刀', strokes: 12, pinyin: 'chuàng', sinoViet: 'Sáng', meaning: 'Vung dao khai mở lối đi độc đáo', ruleNote: 'CH ↔ S (chuàng ➔ sáng)' },
            { char: '新', radical: '斤', strokes: 13, pinyin: 'xīn', sinoViet: 'Tân', meaning: 'Chặt cây lấy gỗ thơm tươi mới', ruleNote: 'X ↔ T (xīn ➔ tân)' }
        ]
    },
    'lesson-14-word-4': {
        wordId: 'lesson-14-word-4',
        sinoViet: 'KHOA KỸ',
        radical: '禾',
        radicalName: 'Bộ Hòa #115 · 5 nét',
        strokes: 9,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Kē ➔ Khoa (khoa cử, hệ thống đo lường lý tính); Jì ➔ Kỹ (kỹ thuật, tài khéo léo). Khoa kỹ = Khoa học kỹ thuật / Công nghệ cao (High-tech).',
        decomposition: [
            { char: '科', radical: '禾', strokes: 9, pinyin: 'kē', sinoViet: 'Khoa', meaning: 'Đong đếm sản lượng chuẩn mực', ruleNote: 'K ↔ KH (kē ➔ khoa)' },
            { char: '技', radical: '扌', strokes: 7, pinyin: 'jì', sinoViet: 'Kỹ', meaning: 'Tài hoa khéo léo của đôi bàn tay', ruleNote: 'J ↔ K (jì ➔ kỹ)' }
        ]
    },
    'lesson-14-word-5': {
        wordId: 'lesson-14-word-5',
        sinoViet: 'NGHIÊN PHÁT',
        radical: '石',
        radicalName: 'Bộ Thạch #112 · 5 nét',
        strokes: 9,
        toneClass: 'Thanh 2 ↗ + Thanh 1 ˉ',
        cognateTip: 'Yán ➔ Nghiên (mài giũa đá cho bóng mịn, nghiên cứu thấu đáo); Fā ➔ Phát (phóng tên đi xa, phát minh tiến bộ). Nghiên phát = Hoạt động R&D (Nghiên cứu & Phát triển).',
        decomposition: [
            { char: '研', radical: '石', strokes: 9, pinyin: 'yán', sinoViet: 'Nghiên', meaning: 'Mài phẳng phiến đá, suy xét tinh tường', ruleNote: 'Y ↔ NGH (yán ➔ nghiên)' },
            { char: '發', radical: '癶', strokes: 12, pinyin: 'fā', sinoViet: 'Phát', meaning: 'Phát xạ, đơm hoa kết trái thành công', ruleNote: 'F ↔ PH (fā ➔ phát)' }
        ]
    },
    'lesson-15-word-1': {
        wordId: 'lesson-15-word-1',
        sinoViet: 'BÁO THUẾ',
        radical: '土',
        radicalName: 'Bộ Thổ #32 · 3 nét',
        strokes: 12,
        toneClass: 'Thanh 4 ˋ + Thanh 4 ˋ',
        cognateTip: 'Bào ➔ Báo (khai báo tường trình thực tế); Shuì ➔ Thuế (phần trích nộp ngân sách quốc gia). Báo thuế = việc khai nộp thuế thu nhập cá nhân hàng năm vào tháng 5 tại Đài Loan.',
        decomposition: [
            { char: '報', radical: '土', strokes: 12, pinyin: 'bào', sinoViet: 'Báo', meaning: 'Trình báo nghĩa vụ đối với xã hội', ruleNote: 'B ↔ B (bào ➔ báo)' },
            { char: '稅', radical: '禾', strokes: 12, pinyin: 'shuì', sinoViet: 'Thuế', meaning: 'Trích một phần mùa màng nộp công quỹ', ruleNote: 'SH ↔ TH (shuì ➔ thuế)' }
        ]
    },
    'lesson-15-word-2': {
        wordId: 'lesson-15-word-2',
        sinoViet: 'LAO BẢO',
        radical: '力',
        radicalName: 'Bộ Lực #19 · 2 nét',
        strokes: 12,
        toneClass: 'Thanh 2 ↗ + Thanh 3 ˇ',
        cognateTip: 'Láo ➔ Lao (lao động đổ mồ hôi dốc sức); Bǎo ➔ Bảo (bảo vệ quyền lợi, bảo hiểm). Lao bảo là Bảo hiểm Lao động bắt buộc, bảo đảm quyền lợi khi có rủi ro.',
        decomposition: [
            { char: '勞', radical: '力', strokes: 12, pinyin: 'láo', sinoViet: 'Lao', meaning: 'Dùng hết sức lực cống hiến lao động', ruleNote: 'L ↔ L (láo ➔ lao)' },
            { char: '保', radical: '亻', strokes: 9, pinyin: 'bǎo', sinoViet: 'Bảo', meaning: 'Che chở, đùm bọc người làm việc', ruleNote: 'B ↔ B (bǎo ➔ bảo)' }
        ]
    },
    'lesson-15-word-3': {
        wordId: 'lesson-15-word-3',
        sinoViet: 'QUYỀN ÍCH',
        radical: '木',
        radicalName: 'Bộ Mộc #75 · 4 nét',
        strokes: 22,
        toneClass: 'Thanh 2 ↗ + Thanh 4 ˋ',
        cognateTip: 'Quán ➔ Quyền (cán cân công lý bảo vệ con người); Yì ➔ Ích (nước tràn chén, phúc lợi thặng dư). Quyền ích = Các quyền lợi chính đáng được luật pháp bảo vệ.',
        decomposition: [
            { char: '權', radical: '木', strokes: 22, pinyin: 'quán', sinoViet: 'Quyền', meaning: 'Quả cân thăng bằng công lý, quyền bính', ruleNote: 'Q ↔ Q (quán ➔ quyền)' },
            { char: '益', radical: '皿', strokes: 10, pinyin: 'yì', sinoViet: 'Ích', meaning: 'Dòng nước tràn ra mang lại lợi lộc', ruleNote: 'Y ↔ I (yì ➔ ích)' }
        ]
    },
    'lesson-15-word-4': {
        wordId: 'lesson-15-word-4',
        sinoViet: 'QUY ĐỊNH',
        radical: '見',
        radicalName: 'Bộ Kiến #147 · 7 nét',
        strokes: 11,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Guī ➔ Quy (dụng cụ com-pa tạo đường chuẩn mực: quy củ); Dìng ➔ Định (ấn định dưới mái nhà vững chãi). Quy định = Điều lệ và nguyên tắc bắt buộc tuân thủ.',
        decomposition: [
            { char: '規', radical: '見', strokes: 11, pinyin: 'guī', sinoViet: 'Quy', meaning: 'Com-pa vạch giới hạn chuẩn mực đạo lý', ruleNote: 'G ↔ Q (guī ➔ quy)' },
            { char: '定', radical: '宀', strokes: 8, pinyin: 'dìng', sinoViet: 'Định', meaning: 'An định vững chãi, không xê dịch', ruleNote: 'D ↔ Đ (dìng ➔ định)' }
        ]
    },
    'lesson-15-word-5': {
        wordId: 'lesson-15-word-5',
        sinoViet: 'KHẤU TRỪ NGẠCH',
        radical: '扌',
        radicalName: 'Bộ Thủ #64 · 3 nét',
        strokes: 6,
        toneClass: 'Thanh 4 ˋ + Thanh 2 ↗ + Thanh 2 ↗',
        cognateTip: 'Kòu ➔ Khấu (giữ lại bớt, khấu trừ chiết khấu); Chú ➔ Trừ (loại bỏ ra ngoài); É ➔ Ngạch (hạn ngạch tài chính). Khấu trừ ngạch = Mức giảm trừ gia cảnh thuế thu nhập.',
        decomposition: [
            { char: '扣', radical: '扌', strokes: 6, pinyin: 'kòu', sinoViet: 'Khấu', meaning: 'Dùng tay giữ lại bớt, giảm trừ', ruleNote: 'K ↔ KH (kòu ➔ khấu)' },
            { char: '除', radical: '阜', strokes: 10, pinyin: 'chú', sinoViet: 'Trừ', meaning: 'Bỏ đi phần phụ, trừ khử gánh nặng', ruleNote: 'CH ↔ TR (chú ➔ trừ)' },
            { char: '額', radical: '頁', strokes: 18, pinyin: 'é', sinoViet: 'Ngạch', meaning: 'Hạn ngạch số tiền được khấu trừ trần', ruleNote: 'E ↔ NG (é ➔ ngạch)' }
        ]
    },
    'lesson-16-word-1': {
        wordId: 'lesson-16-word-1',
        sinoViet: 'DIỄN GIẢNG',
        radical: '水',
        radicalName: 'Bộ Thủy #85 · 4 nét',
        strokes: 14,
        toneClass: 'Thanh 3 ˇ + Thanh 3 ˇ (Biến điệu 2 ↗ + 3 ˇ)',
        cognateTip: 'Yǎn ➔ Diễn (mở rộng dòng chảy tư duy ra trước đám đông); Jiǎng ➔ Giảng (nói giải thích đạo lý). Diễn giảng = Bài thuyết trình chuyên đề trước công chúng.',
        decomposition: [
            { char: '演', radical: '水', strokes: 14, pinyin: 'yǎn', sinoViet: 'Diễn', meaning: 'Dòng nước tuôn chảy, trình diễn luận điểm', ruleNote: 'Y ↔ D (yǎn ➔ diễn)' },
            { char: '講', radical: '言', strokes: 17, pinyin: 'jiǎng', sinoViet: 'Giảng', meaning: 'Lời nói phân tích thấu đáo, diễn giải', ruleNote: 'J ↔ GI (jiǎng ➔ giảng)' }
        ]
    },
    'lesson-16-word-2': {
        wordId: 'lesson-16-word-2',
        sinoViet: 'QUAN ĐIỂM',
        radical: '見',
        radicalName: 'Bộ Kiến #147 · 7 nét',
        strokes: 25,
        toneClass: 'Thanh 1 ˉ + Thanh 3 ˇ',
        cognateTip: 'Guān ➔ Quan (dõi mắt nhìn sâu trông rộng); Diǎn ➔ Điểm (tọa độ góc nhìn xác định). Quan điểm = Lập trường và góc độ nhìn nhận một vấn đề khoa học.',
        decomposition: [
            { char: '觀', radical: '見', strokes: 25, pinyin: 'guān', sinoViet: 'Quan', meaning: 'Phóng tầm mắt quan sát toàn cảnh', ruleNote: 'G ↔ Q (guān ➔ quan)' },
            { char: '點', radical: '黑', strokes: 17, pinyin: 'diǎn', sinoViet: 'Điểm', meaning: 'Dấu chấm định vị, điểm tựa góc nhìn', ruleNote: 'D ↔ Đ (diǎn ➔ điểm)' }
        ]
    },
    'lesson-16-word-3': {
        wordId: 'lesson-16-word-3',
        sinoViet: 'ẢNH HƯỞNG',
        radical: '彡',
        radicalName: 'Bộ Sam #59 · 3 nét',
        strokes: 15,
        toneClass: 'Thanh 3 ˇ + Thanh 3 ˇ (Biến điệu 2 ↗ + 3 ˇ)',
        cognateTip: 'Yǐng ➔ Ảnh (bóng của vật); Xiǎng ➔ Hưởng (tiếng vang vọng lại). Cổ ngữ "như bóng theo hình, như vang ứng tiếng" ➔ Tác động lan tỏa sâu sắc và tất yếu.',
        decomposition: [
            { char: '影', radical: '彡', strokes: 15, pinyin: 'yǐng', sinoViet: 'Ảnh', meaning: 'Bóng in trên mặt đất theo sát hình hài', ruleNote: 'Y ↔ A (yǐng ➔ ảnh)' },
            { char: '響', radical: '音', strokes: 21, pinyin: 'xiǎng', sinoViet: 'Hưởng', meaning: 'Âm vang dội lại mạnh mẽ trong không gian', ruleNote: 'X ↔ H (xiǎng ➔ hưởng)' }
        ]
    },
    'lesson-16-word-4': {
        wordId: 'lesson-16-word-4',
        sinoViet: 'XU THẾ',
        radical: '走',
        radicalName: 'Bộ Tẩu #156 · 7 nét',
        strokes: 17,
        toneClass: 'Thanh 1 ˉ + Thanh 4 ˋ',
        cognateTip: 'Qū ➔ Xu (sải bước chân chạy nhanh theo hướng); Shì ➔ Thế (sức mạnh thời cuộc). Xu thế = Chiều hướng và trào lưu biến chuyển tất yếu của thời đại.',
        decomposition: [
            { char: '趨', radical: '走', strokes: 17, pinyin: 'qū', sinoViet: 'Xu', meaning: 'Sải bước rảo chân lao tới đích', ruleNote: 'Q ↔ X (qū ➔ xu)' },
            { char: '勢', radical: '力', strokes: 13, pinyin: 'shì', sinoViet: 'Thế', meaning: 'Sức mạnh vận động của hoàn cảnh', ruleNote: 'SH ↔ TH (shì ➔ thế)' }
        ]
    },
    'lesson-16-word-5': {
        wordId: 'lesson-16-word-5',
        sinoViet: 'TỔNG KẾT',
        radical: '糸',
        radicalName: 'Bộ Mịch #120 · 6 nét',
        strokes: 17,
        toneClass: 'Thanh 3 ˇ + Thanh 2 ↗',
        cognateTip: 'Zǒng ➔ Tổng (thâu tóm gom mọi mối dây); Jié ➔ Kết (thắt nút gút lại trọn vẹn). Tổng kết = Đúc kết toàn bộ ý kiến để rút ra kết luận cốt lõi.',
        decomposition: [
            { char: '總', radical: '糸', strokes: 17, pinyin: 'zǒng', sinoViet: 'Tổng', meaning: 'Buộc gộp mọi sợi tơ lại một mối', ruleNote: 'Z ↔ T (zǒng ➔ tổng)' },
            { char: '結', radical: '糸', strokes: 12, pinyin: 'jié', sinoViet: 'Kết', meaning: 'Thắt nút dây trọn vẹn, khép lại', ruleNote: 'J ↔ K (jié ➔ kết)' }
        ]
    }
};

export function getWordEtymology(wordId: string, fallbackHanzi = '融', fallbackPinyin = 'róng', fallbackMeaning = 'Hòa tan, dung nạp'): WordEtymology {
    if (etymologyMap[wordId]) {
        return etymologyMap[wordId];
    }
    const chars = Array.from(fallbackHanzi);
    return {
        wordId,
        sinoViet: 'TỪ VỰNG MỞ RỘNG',
        radical: chars[0] || '字',
        radicalName: 'Bộ Hán tự Phồn thể',
        strokes: 10,
        toneClass: 'Chuẩn ngữ âm Đài Loan',
        cognateTip: 'Mẹo nhớ: Đối chiếu âm đọc Pinyin với âm Hán-Việt tương ứng sẽ giúp bạn nhớ từ vựng nhanh gấp 3 lần.',
        decomposition: chars.map(c => ({
            char: c,
            pinyin: fallbackPinyin,
            sinoViet: 'Hán-Việt',
            meaning: fallbackMeaning
        }))
    };
}

export const STARTER_DECKS: StarterDeck[] = [
    {
        id: 'deck-nightmarket',
        titleZh: '夜市生存指南',
        titleVi: 'Sống sót Chợ đêm Đài Loan',
        badge: 'Đề xuất cao',
        badgeClass: 'badge-vermilion',
        desc: 'Gọi độ đường đá (半糖少冰), hỏi giá & thanh toán bằng tiền mặt hoặc thẻ.',
        lessonIds: ['lesson-2', 'lesson-4'],
        wordIds: [
            'lesson-2-word-1', 'lesson-2-word-2', 'lesson-2-word-3', 'lesson-2-word-4', 'lesson-2-word-5',
            'lesson-4-word-1', 'lesson-4-word-2', 'lesson-4-word-3', 'lesson-4-word-4', 'lesson-4-word-5'
        ]
    },
    {
        id: 'deck-mrt',
        titleZh: '捷運通勤必備',
        titleVi: 'Kỹ năng MRT & Xe buýt',
        badge: 'Thiết yếu',
        badgeClass: 'badge-jade',
        desc: 'Các biển chỉ dẫn ga MRT, chuyển tuyến (轉車), thẻ EasyCard (悠遊卡).',
        lessonIds: ['lesson-3', 'lesson-5'],
        wordIds: [
            'lesson-3-word-1', 'lesson-3-word-2', 'lesson-3-word-3', 'lesson-3-word-4', 'lesson-3-word-5',
            'lesson-5-word-1', 'lesson-5-word-3', 'lesson-5-word-5'
        ]
    },
    {
        id: 'deck-housing',
        titleZh: '租屋與宿舍生活',
        titleVi: 'Thuê nhà & KTX Đại học',
        badge: 'Du học sinh',
        badgeClass: 'badge-gold',
        desc: 'Tiền đặt cọc (押金), hợp đồng thuê nhà, chi phí điện nước (水電費) và khám bệnh.',
        lessonIds: ['lesson-6', 'lesson-7'],
        wordIds: [
            'lesson-6-word-1', 'lesson-6-word-2', 'lesson-6-word-3', 'lesson-6-word-4', 'lesson-6-word-5',
            'lesson-7-word-1', 'lesson-7-word-2', 'lesson-7-word-3', 'lesson-7-word-4', 'lesson-7-word-5'
        ]
    },
    {
        id: 'deck-tocfl-a2',
        titleZh: 'A2 核心詞彙精選',
        titleVi: 'Từ vựng Cốt lõi TOCFL A2',
        badge: 'Luyện thi bằng',
        badgeClass: 'badge-neutral',
        desc: 'Bộ 15 danh từ, động từ quan trọng nhất cho chứng chỉ Hoa ngữ TOCFL Band A2.',
        lessonIds: ['lesson-6', 'lesson-7', 'lesson-8'],
        wordIds: [
            'lesson-6-word-1', 'lesson-6-word-2', 'lesson-6-word-3', 'lesson-6-word-4', 'lesson-6-word-5',
            'lesson-7-word-1', 'lesson-7-word-2', 'lesson-7-word-3', 'lesson-7-word-4', 'lesson-7-word-5',
            'lesson-8-word-1', 'lesson-8-word-2', 'lesson-8-word-3', 'lesson-8-word-4', 'lesson-8-word-5'
        ]
    },
    {
        id: 'deck-tocfl-b1',
        title: 'TOCFL B1 · Đời sống & Công việc (20 từ)',
        titleZh: 'B1 職場生活精選',
        titleVi: 'TOCFL B1 · Đời sống & Công việc (20 từ)',
        subtitle: 'Ngân hàng, thuê xe máy, phỏng vấn & lễ hội Đài Loan',
        icon: '🏦',
        badge: 'TOCFL B1',
        badgeClass: 'badge-vermilion',
        desc: 'Ngân hàng, thuê xe máy, phỏng vấn & lễ hội Đài Loan',
        lessonIds: ['lesson-9', 'lesson-10', 'lesson-11', 'lesson-12'],
        wordIds: [
            'lesson-9-word-1', 'lesson-9-word-2', 'lesson-9-word-3', 'lesson-9-word-4', 'lesson-9-word-5',
            'lesson-10-word-1', 'lesson-10-word-2', 'lesson-10-word-3', 'lesson-10-word-4', 'lesson-10-word-5',
            'lesson-11-word-1', 'lesson-11-word-2', 'lesson-11-word-3', 'lesson-11-word-4', 'lesson-11-word-5',
            'lesson-12-word-1', 'lesson-12-word-2', 'lesson-12-word-3', 'lesson-12-word-4', 'lesson-12-word-5'
        ]
    },
    {
        id: 'deck-tocfl-b2',
        title: 'TOCFL B2 · Thương mại & Bán dẫn (20 từ)',
        titleZh: 'B2 商務半導體',
        titleVi: 'TOCFL B2 · Thương mại & Bán dẫn (20 từ)',
        subtitle: 'Hợp đồng, công nghệ bán dẫn, thuế & thuyết trình chuyên đề',
        icon: '🔬',
        badge: 'TOCFL B2',
        badgeClass: 'badge-jade',
        desc: 'Hợp đồng, công nghệ bán dẫn, thuế & thuyết trình chuyên đề',
        lessonIds: ['lesson-13', 'lesson-14', 'lesson-15', 'lesson-16'],
        wordIds: [
            'lesson-13-word-1', 'lesson-13-word-2', 'lesson-13-word-3', 'lesson-13-word-4', 'lesson-13-word-5',
            'lesson-14-word-1', 'lesson-14-word-2', 'lesson-14-word-3', 'lesson-14-word-4', 'lesson-14-word-5',
            'lesson-15-word-1', 'lesson-15-word-2', 'lesson-15-word-3', 'lesson-15-word-4', 'lesson-15-word-5',
            'lesson-16-word-1', 'lesson-16-word-2', 'lesson-16-word-3', 'lesson-16-word-4', 'lesson-16-word-5'
        ]
    }
];

export const DAILY_RADICALS: DailyRadical[] = [
    {
        dayOfWeek: 0,
        radical: '夕',
        kangxiIndex: 36,
        strokes: 3,
        pinyin: 'xī',
        sinoViet: 'TỊCH',
        pictographMeaning: 'Tượng hình vầng trăng khuyết vừa nhô lên lúc chiều tối, biểu thị ban đêm.',
        associatedWords: [
            { hanzi: '夜市', pinyin: 'yèshì', sinoViet: 'Dạ Thị', meaning: 'Chợ đêm Đài Loan' },
            { hanzi: '外帶', pinyin: 'wàidài', sinoViet: 'Ngoại Đới', meaning: 'Mua mang đi' }
        ]
    },
    {
        dayOfWeek: 1,
        radical: '辶',
        kangxiIndex: 162,
        strokes: 7,
        pinyin: 'chuò',
        sinoViet: 'SƯỚC',
        pictographMeaning: 'Tượng hình bước chân đang đi trên đường lớn, biểu thị sự di chuyển và hành trình.',
        associatedWords: [
            { hanzi: '捷運', pinyin: 'jiéyùn', sinoViet: 'Tiệp Vận', meaning: 'Tàu điện MRT' },
            { hanzi: '附近', pinyin: 'fùjìn', sinoViet: 'Phụ Cận', meaning: 'Gần đây' }
        ]
    },
    {
        dayOfWeek: 2,
        radical: '扌',
        kangxiIndex: 64,
        strokes: 3,
        pinyin: 'shǒu',
        sinoViet: 'THỦ',
        pictographMeaning: 'Tượng hình bàn tay năm ngón, xuất hiện trong các chữ chỉ động tác tay.',
        associatedWords: [
            { hanzi: '押金', pinyin: 'yājīn', sinoViet: 'Áp Kim', meaning: 'Tiền đặt cọc' },
            { hanzi: '掛號', pinyin: 'guàhào', sinoViet: 'Quái Hào', meaning: 'Đăng ký khám' }
        ]
    },
    {
        dayOfWeek: 3,
        radical: '水',
        kangxiIndex: 85,
        strokes: 4,
        pinyin: 'shuǐ',
        sinoViet: 'THỦY',
        pictographMeaning: 'Tượng hình dòng nước uốn lượn, biểu thị chất lỏng, sông ngòi hoặc đồ uống.',
        associatedWords: [
            { hanzi: '水電費', pinyin: 'shuǐdiàn fèi', sinoViet: 'Thủy Điện Phí', meaning: 'Tiền điện nước' },
            { hanzi: '少冰', pinyin: 'shǎo bīng', sinoViet: 'Thiểu Băng', meaning: 'Ít đá' }
        ]
    },
    {
        dayOfWeek: 4,
        radical: '口',
        kangxiIndex: 30,
        strokes: 3,
        pinyin: 'kǒu',
        sinoViet: 'KHẨU',
        pictographMeaning: 'Tượng hình cái miệng hoặc lối ra vào, biểu thị lời nói, ăn uống hoặc cửa ngõ.',
        associatedWords: [
            { hanzi: '出口', pinyin: 'chūkǒu', sinoViet: 'Xuất Khẩu', meaning: 'Lối ra ga MRT' },
            { hanzi: '好吃', pinyin: 'hǎochī', sinoViet: 'Hảo Khất', meaning: 'Ngon miệng' }
        ]
    },
    {
        dayOfWeek: 5,
        radical: '金',
        kangxiIndex: 167,
        strokes: 8,
        pinyin: 'jīn',
        sinoViet: 'KIM',
        pictographMeaning: 'Tượng hình quặng kim loại quý nằm dưới lòng đất, biểu thị vàng bạc, tiền tệ.',
        associatedWords: [
            { hanzi: '現金', pinyin: 'xiànjīn', sinoViet: 'Hiện Kim', meaning: 'Tiền mặt' },
            { hanzi: '多少錢', pinyin: 'duōshǎo qián', sinoViet: 'Đa Thiểu Tiền', meaning: 'Bao nhiêu tiền' }
        ]
    },
    {
        dayOfWeek: 6,
        radical: '言',
        kangxiIndex: 149,
        strokes: 7,
        pinyin: 'yán',
        sinoViet: 'NGÔN',
        pictographMeaning: 'Tượng hình làn hơi phát ra từ miệng khi nói, biểu thị ngôn từ, giao tiếp lịch sự.',
        associatedWords: [
            { hanzi: '謝謝', pinyin: 'xièxie', sinoViet: 'Tạ Tạ', meaning: 'Cảm ơn' },
            { hanzi: '請假', pinyin: 'qǐngjià', sinoViet: 'Thỉnh Giả', meaning: 'Xin nghỉ phép' }
        ]
    }
];

export function getTodayRadical(date = new Date()): DailyRadical {
    const day = date.getDay();
    return DAILY_RADICALS.find(r => r.dayOfWeek === day) ?? DAILY_RADICALS[1];
}
