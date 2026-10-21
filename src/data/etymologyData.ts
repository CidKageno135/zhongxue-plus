export interface CharacterDecomposition {
    char: string;
    pinyin: string;
    sinoViet: string;
    meaning: string;
    ruleNote?: string;
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
