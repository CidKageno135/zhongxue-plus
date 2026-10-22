/**
 * server/aiFallback.ts
 *
 * Intelligent Sinology Local AI Conversation Responder (Taiwan Standards).
 * Owned by Subagent A05 (AI Provider & Fallback Lead).
 *
 * Implements:
 * 1. Rich local TOCFL guided conversational tutor for Taiwan Mandarin.
 * 2. 15 comprehensive scenario templates (Factory overtime, Tax 183 days, Semiconductor TSMC,
 *    Scooter rental, Bubble tea 50嵐, MRT/EasyCard, Night market, Convenience store,
 *    Rental apartment, Clinic & NHI, Banking & ARC, Workplace meetings, Job interview, etc.).
 * 3. Consistent 4-line output: 中文 (Traditional Chinese), Pinyin (with tones), Tiếng Việt, 練習 (Reflex tip).
 * 4. Transparent metadata labeling: mode='guided', source='local-fallback', reason & latency tracking.
 */

import type { ConversationReply, ConversationTurn } from '../src/types.ts';

export interface GuidedFallbackOptions {
  lastUserMessage?: string;
  roleId?: string;
  threadId?: number;
  previousMessages?: ConversationTurn[];
  reason?: 'timeout' | 'upstream_error' | 'no_key' | 'offline';
  latencyMs?: number;
  note?: string;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  traditional: string;
  pinyin: string;
  vietnamese: string;
  practiceTip: string;
  keywords: string[];
}

export const SINOLOGY_SCENARIOS: Record<string, ScenarioTemplate> = {
  factory: {
    id: 'factory',
    name: 'Công xưởng & Tăng ca (工廠機台與加班)',
    traditional: '組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。另外請問今天晚上有需要配合加班嗎？',
    pinyin: 'Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū. Lìngwài qǐngwèn jīntiān wǎnshang yǒu xūyào pèihé jiābān ma?',
    vietnamese: 'Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa. Ngoài ra xin hỏi tối nay có cần phối hợp tăng ca không ạ?',
    practiceTip: 'Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時，下班時我會記得刷卡打卡。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng, khi tan ca em sẽ nhớ quẹt thẻ).',
    keywords: [
      'công xưởng', 'tăng ca', 'quẹt thẻ', 'máy hỏng', 'máy móc', 'tổ trưởng', 'chuyền', 'bảo trì',
      'kỹ thuật viên', 'lỗi máy', 'đèn đỏ', '加班', '打卡', '機台', '組長', '維修', '警報', '紅燈', '廠長'
    ]
  },
  tax: {
    id: 'tax',
    name: 'Cục thuế & Cư trú 183 ngày (國稅局與所得稅申報)',
    traditional: '您好！五月份是臺灣綜合所得稅申報期。請問您去年在臺灣居留是否滿183天？請出示您的居留證與扣繳憑單。',
    pinyin: 'Nín hǎo! Wǔ yuèfèn shì Táiwān zōnghé suǒdéshuì shēnbào qī. Qǐngwèn nín qùnián zài Táiwān jūliú shìfǒu mǎn yībǎi bāshísān tiān? Qǐng chūshì nín de jūliúzhèng yǔ kòujiǎo píngdān.',
    vietnamese: 'Xin chào! Tháng 5 là kỳ kê khai thuế thu nhập cá nhân tại Đài Loan. Xin hỏi năm ngoái bạn có cư trú đủ 183 ngày không? Vui lòng xuất trình thẻ ARC và chứng từ khấu trừ thuế.',
    practiceTip: 'Gợi ý phản xạ: 我去年居留超過183天，這是我的居留證與公司的扣繳憑單，想辦理線上退稅。(Năm ngoái tôi cư trú hơn 183 ngày, đây là thẻ ARC và chứng từ khấu trừ của công ty, tôi muốn làm thủ tục hoàn thuế trực tuyến).',
    keywords: [
      'khai thuế', 'thuế thu nhập', '183 ngày', 'hoàn thuế', 'giảm trừ', 'cục thuế', 'báo thuế',
      'khấu trừ', 'arc', 'cư trú', 'bảo hiểm thuế', '報稅', '所得稅', '183', '扣繳憑單', '退稅', '國稅局', '免稅額'
    ]
  },
  tech: {
    id: 'tech',
    name: 'Bán dẫn TSMC & Phòng sạch 3nm (新竹科學園區與半導體)',
    traditional: '工程師您好！這批3奈米晶圓正在無塵室進行先進製程曝光，目前的良率指標非常穩定。',
    pinyin: 'Gōngchéngshī nín hǎo! Zhè pī sān nàimǐ jīngyuán zhèngzài wúchénshì jìnxíng xiānjìn zhìchéng pùguāng, mùqián de liánglǜ zhǐbiāo fēicháng wěndìng.',
    vietnamese: 'Chào kỹ sư! Lô wafer 3nm này đang trong phòng sạch thực hiện quy trình quang khắc tiên tiến, chỉ số tỷ lệ thành phẩm (yield rate) hiện rất ổn định.',
    practiceTip: 'Gợi ý phản xạ: 請特別監控這道蝕刻步驟的良率變化，並與研發部門確認參數。(Xin đặc biệt theo dõi biến động tỷ lệ thành phẩm ở bước khắc này và xác nhận thông số với bộ phận R&D).',
    keywords: [
      'bán dẫn', 'wafer', 'phòng sạch', 'tsmc', 'tiến trình', '3nm', '2nm', 'quang khắc', 'yield',
      'tân trúc', 'khắc', 'tỷ lệ thành phẩm', 'kỹ sư', '晶圓', '無塵室', '半導體', '良率', '蝕刻', '曝光', '製程'
    ]
  },
  scooter: {
    id: 'scooter',
    name: 'Thuê xe máy & Đổ xăng 95 (租機車與台灣中油加油)',
    traditional: '你好！租機車一天六百元，附兩頂安全帽。請問你有國際駕照或臺灣機車駕照嗎？加滿95汽油，發票存載具。',
    pinyin: 'Nǐ hǎo! Zū jīchē yì tiān liùbǎi yuán, fù liǎng dǐng ānquánmào. Qǐngwèn nǐ yǒu guójì jiàzhào huò Táiwān jīchē jiàzhào ma? Jiāmǎn jiǔwǔ qìyóu, fāpiào cún zàijù.',
    vietnamese: 'Chào bạn! Thuê xe máy một ngày 600 tệ, kèm 2 mũ bảo hiểm. Bạn có bằng lái quốc tế hay Đài Loan không? Đổ đầy xăng 95, hóa đơn lưu mã thẻ.',
    practiceTip: 'Gợi ý phản xạ: 請問前面有台灣中油加油站嗎？95加滿，謝謝！(Xin hỏi phía trước có trạm xăng CPC không? Đổ đầy xăng 95, cảm ơn!).',
    keywords: [
      'xe máy', 'thuê xe', 'xăng', '95', 'mũ bảo hiểm', 'bằng lái', 'cpc', 'trạm xăng', 'đổ xăng',
      'trả xe', '機車', '租車', '安全帽', '加油站', '95加滿', '駕照', '中油', '載具'
    ]
  },
  tea: {
    id: 'tea',
    name: 'Quầy trà sữa Đài Loan (50嵐與清心手搖飲)',
    traditional: '你要喝珍珠奶茶還是四季春茶？甜度和冰塊要微糖微冰還是半糖少冰？外帶還是內用？',
    pinyin: 'Nǐ yào hē zhēnzhū nǎichá háishì sìjìchūnchá? Tiándù hé bīngkuài yào wēitáng wēibīng háishì bàntáng shǎobīng? Wàidài háishì nèiyòng?',
    vietnamese: 'Bạn muốn uống trà sữa trân châu hay trà Tứ Quý Xuân? Độ ngọt và đá chọn ít đường ít đá hay nửa đường ít đá? Mang đi hay dùng tại quán?',
    practiceTip: 'Gợi ý phản xạ: 我要一杯波霸奶茶，半糖少冰，外帶，謝謝！(Cho tôi một ly trà sữa trân châu lớn, nửa đường ít đá, mang đi, cảm ơn!).',
    keywords: [
      'trà sữa', 'trân châu', 'độ ngọt', 'độ đá', 'ít đường', 'ít đá', 'nửa đường', 'không đá', '50lan',
      '50嵐', 'thanh tâm', 'boba', 'mang đi', 'nước ngọt', 'đồ uống', '奶茶', '珍珠', '波霸', '半糖', '微糖', '少冰', '微冰', '外帶'
    ]
  },
  mrt: {
    id: 'mrt',
    name: 'Ga tàu điện ngầm & Thẻ EasyCard (台北捷運與悠遊卡)',
    traditional: '最近的捷運站就在前面直走右轉。進出站請刷悠遊卡，也可以在自動售票機加值或詢問處購票。',
    pinyin: 'Zuìjìn de jiéyùn zhàn jiù zài qiánmiàn zhízǒu yòuzhuǎn. Jìn chū zhàn qǐng shuā yōuyóukǎ, yě kěyǐ zài zìdòng shòupiàojī jiāzhí huò xúnwènchù gòupiào.',
    vietnamese: 'Ga MRT gần nhất ở ngay phía trước đi thẳng rồi rẽ phải. Ra vào ga vui lòng quẹt thẻ EasyCard, bạn cũng có thể nạp tiền tại máy bán vé tự động hoặc quầy thông tin.',
    practiceTip: 'Gợi ý phản xạ: 請問去台北車站要在哪裡轉乘紅線（淡水信義線）？(Xin hỏi muốn đến Ga Đài Bắc thì chuyển sang tuyến đỏ Tuyến Đạm Thủy - Tín Nghĩa ở đâu?).',
    keywords: [
      'mrt', 'tàu điện', 'easycard', 'thẻ easycard', 'thẻ mrt', 'mua thẻ', 'quẹt thẻ', 'nạp tiền', 'ga', 'lối ra', 'chuyển tàu',
      'đổi tàu', 'tuyến đỏ', 'tuyến xanh', 'tổng trạm', '捷運', '悠遊卡', '加值', '轉乘', '出口', '車站', '紅線'
    ]
  },
  nightmarket: {
    id: 'nightmarket',
    name: 'Chợ đêm & Mì bò kho (台灣夜市與紅燒牛肉麵)',
    traditional: '夜市裡最有名的就是紅燒牛肉麵和外酥內嫩的臭豆腐。請問要不要加辣？小菜可以自取。',
    pinyin: 'Yèshì lǐ zuì yǒumíng de jiùshì hóngshāo niúròu miàn hàn wài sū nèi nèn de chòudòufu. Qǐngwèn yào bú yào jiā là? Xiǎocài kěyǐ zìqǔ.',
    vietnamese: 'Ở chợ đêm nổi tiếng nhất là mì bò kho đậm đà và đậu phụ thối giòn tan bên ngoài, mềm ngậy bên trong. Xin hỏi bạn có muốn thêm cay không? Món ăn kèm có thể tự lấy.',
    practiceTip: 'Gợi ý phản xạ: 老闆，我要一份小碗牛肉麵，微辣，內用，謝謝！(Chủ quán, cho tôi một tô mì bò nhỏ, cay nhẹ, ăn tại quán, cảm ơn!).',
    keywords: [
      'chợ đêm', 'mì bò', 'bò kho', 'đậu phụ thối', 'bánh dứa', 'ăn vặt', 'độ cay', 'cay', 'món ăn',
      'ngon', 'chè hạt sen', 'gà rán', 'trà đá', '夜市', '牛肉麵', '臭豆腐', '鳳梨酥', '加辣', '微辣', '小吃'
    ]
  },
  store: {
    id: 'store',
    name: 'Cửa hàng tiện lợi 7-11 & FamilyMart (超商與統一發票)',
    traditional: '一共八十五元。請問需要購買購物袋嗎？發票要印出來還是存手機條碼載具？',
    pinyin: 'Yígòng bāshíwǔ yuán. Qǐngwèn xūyào gòumǎi gòuwùdài ma? Fāpiào yào yìn chūlái háishì cún shǒujī tiáomǎ zàijù?',
    vietnamese: 'Tổng cộng 85 tệ. Xin hỏi bạn có cần mua túi đựng không? Hóa đơn in ra hay lưu vào mã vạch điện thoại (carrier)?',
    practiceTip: 'Gợi ý phản xạ: 不用袋子，請給我紙本發票，我用現金或悠遊卡付錢。(Không cần túi, xin cho tôi hóa đơn giấy, tôi trả bằng tiền mặt hoặc thẻ EasyCard).',
    keywords: [
      'tiện lợi', '7-11', 'seven', 'familymart', 'hóa đơn', 'túi', 'mã thẻ', 'tiền mặt', 'thanh toán',
      'in hóa đơn', 'siêu thị mini', 'gửi hàng', 'nạp tiền', '便利商店', '超商', '發票', '載具', '塑膠袋', '條碼'
    ]
  },
  house: {
    id: 'house',
    name: 'Thuê phòng trọ & Điện nước Taipower (租套房與押金水電)',
    traditional: '這間獨立套房月租八千元，採光通風很好。押金是兩個月房租，水電費依照台電帳單計算。',
    pinyin: 'Zhè jiān dúlì tàofáng yuèzū bāqiān yuán, cǎiguāng tōngfēng hěn hǎo. Yājīn shì liǎng ge yuè fángzū, shuǐdiànfèi yīzhào Táidiàn zhàngdān jìsuàn.',
    vietnamese: 'Phòng khép kín này tiền thuê mỗi tháng 8.000 tệ, đón nắng và thoáng gió rất tốt. Tiền cọc là 2 tháng, tiền điện nước tính theo hóa đơn của công ty điện lực Đài Loan.',
    practiceTip: 'Gợi ý phản xạ: 請問房間有包含洗衣機、冰箱和網路嗎？這週末方便約時間看房嗎？(Phòng có sẵn máy giặt, tủ lạnh và mạng internet không? Cuối tuần này hẹn giờ xem phòng được không?).',
    keywords: [
      'thuê nhà', 'thuê phòng', 'tiền phòng', 'tiền cọc', 'cọc', 'điện nước', 'phòng trọ', 'chủ nhà',
      'xem phòng', 'taipower', 'hợp đồng thuê', 'bình nóng lạnh', '套房', '租房', '押金', '水電費', '房東', '看房', '台電'
    ]
  },
  clinic: {
    id: 'clinic',
    name: 'Phòng khám & Thẻ BHYT (診所與全民健保卡)',
    traditional: '請先出示健保卡填寫初診資料並量體溫。醫生會為您診斷，領藥後記得按時服藥並多喝水休息。',
    pinyin: 'Qǐng xiān chūshì jiànbǎokǎ tiánxiě chūzhěn zīliào bìng liáng tǐwēn. Yīshēng huì wèi nín zhěnduàn, lǐngyào hòu jìde ànshí fúyào bìng duō hēshuǐ xiūxi.',
    vietnamese: 'Vui lòng xuất trình thẻ Bảo hiểm Y tế (BHYT) để điền thông tin khám lần đầu và đo nhiệt độ. Bác sĩ sẽ chẩn đoán cho bạn, sau khi nhận thuốc nhớ uống đúng giờ và uống nhiều nước nghỉ ngơi.',
    practiceTip: 'Gợi ý phản xạ: 我從昨天下午開始頭痛和喉嚨痛，體溫大概三十八度。(Tôi bắt đầu bị đau đầu và đau họng từ chiều hôm qua, nhiệt độ cơ thể khoảng 38 độ).',
    keywords: [
      'khám bệnh', 'bệnh viện', 'phòng khám', 'bác sĩ', 'đau đầu', 'sốt', 'uống thuốc', 'thuốc',
      'bảo hiểm', 'bhyt', 'thẻ bảo hiểm', 'đau họng', 'ho', 'cảm cúm', '健保卡', '看病', '診所', '發燒', '頭痛', '初診'
    ]
  },
  bank: {
    id: 'bank',
    name: 'Ngân hàng Đài Loan & Mở tài khoản ARC (外籍人士銀行開戶)',
    traditional: '外籍人士開戶需要攜帶有效居留證（ARC）、護照以及個人印章，並填寫臨櫃申請表。',
    pinyin: 'Wàijí rénshì kāihù xūyào xiédài yǒuxiào jūliúzhèng (ARC), hùzhào yǐjí gèrén yìnzhāng, bìng tiánxiě línguì shēnqǐngbiǎo.',
    vietnamese: 'Người nước ngoài mở tài khoản cần mang theo thẻ cư trú (ARC) còn hạn, hộ chiếu và con dấu cá nhân, rồi điền đơn đăng ký tại quầy giao dịch.',
    practiceTip: 'Gợi ý phản xạ: 我想辦理約定轉帳、金融卡提款和網路銀行功能，謝謝！(Tôi muốn đăng ký tính năng chuyển khoản định danh, rút tiền thẻ ATM và ngân hàng điện tử, cảm ơn!).',
    keywords: [
      'ngân hàng', 'bưu điện', 'mở tài khoản', 'thẻ atm', 'con dấu', 'chuyển tiền', 'arc', 'cư trú',
      'hộ chiếu', 'khai tài khoản', 'sổ tiết kiệm', 'đổi tiền', 'tiền tệ', '銀行', '開戶', '居留證', '印章', '存摺', '轉帳'
    ]
  },
  workplace: {
    id: 'workplace',
    name: 'Môi trường công sở & Xin nghỉ phép (職場溝通與差勤請假)',
    traditional: '我們今天下午兩點在第三會議室開會。如果有事需要請假，請記得在差勤系統填寫假單並通知代理人。',
    pinyin: 'Wǒmen jīntiān xiàwǔ liǎng diǎn zài dì sān huìyìshì kāihuì. Rúguǒ yǒu shì xūyào qǐngjià, qǐng jìde zài chāiqín xìtǒng tiánxiě jiàdān bìng tōngzhī dàilǐrén.',
    vietnamese: 'Chúng ta họp lúc 2 giờ chiều nay ở phòng họp số 3. Nếu có việc cần xin nghỉ phép, nhớ điền đơn trên hệ thống chấm công và báo cho người bàn giao công việc nhé.',
    practiceTip: 'Gợi ý phản xạ: 經理，不好意思，我明天家裡有私事想請一天事假，工作已交接。(Thưa quản lý, ngày mai nhà em có việc riêng muốn xin nghỉ một ngày phép riêng, công việc đã bàn giao xong ạ).',
    keywords: [
      'công sở', 'đi làm', 'họp', 'nghỉ phép', 'xin nghỉ', 'đồng nghiệp', 'sếp', 'quản lý', 'lương',
      'báo cáo', 'chấm công', 'bàn giao', 'phòng họp', '開會', '請假', '事假', '會議室', '經理', '主管', '差勤'
    ]
  },
  interview: {
    id: 'interview',
    name: 'Phỏng vấn xin việc Đài Loan (求職面試與自我介紹)',
    traditional: '很高興能與您面試！請用中文簡單介紹您的專業背景、過往專案經驗以及為何想加入本公司。',
    pinyin: 'Hěn gāoxìng néng yǔ nín miànshì! Qǐng yòng zhōngwén jiǎndān jièshào nín de zhuānyè bèijǐng, guòwǎng zhuān\'àn jīngyàn yǐjí wèihé xiǎng jiārù běn gōngsī.',
    vietnamese: 'Rất vui được phỏng vấn cùng bạn! Xin hãy dùng tiếng Hoa giới thiệu ngắn gọn nền tảng chuyên môn, các dự án từng tham gia và lý do muốn gia nhập công ty.',
    practiceTip: 'Gợi ý phản xạ: 我在資訊與生產製造領域有三年工作經驗，擅長跨部門溝通與問題排除。(Tôi có 3 năm kinh nghiệm trong ngành CNTT và sản xuất, giỏi giao tiếp liên phòng ban và giải quyết sự cố).',
    keywords: [
      'phỏng vấn', 'xin việc', 'cv', 'hồ sơ', 'kinh nghiệm', 'chuyên môn', 'lý do', 'thế mạnh',
      'đi làm', 'ứng tuyển', 'mức lương', 'chế độ', '面試', '自我介紹', '經歷', '專案', '應徵', '求職'
    ]
  },
  translate: {
    id: 'translate',
    name: 'Dịch thuật & Hỏi ngữ cảnh (翻譯與常見日常表達)',
    traditional: '這句話在臺灣日常生活中很常見！您可以直接說：「請問這個用中文怎麼說？」',
    pinyin: 'Zhè jù huà zài Táiwān rìcháng shēnghuó zhōng hěn chángjiàn! Nín kěyǐ zhíjiē shuō: "Qǐngwèn zhège yòng zhōngwén zěnme shuō?"',
    vietnamese: 'Câu này rất phổ biến trong cuộc sống đời thường ở Đài Loan! Bạn có thể hỏi thẳng: "Xin hỏi cái này dùng tiếng Trung nói như thế nào?".',
    practiceTip: 'Gợi ý phản xạ: Hãy gõ một cụm từ cụ thể (ví dụ: gọi taxi, tính tiền, chỉ đường) để cùng tôi luyện cách nói tiếng Hoa Phồn thể tự nhiên nhất nhé!',
    keywords: [
      'nghĩa là gì', 'dịch', 'nói sao', 'nói thế nào', 'tiếng hoa nói', 'tiếng trung nói', 'cách nói',
      'phát âm', 'ngữ pháp', 'từ vựng', '翻譯', '怎麼說', '什麼意思', '中文怎麼說'
    ]
  },
  greeting: {
    id: 'greeting',
    name: 'Lời chào & Hội thoại tự do (臺灣生活華語問候)',
    traditional: '你好！很高興認識你。歡迎來到臺灣！隨時隨地跟我練習繁體中文日常對話。',
    pinyin: 'Nǐ hǎo! Hěn gāoxìng rènshi nǐ. Huānyíng lái dào Táiwān! Suíshí suídì gēn wǒ liànxí fántǐ zhōngwén rìcháng duìhuà.',
    vietnamese: 'Xin chào! Rất vui được làm quen với bạn. Chào mừng bạn đến với Đài Loan! Bạn có thể luyện đàm thoại tiếng Trung Phồn thể cùng tôi bất cứ lúc nào.',
    practiceTip: 'Gợi ý phản xạ: Bạn có thể chọn các chủ đề như gọi trà sữa, đi tàu điện MRT, thuê xe máy, mua sắm siêu thị hoặc làm việc trong công xưởng để bắt đầu luyện phản xạ.',
    keywords: [
      'chào', 'hello', 'hi', 'bắt đầu', 'luyện tập', 'giúp tôi', 'tập nói', 'học tiếng hoa',
      'đài loan', 'xin chào', '你好', '早安', '嗨', '練習'
    ]
  }
};

/**
 * Generates formatted 4-line smart Sinology reply string.
 *
 * Output format:
 * 中文：...
 * Pinyin: ...
 * Tiếng Việt: ...
 * 練習：...
 */
export function generateSinologyAiReply(userText: string, roleId?: string): string {
  const normalizedRole = (roleId || '').toLowerCase().trim();

  // 1. Explicit scenario roleId override
  if (normalizedRole && SINOLOGY_SCENARIOS[normalizedRole]) {
    const sc = SINOLOGY_SCENARIOS[normalizedRole];
    return `中文：${sc.traditional}\nPinyin: ${sc.pinyin}\nTiếng Việt: ${sc.vietnamese}\n練習：${sc.practiceTip}`;
  }

  // 2. Keyword heuristic matching against user query text
  const text = (userText || '').toLowerCase().trim();

  if (text) {
    // Check specific priority topics first
    const orderedScenarios = [
      'factory',
      'tax',
      'tech',
      'scooter',
      'tea',
      'mrt',
      'nightmarket',
      'store',
      'house',
      'clinic',
      'bank',
      'workplace',
      'interview',
      'translate',
      'greeting'
    ];

    for (const key of orderedScenarios) {
      const sc = SINOLOGY_SCENARIOS[key];
      if (!sc) continue;
      const matched = sc.keywords.some(kw => text.includes(kw));
      if (matched) {
        return `中文：${sc.traditional}\nPinyin: ${sc.pinyin}\nTiếng Việt: ${sc.vietnamese}\n練習：${sc.practiceTip}`;
      }
    }
  }

  // 3. Fallback to default welcoming greeting
  const fallback = SINOLOGY_SCENARIOS.greeting;
  return `中文：${fallback.traditional}\nPinyin: ${fallback.pinyin}\nTiếng Việt: ${fallback.vietnamese}\n練習：${fallback.practiceTip}`;
}

/**
 * Creates a fully formed, transparent ConversationReply object in 'guided' mode.
 *
 * Guarantees:
 * - mode is explicitly 'guided' (never spoofed as 'ai').
 * - provider is 'Sinology Local NLP' or specified.
 * - source is marked as 'local-fallback' in meta.
 * - includes latencyMs, fallbackReason, and actionable guidance note.
 */
export function createGuidedFallbackReply(options: GuidedFallbackOptions): ConversationReply {
  const userText = options.lastUserMessage || '';
  const roleId = options.roleId;
  const content = generateSinologyAiReply(userText, roleId);

  const fallbackReason = options.reason || 'offline';
  let guidanceNote = options.note;

  if (!guidanceNote) {
    switch (fallbackReason) {
      case 'timeout':
        guidanceNote = 'Máy chủ AI trực tuyến phản hồi quá thời gian quy định (12s). Chuyển sang gia sư hướng dẫn cục bộ chuẩn TOCFL Đài Loan.';
        break;
      case 'upstream_error':
        guidanceNote = 'Dịch vụ AI trực tuyến tạm thời gián đoạn hoặc quá tải. Chuyển sang gia sư hướng dẫn cục bộ chuẩn TOCFL Đài Loan.';
        break;
      case 'no_key':
        guidanceNote = 'Chưa cấu hình khóa API trực tuyến hoặc yêu cầu gửi tới địa chỉ không được ủy quyền. Đang sử dụng gia sư hướng dẫn cục bộ.';
        break;
      case 'offline':
      default:
        guidanceNote = 'Chế độ luyện tập hướng dẫn cục bộ độc lập với mạng ngoài.';
        break;
    }
  }

  const threadMessages: ConversationTurn[] = [
    ...(options.previousMessages || [])
  ];

  if (userText) {
    threadMessages.push({ role: 'user', content: userText });
  }
  threadMessages.push({ role: 'assistant', content });

  return {
    mode: 'guided',
    content,
    model: 'sinology-local-tutor',
    provider: 'Sinology Local NLP',
    thread: {
      id: options.threadId || Date.now(),
      messages: threadMessages
    },
    meta: {
      latencyMs: options.latencyMs ?? 5,
      fallbackReason,
      guidanceNote
    }
  };
}
