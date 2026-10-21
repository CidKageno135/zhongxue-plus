import type { Lesson, Word, Scenario } from '../types';
export type { Lesson, Word, Scenario } from '../types';

type Seed = [string, string, string, string, string, string];

const seeds: {
    title: string;
    subtitle: string;
    category: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    icon: string;
    words: Seed[];
    grammar: [string, string, string, string, string];
    dialogue: [string, string, string, string][];
}[] = [
    // --- TOCFL A1: KHỞI ĐẦU ĐỜI SỐNG ĐÀI LOAN ---
    {
        title: 'Xin chào, Đài Loan!',
        subtitle: 'Chào hỏi và giới thiệu bản thân',
        category: 'Giao tiếp',
        level: 'A1',
        icon: '👋',
        words: [
            ['你好', 'nǐ hǎo', 'Xin chào', '你好，我叫小安。', 'Nǐ hǎo, wǒ jiào Xiǎo Ān.', 'Xin chào, tôi tên Tiểu An.'],
            ['謝謝', 'xièxie', 'Cảm ơn', '謝謝你的幫忙。', 'Xièxie nǐ de bāngmáng.', 'Cảm ơn sự giúp đỡ của bạn.'],
            ['名字', 'míngzi', 'Tên', '你叫什麼名字？', 'Nǐ jiào shénme míngzi?', 'Bạn tên là gì?'],
            ['越南', 'Yuènán', 'Việt Nam', '我來自越南。', 'Wǒ láizì Yuènán.', 'Tôi đến từ Việt Nam.'],
            ['很高興', 'hěn gāoxìng', 'Rất vui', '很高興認識你。', 'Hěn gāoxìng rènshi nǐ.', 'Rất vui được biết bạn.']
        ],
        grammar: ['Giới thiệu với 叫', '我叫 + tên', '叫 dùng để nói tên người. Hỏi tên bằng 你叫什麼名字？', '我叫小安。', 'Tôi tên Tiểu An.'],
        dialogue: [
            ['Tiểu An', '你好！我叫小安。', 'Nǐ hǎo! Wǒ jiào Xiǎo Ān.', 'Xin chào! Tôi tên Tiểu An.'],
            ['Bạn học', '你好，你來自哪裡？', 'Nǐ hǎo, nǐ láizì nǎlǐ?', 'Chào bạn, bạn đến từ đâu?'],
            ['Tiểu An', '我來自越南。你呢？', 'Wǒ láizì Yuènán. Nǐ ne?', 'Tôi đến từ Việt Nam. Còn bạn?'],
            ['Bạn học', '我來自臺灣。很高興認識你！', 'Wǒ láizì Táiwān. Hěn gāoxìng rènshi nǐ!', 'Tôi đến từ Đài Loan. Rất vui được biết bạn!']
        ]
    },
    {
        title: 'Một ly trà sữa nhé',
        subtitle: 'Gọi đồ uống theo ý mình',
        category: 'Ăn uống',
        level: 'A1',
        icon: '🧋',
        words: [
            ['珍珠奶茶', 'zhēnzhū nǎichá', 'Trà sữa trân châu', '我要一杯珍珠奶茶。', 'Wǒ yào yì bēi zhēnzhū nǎichá.', 'Tôi muốn một ly trà sữa trân châu.'],
            ['少冰', 'shǎo bīng', 'Ít đá', '請給我少冰。', 'Qǐng gěi wǒ shǎo bīng.', 'Cho tôi ít đá.'],
            ['半糖', 'bàn táng', 'Nửa đường', '我要半糖。', 'Wǒ yào bàn táng.', 'Tôi muốn nửa đường.'],
            ['一杯', 'yì bēi', 'Một ly', '一杯多少錢？', 'Yì bēi duōshǎo qián?', 'Một ly bao nhiêu tiền?'],
            ['外帶', 'wàidài', 'Mang đi', '我要外帶。', 'Wǒ yào wàidài.', 'Tôi muốn mang đi.']
        ],
        grammar: ['Gọi món với 要', '我要 + số lượng + món', '要 diễn đạt mong muốn. Thêm 請 để lịch sự khi nhờ người phục vụ.', '我要一杯奶茶，半糖少冰。', 'Tôi muốn một ly trà sữa, nửa đường ít đá.'],
        dialogue: [
            ['Nhân viên', '你好，要喝什麼？', 'Nǐ hǎo, yào hē shénme?', 'Chào bạn, muốn uống gì?'],
            ['Bạn', '我要一杯珍珠奶茶。', 'Wǒ yào yì bēi zhēnzhū nǎichá.', 'Tôi muốn một ly trà sữa trân châu.'],
            ['Nhân viên', '甜度和冰塊呢？', 'Tiándù hé bīngkuài ne?', 'Độ ngọt và đá thế nào?'],
            ['Bạn', '半糖少冰，外帶，謝謝。', 'Bàn táng shǎo bīng, wàidài, xièxie.', 'Nửa đường ít đá, mang đi, cảm ơn.']
        ]
    },
    {
        title: 'Đi MRT thật dễ',
        subtitle: 'Hỏi đường và mua vé',
        category: 'Di chuyển',
        level: 'A1',
        icon: '🚇',
        words: [
            ['捷運', 'jiéyùn', 'Tàu điện MRT', '我坐捷運上班。', 'Wǒ zuò jiéyùn shàngbān.', 'Tôi đi làm bằng MRT.'],
            ['車站', 'chēzhàn', 'Nhà ga', '車站在哪裡？', 'Chēzhàn zài nǎlǐ?', 'Nhà ga ở đâu?'],
            ['悠遊卡', 'yōuyóukǎ', 'Thẻ EasyCard', '我有悠遊卡。', 'Wǒ yǒu yōuyóukǎ.', 'Tôi có thẻ EasyCard.'],
            ['出口', 'chūkǒu', 'Lối ra', '請走二號出口。', 'Qǐng zǒu èr hào chūkǒu.', 'Hãy đi lối ra số hai.'],
            ['轉車', 'zhuǎn chē', 'Chuyển tàu/xe', '我要在哪裡轉車？', 'Wǒ yào zài nǎlǐ zhuǎn chē?', 'Tôi cần chuyển tàu ở đâu?']
        ],
        grammar: ['Hỏi vị trí', 'địa điểm + 在哪裡？', '在 chỉ vị trí; 哪裡 hỏi ở đâu. Không cần thêm 嗎 vào câu có từ nghi vấn.', '捷運站在哪裡？', 'Ga MRT ở đâu?'],
        dialogue: [
            ['Bạn', '請問，捷運站在哪裡？', 'Qǐngwèn, jiéyùn zhàn zài nǎlǐ?', 'Xin hỏi, ga MRT ở đâu?'],
            ['Người đi đường', '往前走，就在右邊。', 'Wǎng qián zǒu, jiù zài yòubiān.', 'Đi thẳng, ở bên phải.'],
            ['Bạn', '這裡可以用悠遊卡嗎？', 'Zhèlǐ kěyǐ yòng yōuyóukǎ ma?', 'Ở đây dùng thẻ EasyCard được không?'],
            ['Người đi đường', '可以，請從這裡進站。', 'Kěyǐ, qǐng cóng zhèlǐ jìn zhàn.', 'Được, mời vào ga từ đây.']
        ]
    },
    {
        title: 'Ăn ngon ở chợ đêm',
        subtitle: 'Gọi món và hỏi giá',
        category: 'Ăn uống',
        level: 'A1',
        icon: '🍜',
        words: [
            ['夜市', 'yèshì', 'Chợ đêm', '我們去夜市吧。', 'Wǒmen qù yèshì ba.', 'Chúng ta đi chợ đêm nhé.'],
            ['牛肉麵', 'niúròu miàn', 'Mì bò', '這碗牛肉麵很好吃。', 'Zhè wǎn niúròu miàn hěn hǎochī.', 'Tô mì bò này rất ngon.'],
            ['不要辣', 'bú yào là', 'Không cay', '我的麵不要辣。', 'Wǒ de miàn bú yào là.', 'Mì của tôi không cay.'],
            ['多少錢', 'duōshǎo qián', 'Bao nhiêu tiền', '這個多少錢？', 'Zhège duōshǎo qián?', 'Cái này bao nhiêu tiền?'],
            ['好吃', 'hǎochī', 'Ngon', '這個很好吃。', 'Zhège hěn hǎochī.', 'Món này rất ngon.']
        ],
        grammar: ['Hỏi giá', 'món đồ + 多少錢？', '多少 hỏi số lượng; 錢 là tiền. 一碗 dùng cho một tô.', '一碗牛肉麵多少錢？', 'Một tô mì bò bao nhiêu tiền?'],
        dialogue: [
            ['Bạn', '老闆，一碗牛肉麵多少錢？', 'Lǎobǎn, yì wǎn niúròu miàn duōshǎo qián?', 'Chủ quán ơi, một tô mì bò bao nhiêu?'],
            ['Chủ quán', '一碗一百五十元。', 'Yì wǎn yìbǎi wǔshí yuán.', 'Một tô 150 tệ.'],
            ['Bạn', '我要一碗，不要辣。', 'Wǒ yào yì wǎn, bú yào là.', 'Cho tôi một tô, không cay.'],
            ['Chủ quán', '好的，請稍等。', 'Hǎo de, qǐng shāo děng.', 'Được, vui lòng đợi một chút.']
        ]
    },
    {
        title: 'Mua sắm tiện lợi',
        subtitle: 'Thanh toán và lấy hóa đơn',
        category: 'Đời sống',
        level: 'A1',
        icon: '🛒',
        words: [
            ['便利商店', 'biànlì shāngdiàn', 'Cửa hàng tiện lợi', '附近有便利商店。', 'Fùjìn yǒu biànlì shāngdiàn.', 'Gần đây có cửa hàng tiện lợi.'],
            ['袋子', 'dàizi', 'Túi', '我不需要袋子。', 'Wǒ bù xūyào dàizi.', 'Tôi không cần túi.'],
            ['發票', 'fāpiào', 'Hóa đơn', '請給我發票。', 'Qǐng gěi wǒ fāpiào.', 'Xin cho tôi hóa đơn.'],
            ['現金', 'xiànjīn', 'Tiền mặt', '我用現金付錢。', 'Wǒ yòng xiànjīn fù qián.', 'Tôi thanh toán bằng tiền mặt.'],
            ['刷卡', 'shuā kǎ', 'Quẹt thẻ', '可以刷卡嗎？', 'Kěyǐ shuā kǎ ma?', 'Có thể thanh toán thẻ không?']
        ],
        grammar: ['Hỏi khả năng với 可以', '可以 + động từ + 嗎？', '可以 dùng khi hỏi việc có được phép hoặc có thể thực hiện hay không.', '可以刷卡嗎？', 'Có thể thanh toán thẻ không?'],
        dialogue: [
            ['Nhân viên', '需要袋子嗎？', 'Xūyào dàizi ma?', 'Bạn cần túi không?'],
            ['Bạn', '不用，謝謝。可以刷卡嗎？', 'Bú yòng, xièxie. Kěyǐ shuā kǎ ma?', 'Không cần, cảm ơn. Có thể quẹt thẻ không?'],
            ['Nhân viên', '可以，請在這裡感應。', 'Kěyǐ, qǐng zài zhèlǐ gǎnyìng.', 'Được, vui lòng chạm thẻ ở đây.'],
            ['Bạn', '好的，請給我發票。', 'Hǎo de, qǐng gěi wǒ fāpiào.', 'Vâng, xin cho tôi hóa đơn.']
        ]
    },

    // --- TOCFL A2: MỞ RỘNG GIAO TIẾP VÀ CÔNG VIỆC ---
    {
        title: 'Tìm một căn phòng',
        subtitle: 'Hỏi thuê nhà và chi phí',
        category: 'Đời sống',
        level: 'A2',
        icon: '🏠',
        words: [
            ['租房子', 'zū fángzi', 'Thuê nhà', '我想租房子。', 'Wǒ xiǎng zū fángzi.', 'Tôi muốn thuê nhà.'],
            ['房租', 'fángzū', 'Tiền thuê nhà', '房租一個月多少？', 'Fángzū yí ge yuè duōshǎo?', 'Tiền thuê mỗi tháng bao nhiêu?'],
            ['押金', 'yājīn', 'Tiền đặt cọc', '押金是兩個月的房租。', 'Yājīn shì liǎng ge yuè de fángzū.', 'Tiền cọc bằng hai tháng tiền thuê.'],
            ['水電費', 'shuǐdiàn fèi', 'Tiền nước và điện', '房租包含水電費嗎？', 'Fángzū bāohán shuǐdiàn fèi ma?', 'Tiền thuê có gồm điện nước không?'],
            ['附近', 'fùjìn', 'Gần đây', '附近有捷運站。', 'Fùjìn yǒu jiéyùn zhàn.', 'Gần đây có ga MRT.']
        ],
        grammar: ['Diễn đạt ý định với 想', '我想 + động từ', '想 dùng để bày tỏ ý muốn hoặc dự định nhẹ nhàng. 想要 theo sau được bởi danh từ.', '我想看看這個房間。', 'Tôi muốn xem căn phòng này.'],
        dialogue: [
            ['Bạn', '你好，我想租房子。', 'Nǐ hǎo, wǒ xiǎng zū fángzi.', 'Chào anh/chị, tôi muốn thuê nhà.'],
            ['Chủ nhà', '這間房租一個月八千元。', 'Zhè jiān fángzū yí ge yuè bā qiān yuán.', 'Phòng này mỗi tháng 8.000 tệ.'],
            ['Bạn', '包含水電費嗎？押金多少？', 'Bāohán shuǐdiàn fèi ma? Yājīn duōshǎo?', 'Có gồm điện nước không? Tiền cọc bao nhiêu?'],
            ['Chủ nhà', '不包含。押金是兩個月的房租。', 'Bù bāohán. Yājīn shì liǎng ge yuè de fángzū.', 'Không gồm. Tiền cọc bằng hai tháng tiền thuê.']
        ]
    },
    {
        title: 'Một ngày đi khám',
        subtitle: 'Nói triệu chứng và hẹn khám',
        category: 'Đời sống',
        level: 'A2',
        icon: '🏥',
        words: [
            ['掛號', 'guàhào', 'Đăng ký khám', '我要掛號。', 'Wǒ yào guàhào.', 'Tôi muốn đăng ký khám.'],
            ['健保卡', 'jiànbǎokǎ', 'Thẻ bảo hiểm y tế', '這是我的健保卡。', 'Zhè shì wǒ de jiànbǎokǎ.', 'Đây là thẻ bảo hiểm của tôi.'],
            ['頭痛', 'tóu tòng', 'Đau đầu', '我今天頭痛。', 'Wǒ jīntiān tóu tòng.', 'Hôm nay tôi đau đầu.'],
            ['發燒', 'fāshāo', 'Sốt', '我昨天開始發燒。', 'Wǒ zuótiān kāishǐ fāshāo.', 'Tôi bắt đầu sốt từ hôm qua.'],
            ['不舒服', 'bù shūfu', 'Không khỏe', '我有一點不舒服。', 'Wǒ yǒu yìdiǎn bù shūfu.', 'Tôi hơi không khỏe.']
        ],
        grammar: ['Nói mốc bắt đầu', 'thời gian + 開始 + trạng thái', '開始 là bắt đầu. Dùng 昨天 (hôm qua) hoặc 今天 (hôm nay) để cho biết lúc xuất hiện triệu chứng.', '我昨天開始頭痛。', 'Tôi bắt đầu đau đầu từ hôm qua.'],
        dialogue: [
            ['Bạn', '你好，我要掛號。', 'Nǐ hǎo, wǒ yào guàhào.', 'Chào chị, tôi muốn đăng ký khám.'],
            ['Lễ tân', '請給我健保卡。', 'Qǐng gěi wǒ jiànbǎokǎ.', 'Vui lòng đưa tôi thẻ bảo hiểm.'],
            ['Bác sĩ', '哪裡不舒服？', 'Nǎlǐ bù shūfu?', 'Bạn thấy khó chịu ở đâu?'],
            ['Bạn', '我昨天開始頭痛，也有一點發燒。', 'Wǒ zuótiān kāishǐ tóu tòng, yě yǒu yìdiǎn fāshāo.', 'Tôi đau đầu từ hôm qua và hơi sốt.']
        ]
    },
    {
        title: 'Kết nối ở nơi làm việc',
        subtitle: 'Nhờ giúp đỡ và xác nhận lịch',
        category: 'Công việc',
        level: 'A2',
        icon: '💼',
        words: [
            ['上班', 'shàngbān', 'Đi làm', '我九點上班。', 'Wǒ jiǔ diǎn shàngbān.', 'Tôi đi làm lúc chín giờ.'],
            ['開會', 'kāihuì', 'Họp', '我們下午開會。', 'Wǒmen xiàwǔ kāihuì.', 'Chúng ta họp buổi chiều.'],
            ['幫忙', 'bāngmáng', 'Giúp đỡ', '可以請你幫忙嗎？', 'Kěyǐ qǐng nǐ bāngmáng ma?', 'Có thể nhờ bạn giúp không?'],
            ['請假', 'qǐngjià', 'Xin nghỉ phép', '我明天想請假。', 'Wǒ míngtiān xiǎng qǐngjià.', 'Ngày mai tôi muốn xin nghỉ.'],
            ['再說一次', 'zài shuō yí cì', 'Nói lại một lần', '請再說一次。', 'Qǐng zài shuō yí cì.', 'Vui lòng nói lại một lần.']
        ],
        grammar: ['Nhờ giúp đỡ lịch sự', '可以請你 + động từ + 嗎？', 'Thêm 請你 giúp lời nhờ lịch sự. 再 + động từ diễn tả làm lại một việc.', '可以請你再說一次嗎？', 'Có thể nhờ bạn nói lại một lần không?'],
        dialogue: [
            ['Đồng nghiệp', '我們明天下午兩點開會。', 'Wǒmen míngtiān xiàwǔ liǎng diǎn kāihuì.', 'Ngày mai chúng ta họp lúc hai giờ chiều.'],
            ['Bạn', '不好意思，可以再說一次嗎？', 'Bù hǎoyìsi, kěyǐ zài shuō yí cì ma?', 'Xin lỗi, bạn có thể nói lại không?'],
            ['Đồng nghiệp', '明天下午兩點，在會議室。', 'Míngtiān xiàwǔ liǎng diǎn, zài huìyì shì.', 'Hai giờ chiều mai, ở phòng họp.'],
            ['Bạn', '好的，我知道了，謝謝你。', 'Hǎo de, wǒ zhīdào le, xièxie nǐ.', 'Vâng, tôi hiểu rồi, cảm ơn bạn.']
        ]
    },

    // --- TOCFL B1: TRUNG CẤP 1 - TIẾN BƯỚC ĐÀI LOAN ---
    {
        title: 'Mở tài khoản ngân hàng & Bưu điện',
        subtitle: 'Thủ tục mở thẻ ATM và chuyển tiền kiều hối',
        category: 'Tài chính',
        level: 'B1',
        icon: '🏦',
        words: [
            ['銀行', 'yínháng', 'Ngân hàng', '我想去銀行開戶。', 'Wǒ xiǎng qù yínháng kāihù.', 'Tôi muốn đến ngân hàng mở tài khoản.'],
            ['開戶', 'kāihù', 'Mở tài khoản', '開戶需要帶居留證。', 'Kāihù xūyào dài jūliúzhèng.', 'Mở tài khoản cần mang thẻ cư trú.'],
            ['印章', 'yìnzhāng', 'Con dấu', '請在開戶表格蓋印章。', 'Qǐng zài kāihù biǎogé gài yìnzhāng.', 'Vui lòng đóng dấu vào tờ khai mở tài khoản.'],
            ['居留證', 'jūliúzhèng', 'Thẻ cư trú ARC', '居留證是重要的證件。', 'Jūliúzhèng shì zhòngyào de zhèngjiàn.', 'Thẻ cư trú là giấy tờ quan trọng.'],
            ['匯款', 'huìkuǎn', 'Chuyển tiền', '我想匯款回越南。', 'Wǒ xiǎng huìkuǎn huí Yuènán.', 'Tôi muốn chuyển tiền về Việt Nam.']
        ],
        grammar: ['Câu chữ 把', '把 + tân ngữ + động từ + kết quả', '把 dùng để nhấn mạnh sự xử lý và thay đổi trạng thái của tân ngữ.', '請把居留證和印章給我。', 'Vui lòng đưa thẻ cư trú và con dấu cho tôi.'],
        dialogue: [
            ['Bạn', '你好，我想開戶和辦提款卡。', 'Nǐ hǎo, wǒ xiǎng kāihù hàn bàn tíkuǎnkǎ.', 'Xin chào, tôi muốn mở tài khoản và làm thẻ ATM.'],
            ['Giao dịch viên', '請把居留證、護照和印章借我看。', 'Qǐng bǎ jūliúzhèng, hùzhào hàn yìnzhāng jiè wǒ kàn.', 'Vui lòng cho tôi mượn thẻ cư trú, hộ chiếu và con dấu.'],
            ['Bạn', '好的，這是我的證件。', 'Hǎo de, zhè shì wǒ de zhèngjiàn.', 'Vâng, đây là giấy tờ của tôi.'],
            ['Giao dịch viên', '請在這一頁簽名並蓋章。', 'Qǐng zài zhè yí yè qiānmíng bìng gài zhāng.', 'Vui lòng ký tên và đóng dấu vào trang này.']
        ]
    },
    {
        title: 'Thuê xe máy vi vu phố phường',
        subtitle: 'Hỏi thuê xe, đổ xăng và quy định giao thông',
        category: 'Di chuyển',
        level: 'B1',
        icon: '🛵',
        words: [
            ['機車', 'jīchē', 'Xe máy', '臺灣人很喜歡騎機車。', 'Táiwān rén hěn xǐhuān qí jīchē.', 'Người Đài Loan rất thích đi xe máy.'],
            ['安全帽', 'ānquánmào', 'Mũ bảo hiểm', '騎機車一定要戴安全帽。', 'Qí jīchē yídìng yào dài ānquánmào.', 'Đi xe máy nhất định phải đội mũ bảo hiểm.'],
            ['加油站', 'jiāyóuzhàn', 'Trạm xăng', '前面有一家加油站。', 'Qiánmiàn yǒu yì jiā jiāyóuzhàn.', 'Phía trước có một trạm xăng.'],
            ['駕照', 'jiàzhào', 'Bằng lái xe', '請問你有國際駕照嗎？', 'Qǐngwèn nǐ yǒu guójì jiàzhào ma?', 'Xin hỏi bạn có bằng lái quốc tế không?'],
            ['風景', 'fēngjǐng', 'Phong cảnh', '九份的山海風景很漂亮。', 'Jiǔfèn de shānhǎi fēngjǐng hěn piàoliang.', 'Phong cảnh núi biển ở Cửu Phần rất đẹp.']
        ],
        grammar: ['Cặp liên từ 不但...而且...', '不但 + vế 1, 而且 + vế 2', 'Diễn đạt quan hệ tăng tiến: không những... mà còn...', '騎機車不但方便，而且省時間。', 'Đi xe máy không những tiện mà còn tiết kiệm thời gian.'],
        dialogue: [
            ['Bạn', '老闆，我想租一台機車去九份看風景。', 'Lǎobǎn, wǒ xiǎng zū yì tái jīchē qù Jiǔfèn kàn fēngjǐng.', 'Chủ quán ơi, tôi muốn thuê một chiếc xe máy đi Cửu Phần ngắm cảnh.'],
            ['Chủ tiệm', '沒問題，請出示你的駕照。一天六百元。', 'Méi wèntí, qǐng chūshì nǐ de jiàzhào. Yì tiān liùbǎi yuán.', 'Không vấn đề, vui lòng xuất trình bằng lái xe. Một ngày 600 tệ.'],
            ['Bạn', '租金包含安全帽嗎？', 'Zūjīn bāohán ānquánmào ma?', 'Giá thuê có kèm mũ bảo hiểm không?'],
            ['Chủ tiệm', '包含兩頂安全帽，前面右轉有加油站。', 'Bāohán liǎng dǐng ānquánmào, qiánmiàn yòuzhuǎn yǒu jiāyóuzhàn.', 'Kèm 2 mũ bảo hiểm, rẽ phải phía trước có trạm xăng.']
        ]
    },
    {
        title: 'Phỏng vấn xin việc & CV',
        subtitle: 'Giới thiệu kinh nghiệm và mức lương kỳ vọng',
        category: 'Nghề nghiệp',
        level: 'B1',
        icon: '👔',
        words: [
            ['履歷', 'lǚlì', 'Sơ yếu lý lịch / CV', '我已經寄出履歷表。', 'Wǒ yǐjīng jì chū lǚlì biǎo.', 'Tôi đã gửi sơ yếu lý lịch.'],
            ['面試', 'miànshì', 'Phỏng vấn', '明天下午我有工作面試。', 'Míngtiān xiàwǔ wǒ yǒu gōngzuò miànshì.', 'Chiều mai tôi có buổi phỏng vấn xin việc.'],
            ['經驗', 'jīngyàn', 'Kinh nghiệm', '我有三年的工作經驗。', 'Wǒ yǒu sān nián de gōngzuò jīngyàn.', 'Tôi có ba năm kinh nghiệm làm việc.'],
            ['薪水', 'xīnshuǐ', 'Lương', '這份工作的待遇和薪水很好。', 'Zhè fèn gōngzuò de dàiyù hàn xīnshuǐ hěn hǎo.', 'Đãi ngộ và tiền lương của công việc này rất tốt.'],
            ['專長', 'zhuāncháng', 'Chuyên môn / Sở trường', '我的專長是軟體開發。', 'Wǒ de zhuāncháng shì ruǎntǐ kāifā.', 'Chuyên môn của tôi là phát triển phần mềm.']
        ],
        grammar: ['Câu bị động với 被', 'chủ ngữ + 被 + tác nhân + động từ', 'Diễn đạt ý bị động hoặc được tác động trong ngữ cảnh chuyên nghiệp.', '我被主管稱讚工作認真。', 'Tôi được quản lý khen ngợi làm việc chăm chỉ.'],
        dialogue: [
            ['Nhà tuyển dụng', '請簡單介紹你的工作經驗和專長。', 'Qǐng jiǎndān jièshào nǐ de gōngzuò jīngyàn hàn zhuāncháng.', 'Xin hãy giới thiệu ngắn gọn kinh nghiệm và chuyên môn của bạn.'],
            ['Bạn', '我在軟體領域有三年經驗，擅長團隊溝通。', 'Wǒ zài ruǎntǐ lǐngyù yǒu sān nián jīngyàn, shàncháng tuánduì gōutōng.', 'Tôi có 3 năm kinh nghiệm trong lĩnh vực phần mềm, giỏi giao tiếp nhóm.'],
            ['Nhà tuyển dụng', '請問你期望的薪水待遇是多少？', 'Qǐngwèn nǐ qīwàng de xīnshuǐ dàiyù shì duōshǎo?', 'Xin hỏi mức lương đãi ngộ bạn kỳ vọng là bao nhiêu?'],
            ['Bạn', '我期望的月薪是五萬五千元左右。', 'Wǒ qīwàng de yuèxīn shì wǔwàn wǔqiān yuán zuǒyòu.', 'Mức lương tháng kỳ vọng của tôi vào khoảng 55.000 Đài tệ.']
        ]
    },
    {
        title: 'Lễ hội Trung thu & Đặc sản',
        subtitle: 'Nét đẹp phong tục và ẩm thực Đài Loan',
        category: 'Văn hóa',
        level: 'B1',
        icon: '🥮',
        words: [
            ['中秋節', 'zhōngqiūjié', 'Tết Trung thu', '中秋節臺灣人習慣烤肉。', 'Zhōngqiūjié Táiwān rén xíguàn kǎoròu.', 'Tết Trung thu người Đài Loan có thói quen nướng thịt.'],
            ['烤肉', 'kǎoròu', 'Nướng thịt BBQ', '今晚大家一起在騎樓烤肉。', 'Jīnwǎn dàjiā yìqǐ zài qílóu kǎoròu.', 'Tối nay mọi người cùng nướng thịt dưới mái hiên.'],
            ['鳳梨酥', 'fènglísū', 'Bánh dứa Đài Loan', '鳳梨酥是臺灣著名的伴手禮。', 'Fènglísū shì Táiwān zhùmíng de bànshǒulǐ.', 'Bánh dứa là món quà biếu nổi tiếng của Đài Loan.'],
            ['傳統', 'chuántǒng', 'Truyền thống', '這家老店保留了百年傳統。', 'Zhè jiā lǎodiàn bǎoliú le bǎinián chuántǒng.', 'Tiệm lâu đời này giữ gìn truyền thống trăm năm.'],
            ['熱情', 'rèqíng', 'Nhiệt tình / Hiếu khách', '臺灣人對朋友非常熱情。', 'Táiwān rén duì péngyou fēicháng rèqíng.', 'Người Đài Loan rất nhiệt tình với bạn bè.']
        ],
        grammar: ['Biến chuyển dần với 越來越...', 'chủ ngữ + 越來越 + tính từ', 'Biểu đạt sự tiến triển tăng tiến dần theo thời gian.', '我越來越喜歡臺灣的文化與人情味。', 'Tôi ngày càng yêu thích văn hóa và tình người Đài Loan.'],
        dialogue: [
            ['Bạn học Đài', '小安，中秋節要不要來我家烤肉？', 'Xiǎo Ān, zhōngqiūjié yào bú yào lái wǒ jiā kǎoròu?', 'Tiểu An, Trung thu này có muốn qua nhà mình nướng thịt không?'],
            ['Bạn', '好啊！我買了有名的鳳梨酥送你們。', 'Hǎo a! Wǒ mǎi le yǒumíng de fènglísū sòng nǐmen.', 'Được chứ! Mình đã mua bánh dứa nổi tiếng để tặng mọi người.'],
            ['Bạn học Đài', '太客氣了！你真是越來越融入生活了。', 'Tài kèqi le! Nǐ zhēnshì yuèláiyuè róngrù shēnghuó le.', 'Khách sáo quá! Cậu thật sự ngày càng hòa nhập với cuộc sống rồi.'],
            ['Bạn', '謝謝你，祝你中秋節快樂！', 'Xièxie nǐ, zhù nǐ zhōngqiūjié kuàilè!', 'Cảm ơn bạn, chúc bạn Trung thu vui vẻ!']
        ]
    },

    // --- TOCFL B2: TRUNG CẤP 2 - CHUYÊN SÂU & HỘI NHẬP ---
    {
        title: 'Đàm phán thương mại & Hợp đồng',
        subtitle: 'Thỏa thuận điều khoản, ký kết và phân chia lợi nhuận',
        category: 'Thương mại',
        level: 'B2',
        icon: '📑',
        words: [
            ['合約', 'héyuē', 'Hợp đồng thương mại', '雙方正式簽署長期合作合約。', 'Shuāngfāng zhèngshì qiānshǔ chángqí hézuò héyuē.', 'Hai bên chính thức ký kết hợp đồng hợp tác dài hạn.'],
            ['合作', 'hézuò', 'Hợp tác đối tác', '我們非常期待未來的合作機會。', 'Wǒmen fēicháng qīdài wèilái de hézuò jīhuì.', 'Chúng tôi rất kỳ vọng vào cơ hội hợp tác trong tương lai.'],
            ['條件', 'tiáojiàn', 'Điều kiện / Điều khoản', '這個付款條件對雙方都合理。', 'Zhège fùkuǎn tiáojiàn duì shuāngfāng dōu hélǐ.', 'Điều khoản thanh toán này hợp lý cho cả hai bên.'],
            ['簽約', 'qiānyuē', 'Ký kết hợp đồng', '我們預計下週一正式簽約。', 'Wǒmen yùjì xià zhōuyī zhèngshì qiānyuē.', 'Chúng tôi dự kiến thứ Hai tuần sau chính thức ký kết.'],
            ['利潤', 'lìrùn', 'Lợi nhuận', '提升生產效率有助於提高利潤。', 'Tíshēng shēngchǎn xiàolǜ yǒuzhùyú tígāo lìrùn.', 'Nâng cao hiệu suất sản xuất giúp tăng lợi nhuận.']
        ],
        grammar: ['Giả định điều kiện 只要...就...', '只要 + điều kiện, 就 + kết quả', 'Biểu đạt điều kiện cần và đủ trong giao dịch thương mại.', '只要雙方達成共識，我們就立即簽約。', 'Chỉ cần hai bên đạt được đồng thuận, chúng tôi sẽ ký hợp đồng ngay.'],
        dialogue: [
            ['Đối tác', '關於這份合約的付款條件，貴公司有什麼意見？', 'Guānyú zhè fèn héyuē de fùkuǎn tiáojiàn, guì gōngsī yǒu shénme yìjiàn?', 'Về điều khoản thanh toán trong hợp đồng này, quý công ty có ý kiến gì không?'],
            ['Bạn', '只要能分期付款，我們非常樂意合作。', 'Zhǐyào néng fēnqí fùkuǎn, wǒmen fēicháng lèyì hézuò.', 'Chỉ cần có thể trả góp nhiều kỳ, chúng tôi rất sẵn lòng hợp tác.'],
            ['Đối tác', '沒問題，這樣能兼顧彼此的利潤與現金流。', 'Méi wèntí, zhèyàng néng jiāngù bǐcǐ de lìrùn hàn xiànjīnliú.', 'Không vấn đề, như vậy có thể đảm bảo lợi nhuận và dòng tiền của đôi bên.'],
            ['Bạn', '那麼我們週五正式簽約，預祝合作愉快！', 'Nàme wǒmen zhōuwǔ zhèngshì qiānyuē, yù zhù hézuò yúkuài!', 'Vậy thứ Sáu chúng ta chính thức ký kết, chúc hợp tác vui vẻ!']
        ]
    },
    {
        title: 'Bán dẫn & Đổi mới công nghệ',
        subtitle: 'Chuỗi cung ứng chip vi mạch và nghiên cứu phát triển',
        category: 'Công nghệ',
        level: 'B2',
        icon: '🔬',
        words: [
            ['晶片', 'jīngpiàn', 'Chip vi mạch / Vi xử lý', '先進製程晶片在全球供應鏈居關鍵地位。', 'Xiānjìn zhìchéng jīngpiàn zài quánqiú gōngyìngliàn jū guānjiàn dìwèi.', 'Chip sản xuất tiên tiến giữ vị thế cốt lõi trong chuỗi cung ứng toàn cầu.'],
            ['半導體', 'bàndǎotǐ', 'Chất bán dẫn', '新竹科學園區是半導體重鎮。', 'Xīnzhú kēxué yuánqū shì bàndǎotǐ zhòngzhèn.', 'Khu công nghệ cao Tân Trúc là cứ điểm trọng yếu của ngành bán dẫn.'],
            ['創新', 'chuàngxīn', 'Đổi mới sáng tạo', '技術創新是產業保持領先的基石。', 'Jìshù chuàngxīn shì chǎnyè bǎochí lǐngxiān de jīshí.', 'Đổi mới công nghệ là nền móng giữ vững vị thế dẫn đầu ngành.'],
            ['科技', 'kējì', 'Khoa học công nghệ', '現代科技大幅改變了人們的生活。', 'Xiàndài kējì dàfú gǎibiàn le rénmen de shēnghuó.', 'Khoa học công nghệ hiện đại thay đổi sâu sắc đời sống con người.'],
            ['研發', 'yánfā', 'Nghiên cứu & Phát triển (R&D)', '公司每年投入大筆資金進行研發。', 'Gōngsī měinián tóurù dàbǐ zījīn jìnxíng yánfā.', 'Công ty hàng năm đầu tư nguồn vốn lớn vào nghiên cứu phát triển.']
        ],
        grammar: ['Phân tích nguyên nhân 由於...因此...', '由於 + nguyên nhân, 因此 + kết quả', 'Biểu thị phân tích nguyên nhân - hệ quả trang trọng trong báo cáo kỹ thuật.', '由於市場需求增加，因此公司擴大了研發規模。', 'Do nhu cầu thị trường tăng, vì vậy công ty đã mở rộng quy mô R&D.'],
        dialogue: [
            ['Kỹ sư A', '臺灣在半導體晶片製造領域具備全球領先優勢。', 'Táiwān zài bàndǎotǐ jīngpiàn zhìzào lǐngyù jùbèi quánqiú lǐngxiān yōushì.', 'Đài Loan sở hữu ưu thế dẫn đầu toàn cầu trong lĩnh vực sản xuất chip bán dẫn.'],
            ['Bạn', '是的，持續投入研發和製程創新非常關鍵。', 'Shì de, chíxù tóurù yánfā hàn zhìchéng chuàngxīn fēicháng guānjiàn.', 'Đúng vậy, liên tục đầu tư vào R&D và đổi mới quy trình sản xuất là then chốt.'],
            ['Kỹ sư A', '科技人才的培育更是產業發展的核心動能。', 'Kējì réncái de péiyù gèng shì chǎnyè fāzhǎn de héxīn dòngnéng.', 'Đào tạo nhân tài công nghệ còn là động lực cốt lõi của phát triển công nghiệp.'],
            ['Bạn', '相信未來的合作能帶來更多突破。', 'Xiāngxìn wèilái de hézuò néng dàilái gèng duō tūpò.', 'Tin rằng sự hợp tác trong tương lai sẽ mang lại nhiều đột phá hơn nữa.']
        ]
    },
    {
        title: 'Kê khai thuế & Phúc lợi lao động',
        subtitle: 'Quyền lợi người lao động và luật thuế Đài Loan',
        category: 'Pháp lý',
        level: 'B2',
        icon: '⚖️',
        words: [
            ['報稅', 'bàoshuì', 'Kê khai nộp thuế', '每年五月是臺灣綜所稅報稅季。', 'Měinián wǔ yuè shì Táiwān zòngsuǒshuì bàoshuì jì.', 'Tháng 5 hàng năm là mùa kê khai thuế thu nhập tổng hợp ở Đài Loan.'],
            ['勞保', 'láobǎo', 'Bảo hiểm lao động', '依法投保勞保保障工作安全。', 'Yīfǎ tóubǎo láobǎo bǎozhàng gōngzuò ānquán.', 'Tham gia bảo hiểm lao động theo luật định bảo đảm an toàn khi làm việc.'],
            ['權益', 'quányì', 'Quyền lợi hợp pháp', '勞工應充分了解自身法定權益。', 'Láogōng yīng chōngfèn liǎojiě zìshēn fǎdìng quányì.', 'Người lao động nên nắm rõ các quyền lợi pháp định của bản thân.'],
            ['規定', 'guīdìng', 'Quy định pháp lý', '請務必遵守公司的安全作業規定。', 'Qǐng wùbì zūnshǒu gōngsī de ānquán zuòyè guīdìng.', 'Xin hãy tuân thủ nghiêm ngặt quy định vận hành an toàn của công ty.'],
            ['扣除額', 'kòuchú\'é', 'Mức giảm trừ gia cảnh / thuế', '標準扣除額減輕了納稅人的負擔。', 'Biāozhǔn kòuchú\'é jiǎnqīng le nàshuìrén de fùdān.', 'Mức giảm trừ tiêu chuẩn đã giảm nhẹ gánh nặng cho người nộp thuế.']
        ],
        grammar: ['Nhấn mạnh phổ quát 凡是...都...', '凡是 + điều kiện, 都 + kết quả', 'Nhấn mạnh mọi đối tượng đều áp dụng cùng một nguyên tắc pháp luật.', '凡是在臺灣合法工作的員工，都享有勞保權益。', 'Mọi nhân viên làm việc hợp pháp ở Đài Loan đều được hưởng quyền lợi bảo hiểm lao động.'],
        dialogue: [
            ['Nhân sự HR', '五月份到了，外籍同仁也要記得辦理綜合所得稅報稅。', 'Wǔ yuèfèn dào le, wàijí tóngrén yě yào jìde bànlǐ zònghé suǒdéshuì bàoshuì.', 'Tháng 5 tới rồi, đồng nghiệp nước ngoài cũng nhớ làm thủ tục kê khai thuế nhé.'],
            ['Bạn', '請問我們可以使用健保卡或自然人憑證線上報稅嗎？', 'Qǐngwèn wǒmen kěyǐ yòng jiànbǎokǎ huò zìránrén píngzhèng xiànshàng bàoshuì ma?', 'Xin hỏi chúng tôi có thể dùng thẻ bảo hiểm y tế để khai thuế online không?'],
            ['Nhân sự HR', '可以，線上申報系統會自動計算扣除額和應繳稅額。', 'Kěyǐ, xiànshàng shēnbào xìtǒng huì zìdòng jìsuàn kòuchú\'é hàn yīngjiǎo shuì\'é.', 'Được chứ, hệ thống trực tuyến sẽ tự động tính mức giảm trừ và số thuế phải nộp.'],
            ['Bạn', '非常感謝您的提醒，我會依規定及時辦理。', 'Fēicháng gǎnxiè nín de tíxǐng, wǒ huì yī guīdìng jíshí bànlǐ.', 'Rất cảm ơn lời nhắc của chị, tôi sẽ làm thủ tục kịp thời theo quy định.']
        ]
    },
    {
        title: 'Diễn thuyết & Báo cáo chuyên đề',
        subtitle: 'Trình bày quan điểm học thuật và đúc kết xu hướng',
        category: 'Học thuật',
        level: 'B2',
        icon: '🎤',
        words: [
            ['演講', 'yǎnjiǎng', 'Bài diễn thuyết / Thuyết trình', '他在研討會上發表了一場精彩的演講。', 'Tā zài yántǎohuì shàng fābiǎo le yì chǎng jīngcǎi de yǎnjiǎng.', 'Anh ấy đã có một bài phát biểu xuất sắc tại hội thảo.'],
            ['觀點', 'guāndiǎn', 'Quan điểm / Góc nhìn', '每位專家提出了不同的分析觀點。', 'Měi wèi zhuānjiā tíchū le bùtóng de fēnxī guāndiǎn.', 'Mỗi chuyên gia đều đưa ra góc nhìn phân tích khác nhau.'],
            ['影響', 'yǐngxiǎng', 'Ảnh hưởng / Tác động', '數位轉型對傳統產業帶來深遠影響。', 'Shùwèi zhuǎnxíng duì chuántǒng chǎnyè dàilái shēnyuǎn yǐngxiǎng.', 'Chuyển đổi số mang lại tác động sâu rộng đối với các ngành nghề truyền thống.'],
            ['趨勢', 'qūshì', 'Xu hướng / Trào lưu', '人工智慧應用已成為全球不可逆的趨勢。', 'Réngōng zhìhuì yìngyòng yǐ chéngwéi quánqiú bùkěnì de qūshì.', 'Ứng dụng trí tuệ nhân tạo đã trở thành xu hướng tất yếu trên toàn cầu.'],
            ['總結', 'zǒngjié', 'Tổng kết / Đúc kết', '請針對今天的會議討論做簡短總結。', 'Qǐng zhēnduì jīntiān de huìyì tǎolùn zuò jiǎnduǎn zǒngjié.', 'Vui lòng làm một bản tổng kết ngắn gọn cho buổi thảo luận hôm nay.']
        ],
        grammar: ['Tổng kết đúc kết 綜上所述', '綜上所述 + kết luận', 'Dùng để mở đầu phần kết luận cô đọng của bài thuyết trình báo cáo.', '綜上所述，持續自主學習是掌握語言的關鍵。', 'Tóm lại, liên tục tự học chủ động là chìa khóa để làm chủ một ngôn ngữ.'],
        dialogue: [
            ['Người chủ trì', '感謝您的精彩演講，對產業趨勢分析非常深刻。', 'Gǎnxiè nín de jīngcǎi yǎnjiǎng, duì chǎnyè qūshì fēnxī fēicháng shēnkè.', 'Cảm ơn bài diễn thuyết xuất sắc của bạn, phân tích xu hướng rất sâu sắc.'],
            ['Bạn', '謝謝大家的聆聽，希望能為大家帶來新的觀點。', 'Xièxie dàjiā de língtīng, xīwàng néng wèi dàjiā dàilái xīn de guāndiǎn.', 'Cảm ơn mọi người đã lắng nghe, hy vọng có thể mang lại góc nhìn mới mẻ.'],
            ['Người chủ trì', '綜上所述，跨領域合作確實是未來發展不可或缺的基石。', 'Zòngshàngsuǒshù, kuà lǐngyù hézuò quèshí shì wèilái fāzhǎn bùkěhuòquē de jīshí.', 'Tóm lại, hợp tác liên ngành đích thực là nền tảng không thể thiếu cho tương lai.'],
            ['Bạn', '正是如此，期待未來與各位有更多深入探討。', 'Zhèngshì rúcǐ, qīdài wèilái yǔ gèwèi yǒu gèng duō shēnrù tàntǎo.', 'Đúng là như vậy, mong chờ trong tương lai sẽ có nhiều thảo luận sâu hơn với quý vị.']
        ]
    }
];

export const lessons: Lesson[] = seeds.map((s, i) => {
    const id = `lesson-${i + 1}`;
    return {
        id,
        title: s.title,
        subtitle: s.subtitle,
        category: s.category,
        level: s.level,
        duration: 10 + i,
        icon: s.icon,
        color: ['sage', 'amber', 'blue', 'rose'][i % 4],
        words: s.words.map((w, j) => ({
            id: `${id}-word-${j + 1}`,
            hanzi: w[0],
            pinyin: w[1],
            meaning: w[2],
            example: w[3],
            examplePinyin: w[4],
            exampleMeaning: w[5],
            lessonId: id,
            category: s.category
        })),
        grammar: [
            {
                title: s.grammar[0],
                pattern: s.grammar[1],
                explanation: s.grammar[2],
                example: s.grammar[3],
                meaning: s.grammar[4]
            }
        ],
        dialogue: s.dialogue.map(d => ({
            speaker: d[0],
            hanzi: d[1],
            pinyin: d[2],
            meaning: d[3]
        })),
        quiz: s.words.slice(0, 4).map((w, j) => ({
            question: j % 2 === 0 ? `“${w[0]}” (${w[1]}) có nghĩa là gì?` : `Chọn cách nói “${w[2]}” bằng tiếng Hoa.`,
            options: [
                ...Array.from({ length: 4 }, (_, k) => s.words[(j + ((k - ([2, 0, 3, 1][(j + i) % 4]) + 4) % 4)) % 5][j % 2 === 0 ? 2 : 0])
            ],
            answer: [2, 0, 3, 1][(j + i) % 4],
            explanation: `${w[0]} nghĩa là “${w[2]}”. Ví dụ: ${w[3]} — ${w[5]}`
        }))
    };
});

export const allWords: Word[] = lessons.flatMap(l => l.words);

function scenario(
    id: string,
    title: string,
    description: string,
    icon: string,
    opening: [string, string, string],
    reply: [string, string, string],
    follow: [string, string, string],
    finish: [string, string, string]
): Scenario {
    return {
        id,
        title,
        description,
        icon,
        level: 'A1–B2',
        start: 'start',
        nodes: {
            start: {
                id: 'start',
                speaker: 'Người đối thoại',
                hanzi: opening[0],
                pinyin: opening[1],
                meaning: opening[2],
                choices: [
                    {
                        text: reply[0],
                        pinyin: reply[1],
                        meaning: reply[2],
                        next: 'follow',
                        feedback: 'Tự nhiên và đúng tình huống. Tiếp tục nào!',
                        correct: true
                    },
                    {
                        text: '我聽不懂，可以再說一次嗎？',
                        pinyin: 'Wǒ tīng bù dǒng, kěyǐ zài shuō yí cì ma?',
                        meaning: 'Tôi chưa hiểu, bạn có thể nói lại không?',
                        next: 'clarify',
                        feedback: 'Biết nhờ nhắc lại cũng là một kỹ năng giao tiếp tốt.',
                        correct: true
                    },
                    {
                        text: '我要去睡覺。',
                        pinyin: 'Wǒ yào qù shuìjiào.',
                        meaning: 'Tôi muốn đi ngủ.',
                        next: 'retry',
                        feedback: 'Câu đúng ngữ pháp nhưng chưa trả lời câu hỏi. Hãy thử lại.',
                        correct: false
                    }
                ]
            },
            clarify: {
                id: 'clarify',
                speaker: 'Người đối thoại',
                hanzi: opening[0],
                pinyin: opening[1],
                meaning: opening[2],
                choices: [
                    {
                        text: reply[0],
                        pinyin: reply[1],
                        meaning: reply[2],
                        next: 'follow',
                        feedback: 'Bạn đã hiểu và trả lời phù hợp!',
                        correct: true
                    }
                ]
            },
            retry: {
                id: 'retry',
                speaker: 'Gợi ý',
                hanzi: opening[0],
                pinyin: opening[1],
                meaning: opening[2],
                choices: [
                    {
                        text: reply[0],
                        pinyin: reply[1],
                        meaning: reply[2],
                        next: 'follow',
                        feedback: 'Đúng rồi! Tiếp tục cuộc trò chuyện.',
                        correct: true
                    }
                ]
            },
            follow: {
                id: 'follow',
                speaker: 'Người đối thoại',
                hanzi: follow[0],
                pinyin: follow[1],
                meaning: follow[2],
                choices: [
                    {
                        text: finish[0],
                        pinyin: finish[1],
                        meaning: finish[2],
                        next: 'end',
                        feedback: 'Bạn đã hoàn thành tình huống. Hãy thử nói lại cả cuộc hội thoại thành tiếng.',
                        correct: true
                    },
                    {
                        text: '不好意思，可以慢一點嗎？',
                        pinyin: 'Bù hǎoyìsi, kěyǐ màn yìdiǎn ma?',
                        meaning: 'Xin lỗi, có thể nói chậm một chút không?',
                        next: 'slow',
                        feedback: 'Lời nhờ rất lịch sự. Đọc lại rồi trả lời nhé.',
                        correct: true
                    }
                ]
            },
            slow: {
                id: 'slow',
                speaker: 'Người đối thoại',
                hanzi: follow[0],
                pinyin: follow[1],
                meaning: follow[2],
                choices: [
                    {
                        text: finish[0],
                        pinyin: finish[1],
                        meaning: finish[2],
                        next: 'end',
                        feedback: 'Rất tốt! Bạn đã hoàn thành.',
                        correct: true
                    }
                ]
            },
            end: {
                id: 'end',
                speaker: 'Hoàn thành',
                hanzi: '謝謝，祝你有美好的一天！',
                pinyin: 'Xièxie, zhù nǐ yǒu měihǎo de yì tiān!',
                meaning: 'Cảm ơn, chúc bạn một ngày tốt lành!',
                choices: [],
                end: true
            }
        }
    };
}

export const scenarios: Scenario[] = [
    scenario(
        'tea',
        'Gọi trà sữa',
        'Tự chọn món, độ ngọt và đá tại quầy.',
        '🧋',
        ['你好，想喝什麼？', 'Nǐ hǎo, xiǎng hē shénme?', 'Chào bạn, bạn muốn uống gì?'],
        ['我要一杯珍珠奶茶。', 'Wǒ yào yì bēi zhēnzhū nǎichá.', 'Tôi muốn một ly trà sữa trân châu.'],
        ['甜度和冰塊呢？', 'Tiándù hé bīngkuài ne?', 'Độ ngọt và đá thế nào?'],
        ['半糖少冰，謝謝。', 'Bàn táng shǎo bīng, xièxie.', 'Nửa đường ít đá, cảm ơn.']
    ),
    scenario(
        'mrt',
        'Tìm ga MRT',
        'Hỏi đường và xác nhận cách vào ga.',
        '🚇',
        ['你好，需要幫忙嗎？', 'Nǐ hǎo, xūyào bāngmáng ma?', 'Chào bạn, cần giúp đỡ không?'],
        ['請問，捷運站在哪裡？', 'Qǐngwèn, jiéyùn zhàn zài nǎlǐ?', 'Xin hỏi, ga MRT ở đâu?'],
        ['就在右邊。你有悠遊卡嗎？', 'Jiù zài yòubiān. Nǐ yǒu yōuyóukǎ ma?', 'Ngay bên phải. Bạn có thẻ EasyCard không?'],
        ['有，謝謝你的幫忙。', 'Yǒu, xièxie nǐ de bāngmáng.', 'Có, cảm ơn bạn đã giúp.']
    ),
    scenario(
        'store',
        'Thanh toán ở cửa hàng',
        'Từ chối túi và chọn phương thức thanh toán.',
        '🛒',
        ['你好，需要袋子嗎？', 'Nǐ hǎo, xūyào dàizi ma?', 'Chào bạn, bạn cần túi không?'],
        ['不用，謝謝。', 'Bú yòng, xièxie.', 'Không cần, cảm ơn.'],
        ['一共八十元，現金還是刷卡？', 'Yígòng bāshí yuán, xiànjīn háishì shuā kǎ?', 'Tổng cộng 80 tệ, tiền mặt hay thẻ?'],
        ['我用現金，請給我發票。', 'Wǒ yòng xiànjīn, qǐng gěi wǒ fāpiào.', 'Tôi dùng tiền mặt, xin cho tôi hóa đơn.']
    )
];
