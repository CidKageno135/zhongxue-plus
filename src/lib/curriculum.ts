export interface LessonWord { hanzi: string; pinyin: string; vi: string }
export interface Unit {
  id: number; level: "A1" | "A2"; title: string; vi: string;
  words: LessonWord[]; grammar: string; grammarVi: string;
  sentence: string; pinyin: string; sentenceVi: string;
  question: string; opening: string;
}
type Draft = [string, string, string, string, string, string, string, string, string, [string,string,string][]];
const drafts: Draft[] = [
  ["打招呼與自我介紹", "Chào hỏi và giới thiệu", "主詞＋是＋身分", "Dùng 是 để giới thiệu thân phận hoặc nghề nghiệp.", "你好，我是越南學生。", "Nǐ hǎo, wǒ shì Yuènán xuéshēng.", "Xin chào, tôi là sinh viên Việt Nam.", "你叫什麼名字？", "你好！你叫什麼名字？", [["你好","nǐ hǎo","xin chào"],["學生","xuéshēng","sinh viên, học sinh"],["名字","míngzì","tên"]]],
  ["國家與語言", "Quốc gia và ngôn ngữ", "主詞＋會＋動詞", "會 diễn tả kỹ năng đã học được.", "我會說一點中文。", "Wǒ huì shuō yìdiǎn Zhōngwén.", "Tôi biết nói một chút tiếng Trung.", "你會說什麼語言？", "你是哪國人？你會說中文嗎？", [["越南","Yuènán","Việt Nam"],["臺灣","Táiwān","Đài Loan"],["中文","Zhōngwén","tiếng Trung"]]],
  ["家人與朋友", "Gia đình và bạn bè", "主詞＋有＋名詞", "有 diễn tả có hoặc sở hữu.", "我有一個妹妹。", "Wǒ yǒu yí ge mèimei.", "Tôi có một em gái.", "你家有幾個人？", "請介紹你的家人。你有兄弟姊妹嗎？", [["家人","jiārén","người nhà"],["妹妹","mèimei","em gái"],["朋友","péngyǒu","bạn bè"]]],
  ["數字與價格", "Số và giá tiền", "名詞＋多少錢？", "多少錢 dùng để hỏi giá.", "這杯茶多少錢？", "Zhè bēi chá duōshǎo qián?", "Ly trà này giá bao nhiêu?", "你想買什麼？", "歡迎！你想買什麼？", [["多少","duōshǎo","bao nhiêu"],["錢","qián","tiền"],["杯","bēi","ly, cốc"]]],
  ["時間與日期", "Giờ và ngày", "時間＋主詞＋動詞", "Có thể đặt thời gian trước chủ ngữ.", "明天我九點上課。", "Míngtiān wǒ jiǔ diǎn shàngkè.", "Ngày mai tôi học lúc chín giờ.", "你明天幾點上課？", "明天你有課嗎？幾點開始？", [["今天","jīntiān","hôm nay"],["明天","míngtiān","ngày mai"],["上課","shàngkè","đi học, vào lớp"]]],
  ["校園生活", "Cuộc sống trong trường", "主詞＋在＋地方＋動詞", "在 đặt trước địa điểm diễn tả nơi xảy ra hành động.", "我在圖書館看書。", "Wǒ zài túshūguǎn kàn shū.", "Tôi đọc sách ở thư viện.", "你在哪裡看書？", "下課後，你通常去哪裡？", [["學校","xuéxiào","trường học"],["圖書館","túshūguǎn","thư viện"],["看書","kàn shū","đọc sách"]]],
  ["點餐", "Gọi món", "主詞＋要＋名詞", "要 có thể diễn tả món muốn gọi.", "我要一碗牛肉麵。", "Wǒ yào yì wǎn niúròu miàn.", "Tôi muốn một tô mì bò.", "你要吃什麼？", "你好，請問你要吃什麼？", [["牛肉麵","niúròu miàn","mì bò"],["碗","wǎn","bát, tô"],["菜單","càidān","thực đơn"]]],
  ["飲料與喜好", "Đồ uống và sở thích", "主詞＋喜歡＋名詞／動詞", "喜歡 diễn tả điều mình thích.", "我喜歡喝無糖茶。", "Wǒ xǐhuan hē wútáng chá.", "Tôi thích uống trà không đường.", "你喜歡喝什麼？", "你喜歡喝茶還是咖啡？", [["無糖","wútáng","không đường"],["咖啡","kāfēi","cà phê"],["喜歡","xǐhuan","thích"]]],
  ["交通與方向", "Giao thông và phương hướng", "請問＋地方＋在哪裡？", "請問 giúp câu hỏi lịch sự hơn.", "請問，捷運站在哪裡？", "Qǐngwèn, jiéyùn zhàn zài nǎlǐ?", "Xin hỏi, ga tàu điện ở đâu?", "你怎麼去學校？", "你要去哪裡？你想搭什麼車？", [["捷運","jiéyùn","tàu điện đô thị"],["公車","gōngchē","xe buýt"],["右邊","yòubiān","bên phải"]]],
  ["每天的活動", "Hoạt động hằng ngày", "主詞＋每天＋動詞", "每天 chỉ hành động diễn ra hằng ngày.", "我每天練習中文。", "Wǒ měitiān liànxí Zhōngwén.", "Tôi luyện tiếng Trung mỗi ngày.", "你每天做什麼？", "你每天幾點起床？", [["每天","měitiān","mỗi ngày"],["起床","qǐchuáng","thức dậy"],["練習","liànxí","luyện tập"]]],
  ["天氣與計畫", "Thời tiết và kế hoạch", "因為……，所以……", "因為 nêu nguyên nhân, 所以 nêu kết quả.", "因為下雨，所以我不出門。", "Yīnwèi xià yǔ, suǒyǐ wǒ bù chūmén.", "Vì trời mưa nên tôi không ra ngoài.", "下雨的時候，你會做什麼？", "今天下雨了，你還想出門嗎？", [["下雨","xià yǔ","mưa"],["出門","chūmén","ra ngoài"],["天氣","tiānqì","thời tiết"]]],
  ["購物與比較", "Mua sắm và so sánh", "A＋比＋B＋形容詞", "比 dùng để so sánh hai đối tượng.", "這件衣服比那件便宜。", "Zhè jiàn yīfú bǐ nà jiàn piányí.", "Bộ quần áo này rẻ hơn bộ kia.", "你想選哪件衣服？", "這兩件衣服，你比較喜歡哪一件？", [["衣服","yīfú","quần áo"],["便宜","piányí","rẻ"],["比較","bǐjiào","so sánh, tương đối"]]],
  ["租屋與住宿", "Thuê nhà và chỗ ở", "地方＋離＋地方＋遠／近", "離 diễn tả khoảng cách giữa hai nơi.", "宿舍離學校很近。", "Sùshè lí xuéxiào hěn jìn.", "Ký túc xá rất gần trường.", "你住的地方離學校遠嗎？", "你想找什麼樣的房間？", [["宿舍","sùshè","ký túc xá"],["房間","fángjiān","phòng"],["房租","fángzū","tiền thuê nhà"]]],
  ["看病與身體", "Khám bệnh và cơ thể", "主詞＋覺得＋形容詞", "覺得 diễn tả cảm giác hoặc suy nghĩ.", "我覺得不舒服，想去看醫生。", "Wǒ juéde bù shūfu, xiǎng qù kàn yīshēng.", "Tôi thấy không khỏe, muốn đi khám bác sĩ.", "你哪裡不舒服？", "你好，請問你哪裡不舒服？我們練習看診用語。", [["醫生","yīshēng","bác sĩ"],["不舒服","bù shūfu","không khỏe"],["頭痛","tóutòng","đau đầu"]]],
  ["週末與經驗", "Cuối tuần và trải nghiệm", "主詞＋動詞＋過＋受詞", "過 sau động từ diễn tả kinh nghiệm đã từng có.", "我去過臺南。", "Wǒ qù guò Táinán.", "Tôi từng đến Đài Nam.", "你去過臺灣的哪些地方？", "你去過臺南嗎？你想去哪裡玩？", [["週末","zhōumò","cuối tuần"],["旅行","lǚxíng","du lịch"],["經驗","jīngyàn","kinh nghiệm"]]],
  ["邀請與約定", "Mời và hẹn", "主詞＋想＋動詞", "想 diễn tả ý muốn, dự định.", "我想邀請你一起吃飯。", "Wǒ xiǎng yāoqǐng nǐ yìqǐ chī fàn.", "Tôi muốn mời bạn cùng ăn cơm.", "你想邀請朋友做什麼？", "這個週末，你想一起看電影嗎？", [["邀請","yāoqǐng","mời"],["一起","yìqǐ","cùng nhau"],["電影","diànyǐng","phim"]]],
  ["正在做的事", "Việc đang làm", "主詞＋正在＋動詞", "正在 nhấn mạnh hành động đang diễn ra.", "我正在準備報告。", "Wǒ zhèngzài zhǔnbèi bàogào.", "Tôi đang chuẩn bị báo cáo.", "你現在正在做什麼？", "你現在方便聊天嗎？你正在做什麼？", [["正在","zhèngzài","đang"],["準備","zhǔnbèi","chuẩn bị"],["報告","bàogào","báo cáo"]]],
  ["完成與改變", "Hoàn thành và thay đổi", "主詞＋動詞＋了＋受詞", "了 sau động từ có thể diễn tả hành động đã hoàn thành.", "我買了兩本書。", "Wǒ mǎi le liǎng běn shū.", "Tôi đã mua hai quyển sách.", "你昨天做了什麼？", "你昨天買了什麼東西？", [["昨天","zuótiān","hôm qua"],["完成","wánchéng","hoàn thành"],["買","mǎi","mua"]]],
  ["能力與請求", "Khả năng và nhờ giúp", "可以＋動詞＋嗎？", "可以……嗎？ dùng để xin phép hoặc nhờ lịch sự.", "可以請你再說一次嗎？", "Kěyǐ qǐng nǐ zài shuō yí cì ma?", "Bạn có thể nói lại một lần nữa không?", "聽不懂的時候，你會怎麼說？", "如果你聽不懂我說的話，可以怎麼問？", [["可以","kěyǐ","có thể, được phép"],["幫忙","bāngmáng","giúp đỡ"],["再","zài","lại, nữa"]]],
  ["學習目標與複習", "Mục tiêu học và ôn tập", "先……，再……", "先 và 再 diễn tả thứ tự thực hiện.", "我先複習生詞，再練習口說。", "Wǒ xiān fùxí shēngcí, zài liànxí kǒushuō.", "Tôi ôn từ mới trước, rồi luyện nói.", "你打算怎麼練習中文？", "你下週的中文學習目標是什麼？", [["目標","mùbiāo","mục tiêu"],["複習","fùxí","ôn tập"],["口說","kǒushuō","nói, khẩu ngữ"]]],
];

export const UNITS: Unit[] = drafts.map((d, i) => ({
  id: i + 1, level: i < 10 ? "A1" : "A2", title:d[0], vi:d[1],
  grammar:d[2], grammarVi:d[3], sentence:d[4], pinyin:d[5], sentenceVi:d[6],
  question:d[7], opening:d[8], words:d[9].map(w => ({hanzi:w[0],pinyin:w[1],vi:w[2]})),
}));
export function getUnit(id: number) { return UNITS.find(u => u.id === id); }
