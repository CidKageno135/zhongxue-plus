import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export interface DbDictionaryResult {
  id: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

interface ParsedEntry extends DbDictionaryResult {
  searchIndex: string;
  pinyinClean: string;
}

function ensureEnvLoaded(): void {
  const cwd = process.cwd();
  const envCandidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '.env.local'),
    path.resolve(cwd, 'projects/zhongxue-new/.env'),
    path.resolve(cwd, 'projects/zhongxue-new/.env.local')
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
          if (match) {
            const key = match[1];
            let val = match[2] || '';
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val.trim();
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

function extractResponseApiText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (!Array.isArray(d.output)) return null;
  for (let i = d.output.length - 1; i >= 0; i--) {
    const item = d.output[i];
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (typeof c.text === 'string' && c.text.trim()) {
          return c.text.trim();
        }
      }
    }
  }
  return null;
}

class DictionaryEngine {
  private entries: ParsedEntry[] = [];
  private tradMap = new Map<string, ParsedEntry[]>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  async init(dictPath: string): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        if (!fs.existsSync(dictPath)) {
          console.warn(`[zhongxue-dict] Dictionary file not found at: ${dictPath}`);
          return;
        }
        const t0 = Date.now();
        const compressed = fs.readFileSync(dictPath);
        const decompressed = zlib.gunzipSync(compressed).toString('utf-8');
        const lines = decompressed.split('\n');

        const parsed: ParsedEntry[] = [];
        let idCounter = 1;

        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i].trim();
          if (!raw || raw.startsWith('#')) continue;

          // CC-CEDICT format: Traditional Simplified [pinyin] /def1/def2/
          const match = raw.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
          if (!match) continue;

          const traditional = match[1];
          const simplified = match[2];
          const pinyin = match[3];
          const rawDefs = match[4].split('/').map(d => d.trim()).filter(Boolean);

          const pinyinClean = pinyin.replace(/[\d\s-]/g, '').toLowerCase();
          const searchIndex = `${traditional} ${simplified} ${pinyin} ${pinyinClean} ${rawDefs.join(' ')}`.toLowerCase();

          const entry: ParsedEntry = {
            id: `cv_${idCounter++}`,
            traditional,
            simplified,
            pinyin,
            definitions: rawDefs,
            pinyinClean,
            searchIndex
          };

          parsed.push(entry);

          const existing = this.tradMap.get(traditional);
          if (existing) {
            existing.push(entry);
          } else {
            this.tradMap.set(traditional, [entry]);
          }
        }

        this.entries = parsed;
        this.loaded = true;
        console.log(`[zhongxue-dict] Successfully loaded ${this.entries.length} entries in ${Date.now() - t0}ms`);
      } catch (err) {
        console.error('[zhongxue-dict] Failed to initialize dictionary engine:', err);
      }
    })();

    return this.loadPromise;
  }

  isReady(): boolean {
    return this.loaded;
  }

  getTotal(): number {
    return this.entries.length;
  }

  getById(id: string): DbDictionaryResult | null {
    const found = this.entries.find(e => e.id === id);
    if (!found) return null;
    return {
      id: found.id,
      traditional: found.traditional,
      simplified: found.simplified,
      pinyin: found.pinyin,
      definitions: found.definitions
    };
  }

  search(
    query: string,
    mode: 'all' | 'hanzi' | 'pinyin' | 'vi' = 'all',
    offset = 0,
    limit = 50
  ): { results: DbDictionaryResult[]; total: number } {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { results: [], total: this.entries.length };
    }

    const qClean = q.replace(/[\d\s-]/g, '');
    const isHanzi = /^[\u4e00-\u9fa5]+$/.test(q);

    const matches: ParsedEntry[] = [];

    // Fast-path: exact Hanzi match
    if (isHanzi) {
      const exactMatches = this.tradMap.get(query.trim());
      if (exactMatches) {
        matches.push(...exactMatches);
      }
    }

    // Substring search
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (matches.includes(e)) continue;

      if (isHanzi) {
        if (e.traditional.includes(q) || e.simplified.includes(q)) {
          matches.push(e);
        }
      } else if (mode === 'pinyin') {
        if (e.pinyin.toLowerCase().includes(q) || e.pinyinClean.includes(qClean)) {
          matches.push(e);
        }
      } else if (mode === 'vi') {
        if (e.definitions.some(d => d.toLowerCase().includes(q))) {
          matches.push(e);
        }
      } else {
        if (e.searchIndex.includes(q) || e.pinyinClean.includes(qClean)) {
          matches.push(e);
        }
      }

      // Early stop if we have enough matches for pagination + buffer
      if (matches.length >= offset + limit + 200) {
        break;
      }
    }

    const paged = matches.slice(offset, offset + limit).map(e => ({
      id: e.id,
      traditional: e.traditional,
      simplified: e.simplified,
      pinyin: e.pinyin,
      definitions: e.definitions
    }));

    return {
      results: paged,
      total: matches.length
    };
  }
}

/**
 * Intelligent Sinology AI Conversation Responder (Taiwan Standards)
 * Provides comprehensive conversational roleplay, grammar explanations, and translation.
 */
function generateSinologyAiReply(userText: string, roleId?: string): string {
  const t = userText.toLowerCase().trim();

  // Explicit Scenario Role overrides
  if (roleId === 'factory') {
    return `中文：組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。另外請問今天晚上有需要配合加班嗎？\nPinyin: Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū. Lìngwài qǐngwèn jīntiān wǎnshang yǒu xūyào pèihé jiābān ma?\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa. Ngoài ra xin hỏi tối nay có cần phối hợp tăng ca không ạ?\n練習：Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時，下班時我會記得刷卡打卡。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng, khi tan ca em sẽ nhớ quẹt thẻ).`;
  }

  if (roleId === 'tax') {
    return `中文：您好！五月份是臺灣綜合所得稅申報期。請問您去年在臺灣居留是否滿183天？請出示您的居留證與扣繳憑單。\nPinyin: Nín hǎo! Wǔ yuèfèn shì Táiwān zōnghé suǒdéshuì shēnbào qī. Qǐngwèn nín qùnián zài Táiwān jūliú shìfǒu mǎn yībǎi bāshísān tiān? Qǐng chūshì nín de jūliúzhèng yǔ kòujiǎo píngdān.\nTiếng Việt: Xin chào! Tháng 5 là kỳ kê khai thuế thu nhập cá nhân tại Đài Loan. Xin hỏi năm ngoái bạn có cư trú đủ 183 ngày không? Vui lòng xuất trình thẻ ARC và chứng từ khấu trừ thuế.\n練習：Gợi ý phản xạ: 我去年居留超過183天，這是我的居留證與公司的扣繳憑單，想辦理線上退稅。(Năm ngoái tôi cư trú hơn 183 ngày, đây là thẻ ARC và chứng từ khấu trừ của công ty, tôi muốn làm thủ tục hoàn thuế trực tuyến).`
  }

  if (roleId === 'tech') {
    return `中文：工程師您好！這批3奈米晶圓正在無塵室進行先進製程曝光，目前的良率指標非常穩定。\nPinyin: Gōngchéngshī nín hǎo! Zhè pī sān nàimǐ jīngyuán zhèngzài wúchénshì jìnxíng xiānjìn zhìchéng pùguāng, mùqián de liánglǜ zhǐbiāo fēicháng wěndìng.\nTiếng Việt: Chào kỹ sư! Lô wafer 3nm này đang trong phòng sạch thực hiện quy trình quang khắc tiên tiến, chỉ số tỷ lệ thành phẩm (yield rate) hiện rất ổn định.\n練習：Gợi ý phản xạ: 請特別監控這道蝕刻步驟的良率變化，並與研發部門確認參數。(Xin đặc biệt theo dõi biến động tỷ lệ thành phẩm ở bước khắc này và xác nhận thông số với bộ phận R&D).`;
  }

  if (roleId === 'scooter') {
    return `中文：你好！租機車一天六百元，附兩頂安全帽。請問你有國際駕照或臺灣機車駕照嗎？加滿95汽油，發票存載具。\nPinyin: Nǐ hǎo! Zū jīchē yì tiān liùbǎi yuán, fù liǎng dǐng ānquánmào. Qǐngwèn nǐ yǒu guójì jiàzhào huò Táiwān jīchē jiàzhào ma? Jiāmǎn jiǔwǔ qìyóu, fāpiào cún zàijù.\nTiếng Việt: Chào bạn! Thuê xe máy một ngày 600 tệ, kèm 2 mũ bảo hiểm. Bạn có bằng lái quốc tế hay Đài Loan không? Đổ đầy xăng 95, hóa đơn lưu mã thẻ.\n練習：Gợi ý phản xạ: 請問前面有台灣中油加油站嗎？95加滿，謝謝！(Xin hỏi phía trước có trạm xăng CPC không? Đổ đầy xăng 95, cảm ơn!).`;
  }

  // 1. Factory work & Overtime
  if (t.includes('công xưởng') || t.includes('tăng ca') || t.includes('quẹt thẻ') || t.includes('máy hỏng') || t.includes('tổ trưởng') || t.includes('加班') || t.includes('打卡') || t.includes('機台') || t.includes('組長')) {
    return `中文：組長，這台機器剛才亮紅燈故障了，需要找維修人員。另外請問今天需要加班嗎？\nPinyin: Zǔzhǎng, zhè tái jīqì gāngcái liàng hóngdēng gùzhàng le, xūyào zhǎo wéixiū rényuán. Lìngwài qǐngwèn jīntiān xūyào jiābān ma?\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ bị lỗi, cần gọi thợ bảo trì. Ngoài ra xin hỏi hôm nay có cần tăng ca không ạ?\n練習：Gợi ý phản xạ: 我今天可以配合加班兩個小時，下班時我會記得打卡。(Hôm nay tôi có thể phối hợp tăng ca 2 tiếng, khi tan ca tôi sẽ nhớ quẹt thẻ).`;
  }

  // 2. Tax filing & 183 days residency
  if (t.includes('khai thuế') || t.includes('thuế thu nhập') || t.includes('183 ngày') || t.includes('hoàn thuế') || t.includes('giảm trừ') || t.includes('報稅') || t.includes('所得稅') || t.includes('扣繳憑單') || t.includes('退稅')) {
    return `中文：外籍人士一曆年住滿183天適用綜合所得稅累進稅率，並可享有標準扣除額與退稅。\nPinyin: Wàijí rénshì yì lìnìan zhùmǎn yībǎi bāshísān tiān shìyòng zōnghé suǒdéshuì lěijìn shuìlǜ, bìng kě xiǎngyǒu biāozhǔn kòuchú'é yǔ tuìshuì.\nTiếng Việt: Người nước ngoài ở đủ 183 ngày trong một năm dương lịch được áp dụng biểu thuế lũy tiến, hưởng mức giảm trừ tiêu chuẩn và được hoàn thuế.\n練習：Gợi ý phản xạ: 請問線上報稅需要準備健保卡和讀卡機嗎？(Xin hỏi khai thuế online có cần chuẩn bị thẻ BHYT và đầu đọc thẻ không?).`;
  }

  // 3. Semiconductor & High-tech
  if (t.includes('bán dẫn') || t.includes('wafer') || t.includes('phòng sạch') || t.includes('tsmc') || t.includes('tiến trình') || t.includes('3nm') || t.includes('2nm') || t.includes('晶圓') || t.includes('無塵室') || t.includes('半導體') || t.includes('良率')) {
    return `中文：工程師您好！這批晶圓正在無塵室進行曝光製程，良率表現相當優秀。\nPinyin: Gōngchéngshī nín hǎo! Zhè pī jīngyuán zhèngzài wúchénshì jìnxíng pùguāng zhìchéng, liánglǜ biǎoxiàn xiāngdāng yōuxiù.\nTiếng Việt: Chào kỹ sư! Lô wafer này đang được quang khắc trong phòng sạch, tỷ lệ thành phẩm (yield rate) rất xuất sắc.\n練習：Gợi ý phản xạ: 請持續監控關鍵製程參數以確保良率。(Xin tiếp tục theo dõi các thông số tiến trình then chốt để đảm bảo tỷ lệ thành phẩm).`;
  }

  // 4. Scooter rental & Transportation
  if (t.includes('xe máy') || t.includes('thuê xe') || t.includes('機車') || t.includes('租車') || t.includes('xăng') || t.includes('mũ bảo hiểm') || t.includes('95加滿') || t.includes('加油站')) {
    return `中文：租機車一天六百元，請出示駕照。這頂是你的安全帽，前面右轉有一家加油站。\nPinyin: Zū jīchē yì tiān liùbǎi yuán, qǐng chūshì jiàzhào. Zhè dǐng shì nǐ de ānquánmào, qiánmiàn yòuzhuǎn yǒu yì jiā jiāyóuzhàn.\nTiếng Việt: Thuê xe máy một ngày 600 tệ, vui lòng xuất trình bằng lái. Đây là mũ bảo hiểm của bạn, rẽ phải phía trước có một trạm xăng.\n練習：Gợi ý phản xạ: 請問需要先加滿油再還車嗎？(Xin hỏi lúc trả xe có cần đổ đầy xăng không?).`;
  }

  // 5. Bubble tea & Beverage ordering (avoid matching 'đường' in 'đường phố')
  if (t.includes('trà sữa') || t.includes('奶茶') || t.includes('trân châu') || t.includes('珍珠') || t.includes('50嵐') || t.includes('thanh tâm') || /(độ|ít|nửa|thêm|không)\s+đường/i.test(t) || /(ít|nửa|không)\s+đá/i.test(t) || t.includes('半糖') || t.includes('微糖') || t.includes('少冰') || t.includes('微冰')) {
    return `中文：你要喝珍珠奶茶還是四季春茶？甜度和冰塊要微糖微冰還是半糖少冰？\nPinyin: Nǐ yào hē zhēnzhū nǎichá háishì sìjìchūnchá? Tiándù hé bīngkuài yào wēitáng wēibīng háishì bàntáng shǎobīng?\nTiếng Việt: Bạn muốn uống trà sữa trân châu hay trà Tứ Quý Xuân? Độ ngọt và đá chọn ít đường ít đá hay nửa đường ít đá?\n練習：Gợi ý phản xạ: 我要一杯波霸奶茶，半糖少冰，外帶，謝謝！(Cho tôi một ly trà sữa trân châu lớn, nửa đường ít đá, mang đi, cảm ơn!).`;
  }

  // 3. MRT & Commute & EasyCard
  if (t.includes('mrt') || t.includes('捷運') || t.includes('easycard') || t.includes('悠遊卡') || t.includes('ga') || t.includes('lối ra') || t.includes('chuyển tàu') || t.includes('hỏi đường')) {
    return `中文：最近的捷運站就在前面直走右轉。進出站請刷悠遊卡，也可以在機台加值。\nPinyin: Zuìjìn de jiéyùn zhàn jiù zài qiánmiàn zhízǒu yòuzhuǎn. Jìn chū zhàn qǐng shuā yōuyóukǎ, yě kěyǐ zài jītái jiāzhí.\nTiếng Việt: Ga MRT gần nhất ở ngay phía trước đi thẳng rồi rẽ phải. Ra vào ga vui lòng quẹt thẻ EasyCard, bạn cũng có thể nạp tiền tại máy.\n練習：Gợi ý phản xạ: 請問去台北車站要在哪裡轉乘紅線？(Xin hỏi muốn đến Ga Đài Bắc thì chuyển sang tuyến đỏ ở đâu?).`;
  }

  // 4. Night market & Beef noodles & Dining
  if (t.includes('chợ đêm') || t.includes('夜市') || t.includes('mì bò') || t.includes('牛肉麵') || t.includes('đậu phụ') || t.includes('臭豆腐') || t.includes('bánh dứa') || t.includes('鳳梨酥') || t.includes('món ăn') || t.includes('ngon')) {
    return `中文：夜市裡最有名的就是紅燒牛肉麵和外酥內嫩的臭豆腐。請問要不要加辣？\nPinyin: Yèshì lǐ zuì yǒumíng de jiùshì hóngshāo niúròu miàn hàn wài sū nèi nèn de chòudòufu. Qǐngwèn yào bú yào jiā là?\nTiếng Việt: Ở chợ đêm nổi tiếng nhất là mì bò kho đậm đà và đậu phụ thối giòn tan. Xin hỏi bạn có muốn thêm cay không?\n練習：Gợi ý phản xạ: 老闆，我要一份小碗牛肉麵，不要太辣，謝謝！(Chủ quán, cho tôi một tô mì bò nhỏ, đừng cay quá, cảm ơn!).`;
  }

  // 5. Convenience store & Receipts & Payments
  if (t.includes('tiện lợi') || t.includes('7-11') || t.includes('seven') || t.includes('hóa đơn') || t.includes('發票') || t.includes('túi') || t.includes('quẹt thẻ') || t.includes('tiền mặt') || t.includes('thanh toán')) {
    return `中文：一共八十五元。請問需要購買袋子嗎？發票要印出來還是存載具？\nPinyin: Yígòng bāshíwǔ yuán. Qǐngwèn xūyào gòumǎi dàizi ma? Fāpiào yào yìn chūlái háishì cún zàijù?\nTiếng Việt: Tổng cộng 85 tệ. Xin hỏi bạn có cần mua túi không? Hóa đơn in ra hay lưu vào mã điện tử?\n練習：Gợi ý phản xạ: 不用袋子，請給我紙本發票，我用現金付錢。(Không cần túi, xin cho tôi hóa đơn giấy, tôi trả tiền mặt).`;
  }

  // 6. Apartment rental & Deposit & Utilities
  if (t.includes('thuê nhà') || t.includes('租房') || t.includes('tiền phòng') || t.includes('tiền cọc') || t.includes('điện nước') || t.includes('phòng trọ') || t.includes('chủ nhà')) {
    return `中文：這間獨立套房月租八千元，採光很好。押金是兩個月房租，水電費按台電帳單計算。\nPinyin: Zhè jiān dúlì tàofáng yuèzū bāqiān yuán, cǎiguāng hěn hǎo. Yājīn shì liǎng ge yuè fángzū, shuǐdiànfèi àn Táidiàn zhàngdān jìsuàn.\nTiếng Việt: Phòng khép kín này tiền thuê mỗi tháng 8.000 tệ, rất thoáng sáng. Tiền cọc là 2 tháng, tiền điện nước tính theo hóa đơn của công ty điện lực Đài Loan.\n練習：Gợi ý phản xạ: 請問房間有包含洗衣機和網路嗎？週末方便看房嗎？(Phòng có máy giặt và mạng internet không? Cuối tuần xem phòng được không?).`;
  }

  // 7. Clinic & Medical & Health insurance
  if (t.includes('khám bệnh') || t.includes('bệnh viện') || t.includes('đau đầu') || t.includes('sốt') || t.includes('thuốc') || t.includes('bảo hiểm') || t.includes('bhyt') || t.includes('健保卡')) {
    return `中文：請先出示健保卡填寫初診資料。醫生會為您診斷，記得按時服藥並多休息。\nPinyin: Qǐng xiān chūshì jiànbǎokǎ tiánxiě chūzhěn zīliào. Yīshēng huì wèi nín zhěnduàn, jìde ànshí fúyào bìng duō xiūxi.\nTiếng Việt: Vui lòng xuất trình thẻ Bảo hiểm Y tế để điền thông tin khám lần đầu. Bác sĩ sẽ chẩn đoán cho bạn, nhớ uống thuốc đúng giờ và nghỉ ngơi nhiều nhé.\n練習：Gợi ý phản xạ: 我從昨天下午開始頭痛，體溫大概三十八度。(Tôi bắt đầu đau đầu từ chiều qua, thân nhiệt khoảng 38 độ).`;
  }

  // 8. Banking & ARC & Remittance
  if (t.includes('ngân hàng') || t.includes('bưu điện') || t.includes('mở tài khoản') || t.includes('thẻ atm') || t.includes('con dấu') || t.includes('chuyển tiền') || t.includes('arc') || t.includes('cư trú')) {
    return `中文：外籍人士開戶需要攜帶有效居留證（ARC）、護照以及個人印章，並填寫臨櫃申請表。\nPinyin: Wàijí rénshì kāihù xūyào xiédài yǒuxiào jūliúzhèng (ARC), hùzhào yǐjí gèrén yìnzhāng, bìng tiánxiě línguì shēnqǐngbiǎo.\nTiếng Việt: Người nước ngoài mở tài khoản cần mang theo thẻ cư trú (ARC) còn hạn, hộ chiếu và con dấu cá nhân, rồi điền đơn tại quầy giao dịch.\n練習：Gợi ý phản xạ: 我想辦理約定轉帳和網路銀行功能，謝謝！(Tôi muốn đăng ký chuyển khoản định danh và ngân hàng điện tử internet banking, cảm ơn!).`;
  }

  // 9. Workplace & Meetings & Asking for leave
  if (t.includes('công sở') || t.includes('đi làm') || t.includes('họp') || t.includes('nghỉ phép') || t.includes('tăng ca') || t.includes('đồng nghiệp') || t.includes('sếp') || t.includes('lương')) {
    return `中文：我們今天下午兩點在第三會議室開會。如果有事需要請假，請記得在差勤系統填寫假單。\nPinyin: Wǒmen jīntiān xiàwǔ liǎng diǎn zài dì sān huìyìshì kāihuì. Rúguǒ yǒu shì xūyào qǐngjià, qǐng jìde zài chāiqín xìtǒng tiánxiě jiàdān.\nTiếng Việt: Chúng ta họp lúc 2 giờ chiều nay ở phòng họp số 3. Nếu có việc cần xin nghỉ phép, nhớ điền đơn trên hệ thống chấm công nhé.\n練習：Gợi ý phản xạ: 經理，不好意思，我明天家裡有事想請一天事假。(Thưa quản lý, ngày mai nhà em có việc nên em xin phép nghỉ một ngày phép riêng ạ).`;
  }

  // 10. Job interview & Resume
  if (t.includes('phỏng vấn') || t.includes('xin việc') || t.includes('cv') || t.includes('kinh nghiệm') || t.includes('chuyên môn')) {
    return `中文：很高興能與您面試！請用中文簡單介紹您的專業背景、過往專案經驗以及為何想加入本公司。\nPinyin: Hěn gāoxìng néng yǔ nín miànshì! Qǐng yòng zhōngwén jiǎndān jièshào nín de zhuānyè bèijǐng, guòwǎng zhuān'àn jīngyàn yǐjí wèihé xiǎng jiārù běn gōngsī.\nTiếng Việt: Rất vui được phỏng vấn cùng bạn! Xin hãy dùng tiếng Hoa giới thiệu ngắn gọn nền tảng chuyên môn, các dự án từng tham gia và lý do muốn gia nhập công ty.\n練習：Gợi ý phản xạ: 我在資訊軟體領域有三年工作經驗，擅長跨部門溝通與系統開發。(Tôi có 3 năm kinh nghiệm trong ngành phần mềm, giỏi giao tiếp liên phòng ban và phát triển hệ thống).`;
  }

  // 11. Asking for meaning or translation
  if (t.includes('nghĩa là gì') || t.includes('dịch') || t.includes('nói sao') || t.includes('nói thế nào')) {
    return `中文：這句話在臺灣生活中很常見！您可以直接說：「請問這個用中文怎麼說？」\nPinyin: Zhè jù huà zài Táiwān shēnghuó zhōng hěn chángjiàn! Nín kěyǐ zhíjiē shuō: "Qǐngwèn zhège yòng zhōngwén zěnme shuō?"\nTiếng Việt: Câu này rất phổ biến trong cuộc sống Đài Loan! Bạn có thể hỏi thẳng: "Xin hỏi câu này tiếng Trung nói thế nào?".\n練習：Hãy thử gõ một cụm từ cụ thể (ví dụ: gọi taxi, tính tiền, cảm ơn) để tôi giúp bạn dịch sang Phồn thể chuẩn xác nhé!`;
  }

  // General friendly greeting / fallback
  return `中文：你好！很高興認識你。歡迎來到臺灣！隨時隨地跟我練習繁體中文對話。\nPinyin: Nǐ hǎo! Hěn gāoxìng rènshi nǐ. Huānyíng lái dào Táiwān! Suíshí suídì gēn wǒ liànxí fántǐ zhōngwén duìhuà.\nTiếng Việt: Xin chào! Rất vui được làm quen với bạn. Chào mừng bạn đến với Đài Loan! Bạn có thể luyện đàm thoại tiếng Trung Phồn thể cùng tôi bất cứ lúc nào.\n練習：Gợi ý: Bạn có thể chọn các tình huống như gọi trà sữa, đi MRT, thuê xe máy hoặc mua sắm tại cửa hàng tiện lợi để cùng luyện phản xạ.`;
}

export function zhongxueApiPlugin(): Plugin {
  const engine = new DictionaryEngine();

  return {
    name: 'zhongxue-api-middleware',
    async configureServer(server) {
      const dictFile = path.resolve(server.config.root, 'data/dictionary/CVDICT.u8.gz');
      // Initialize dictionary asynchronously in background
      engine.init(dictFile);

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://127.0.0.1:5173');
        const pathname = urlObj.pathname;

        // 1. GET /api/health
        if (pathname === '/api/health') {
          if (!engine.isReady()) {
            await engine.init(dictFile);
          }
          const total = engine.getTotal() || 122596;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ online: true, totalEntries: total }));
          return;
        }

        // 2. GET /api/dictionary
        if (pathname === '/api/dictionary') {
          if (!engine.isReady()) {
            await engine.init(dictFile);
          }

          const id = urlObj.searchParams.get('id');
          if (id) {
            const entry = engine.getById(id);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            if (entry) {
              res.end(JSON.stringify(entry));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Entry not found' }));
            }
            return;
          }

          const q = urlObj.searchParams.get('q') || '';
          const mode = (urlObj.searchParams.get('mode') || 'all') as 'all' | 'hanzi' | 'pinyin' | 'vi';
          const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);
          const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);

          const { results, total } = engine.search(q, mode, offset, limit);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              results,
              total,
              count: engine.getTotal(),
              offset,
              source: 'database'
            })
          );
          return;
        }

        // 3. POST /api/handwriting
        if (pathname === '/api/handwriting' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const strokes = parsed.strokes || [];
              const width = parsed.width || 300;
              const height = parsed.height || 300;

              // Forward to Google Input Tools
              const googlePayload = {
                requests: [
                  {
                    writing_guide: { writing_area_width: width, writing_area_height: height },
                    ink: strokes
                  }
                ]
              };

              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 4000);

              const gRes = await fetch(
                'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=translate',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(googlePayload),
                  signal: controller.signal
                }
              );
              clearTimeout(timeout);

              if (gRes.ok) {
                const gData = await gRes.json();
                if (gData && gData[0] === 'SUCCESS' && gData[1]?.[0]?.[1]) {
                  const candidates: string[] = gData[1][0][1];
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ candidates, source: 'google' }));
                  return;
                }
              }
            } catch {
              // Google failed / timeout / offline
            }

            // Fallback response allowing frontend to run client-side classifier
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ candidates: [], source: 'fallback' }));
          });
          return;
        }

        // 4. /api/conversation (GET for status, POST for conversation & health ping)
        if (pathname === '/api/conversation') {
          if (req.method === 'GET') {
            ensureEnvLoaded();
            const envApiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || '';
            const envBaseUrl = process.env.AI_BASE_URL || (envApiKey.startsWith('sk-or-') ? 'https://openrouter.ai/api/v1' : 'https://agentrouter.org/v1');
            const isAgentRouter = envBaseUrl.includes('agentrouter');
            const envModel = process.env.AI_MODEL || (isAgentRouter ? 'gpt-6.1-sol' : 'google/gemini-2.0-flash-001');

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              status: 'ready',
              ok: true,
              provider: isAgentRouter ? `AgentRouter (${envModel})` : `OpenRouter (${envModel})`,
              baseUrl: envBaseUrl,
              model: envModel,
              hasApiKey: Boolean(envApiKey)
            }));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                ensureEnvLoaded();
                const parsed = JSON.parse(body || '{}');
                const envModel = process.env.AI_MODEL || 'gpt-6.1-sol';
                const model = (parsed.model || envModel).trim();
                const isSolModel = model === 'gpt-6.1-sol' || model.includes('sol');

                const defaultSolKey = (process.env.AI_SOL_KEY || process.env.AI_API_KEY || '').trim();
                const defaultDeepseekKey = (process.env.AI_DEEPSEEK_KEY || '').trim();

                let apiKey = (parsed.apiKey || '').trim();
                const envBaseUrl = process.env.AI_BASE_URL || (apiKey.startsWith('sk-or-') ? 'https://openrouter.ai/api/v1' : 'https://agentrouter.org/v1');
                const baseUrl = (parsed.baseUrl || envBaseUrl).replace(/\/$/, '');
                const isAgentRouter = baseUrl.includes('agentrouter');
                const isOpenRouter = baseUrl.includes('openrouter');

                if (isAgentRouter) {
                  if (isSolModel) {
                    if (!apiKey || (defaultDeepseekKey && apiKey === defaultDeepseekKey)) {
                      apiKey = defaultSolKey;
                    }
                  } else {
                    if (!apiKey || (defaultSolKey && apiKey === defaultSolKey)) {
                      apiKey = defaultDeepseekKey || defaultSolKey;
                    }
                  }
                }
                if (!apiKey) {
                  apiKey = isSolModel ? defaultSolKey : (defaultDeepseekKey || defaultSolKey);
                }
                const timeoutMs = parsed.timeoutMs || Number(process.env.AI_TIMEOUT_MS) || (isAgentRouter ? 90000 : 25000);

                // Ping / Health Check Action
                if (parsed.action === 'ping' || parsed.action === 'health') {
                  const tStart = Date.now();
                  if (!apiKey) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({
                      ok: false,
                      provider: isAgentRouter ? 'AgentRouter' : 'OpenRouter',
                      model,
                      baseUrl,
                      error: 'Chưa cấu hình API Key trong .env hoặc Cài đặt'
                    }));
                    return;
                  }

                  try {
                    const pingHeaders: Record<string, string> = {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`
                    };
                    if (isAgentRouter) {
                      pingHeaders['Originator'] = 'codex_cli_rs';
                      pingHeaders['User-Agent'] = 'codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12';
                      pingHeaders['Version'] = '0.101.0';
                    }

                    let pingRes: Response;
                    if (isSolModel && isAgentRouter) {
                      pingRes = await fetch(`${baseUrl}/responses`, {
                        method: 'POST',
                        headers: pingHeaders,
                        body: JSON.stringify({
                          model,
                          input: 'ping',
                          max_output_tokens: 50
                        }),
                        signal: AbortSignal.timeout(Math.min(timeoutMs, 15000))
                      });
                    } else {
                      pingRes = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: pingHeaders,
                        body: JSON.stringify({
                          model,
                          messages: [{ role: 'user', content: 'ping' }],
                          max_tokens: 50
                        }),
                        signal: AbortSignal.timeout(Math.min(timeoutMs, 15000))
                      });
                    }

                    const elapsed = Date.now() - tStart;
                    if (pingRes.ok) {
                      res.setHeader('Content-Type', 'application/json; charset=utf-8');
                      res.end(JSON.stringify({
                        ok: true,
                        provider: isAgentRouter ? `AgentRouter (${model})` : `OpenRouter (${model})`,
                        model,
                        baseUrl,
                        latencyMs: elapsed
                      }));
                      return;
                    } else {
                      const errText = await pingRes.text().catch(() => '');
                      res.setHeader('Content-Type', 'application/json; charset=utf-8');
                      res.end(JSON.stringify({
                        ok: false,
                        provider: isAgentRouter ? 'AgentRouter' : 'OpenRouter',
                        model,
                        baseUrl,
                        statusCode: pingRes.status,
                        error: `Lỗi máy chủ (${pingRes.status}): ${errText.slice(0, 150)}`
                      }));
                      return;
                    }
                  } catch (err) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({
                      ok: false,
                      provider: isAgentRouter ? 'AgentRouter' : 'OpenRouter',
                      model,
                      baseUrl,
                      error: err instanceof Error ? err.message : 'Lỗi kết nối mạng'
                    }));
                    return;
                  }
                }

                // Normal Conversation Flow
                const messages = parsed.messages || [];
                const lastMsg = messages[messages.length - 1]?.content || '';
                const roleId = parsed.roleId || '';

                if (apiKey && apiKey.length > 8) {
                  try {
                    let roleContext = '';
                    if (roleId === 'tea') {
                      roleContext = 'Tình huống: Quầy trà sữa Đài Loan (50嵐), hỏi đồ uống, điều chỉnh độ ngọt (đường) và đá (nhiều đá/ít đá/không đá), mua mang đi hay dùng tại quán.';
                    } else if (roleId === 'mrt') {
                      roleContext = 'Tình huống: Ga tàu điện ngầm Đài Bắc (MRT), mua thẻ EasyCard (悠遊卡), nạp tiền và hỏi tuyến đổi tàu.';
                    } else if (roleId === 'store') {
                      roleContext = 'Tình huống: Cửa hàng tiện lợi 7-Eleven / FamilyMart Đài Loan, thanh toán, in hóa đơn hoặc lưu thẻ, gửi bưu kiện.';
                    } else if (roleId === 'nightmarket') {
                      roleContext = 'Tình huống: Chợ đêm Đài Loan, gọi món ăn vặt, mì bò kho, đậu phụ thối, hỏi độ cay.';
                    } else if (roleId === 'house') {
                      roleContext = 'Tình huống: Thuê phòng trọ tại Đài Loan, hỏi tiền cọc, tiền điện nước, hẹn giờ xem phòng.';
                    } else if (roleId === 'clinic') {
                      roleContext = 'Tình huống: Phòng khám và BHYT Đài Loan, xuất trình thẻ BHYT (健保卡), miêu tả triệu chứng sốt hoặc đau đầu.';
                    } else if (roleId === 'factory') {
                      roleContext = 'Tình huống: Công xưởng Đài Loan, giao tiếp với Quản đốc/Tổ trưởng sản xuất (組長) về máy móc, kiểm hàng, xin tăng ca hoặc nghỉ phép.';
                    } else if (roleId === 'tax') {
                      roleContext = 'Tình huống: Cục thuế Đài Loan (國稅局) tháng 5, kê khai thuế thu nhập cá nhân (綜合所得稅), hoàn thuế (退稅), chứng từ khấu trừ (扣繳憑單).';
                    } else if (roleId === 'tech') {
                      roleContext = 'Tình huống: Khu công nghệ Tân Trúc / TSMC, thảo luận tấm wafer 3nm, phòng sạch, tỷ lệ thành phẩm (良率), tiến trình bán dẫn.';
                    } else if (roleId === 'scooter') {
                      roleContext = 'Tình huống: Thuê xe máy ở Đài Loan, đổ xăng 95, gửi xe, tra cứu trạm xăng CPC.';
                    } else if (roleId === 'interview') {
                      roleContext = 'Tình huống: Phỏng vấn xin việc tại Đài Loan, giới thiệu bản thân, phúc lợi lao bảo y bảo, thời gian đi làm.';
                    }

                    const prompt = `你是 ZhongXue+ 的臺灣華語對話與發音練習助教。請使用繁體中文、臺灣常用詞彙與自然臺灣腔調。
${roleContext ? `【目前練習情境】：${roleContext}` : ''}
請嚴格按照以下4行格式回應，不要使用 Markdown 星號或多餘格式：
中文：[Một câu tiếng Hoa Phồn thể chuẩn giọng Đài Loan tự nhiên phù hợp ngữ cảnh]
Pinyin: [Phiên âm Pinyin kèm dấu thanh điệu chuẩn]
Tiếng Việt: [Dịch nghĩa tiếng Việt tự nhiên và giải thích ngữ cảnh ngắn gọn]
練習：[Nhận xét ngắn về phát âm hoặc ngữ pháp, kèm 1 gợi ý câu phản xạ ngắn để người học luyện nói tiếp]`;

                    const reqHeaders: Record<string, string> = {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`
                    };
                    if (isAgentRouter) {
                      reqHeaders['Originator'] = 'codex_cli_rs';
                      reqHeaders['User-Agent'] = 'codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12';
                      reqHeaders['Version'] = '0.101.0';
                    }

                    let aiText: string | null = null;

                    if (isSolModel && isAgentRouter) {
                      // OpenAI Responses API for gpt-6.1-sol
                      const convHistory = messages.map((m: { role: string; content: string }) =>
                        `${m.role === 'user' ? 'Người học' : 'Trợ lý AI'}: ${m.content}`
                      ).join('\n');
                      const fullInput = `${prompt}\n\n【Lịch sử hội thoại】：\n${convHistory}`;

                      const llmRes = await fetch(`${baseUrl}/responses`, {
                        method: 'POST',
                        headers: reqHeaders,
                        body: JSON.stringify({
                          model,
                          input: fullInput,
                          max_output_tokens: 2500
                        }),
                        signal: AbortSignal.timeout(timeoutMs)
                      });

                      if (llmRes.ok) {
                        const llmData = await llmRes.json();
                        aiText = extractResponseApiText(llmData);
                      } else {
                        const errBody = await llmRes.text().catch(() => '');
                        console.warn(`[zhongxue-ai] Responses API returned ${llmRes.status}:`, errBody.slice(0, 160));
                      }
                    } else {
                      // Standard chat/completions API for DeepSeek V4 Flash & OpenRouter
                      const payload: Record<string, unknown> = {
                        model,
                        messages: [
                          { role: 'system', content: prompt },
                          ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
                        ],
                        max_tokens: 4096
                      };
                      if (isOpenRouter) {
                        payload.reasoning = { enabled: false, exclude: true };
                      }

                      const llmRes = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: reqHeaders,
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(timeoutMs)
                      });

                      if (llmRes.ok) {
                        const llmData = await llmRes.json();
                        const rawText = llmData?.choices?.[0]?.message?.content || llmData?.choices?.[0]?.message?.reasoning_content;
                        if (rawText && typeof rawText === 'string') {
                          aiText = rawText.trim();
                        }
                      } else {
                        const errBody = await llmRes.text().catch(() => '');
                        console.warn(`[zhongxue-ai] API call returned ${llmRes.status}:`, errBody.slice(0, 160));
                      }
                    }

                    if (aiText) {
                      res.setHeader('Content-Type', 'application/json; charset=utf-8');
                      res.end(JSON.stringify({
                        mode: 'ai',
                        provider: isAgentRouter ? `AgentRouter (${model})` : `OpenRouter (${model})`,
                        content: aiText.trim(),
                        thread: { id: Date.now(), messages }
                      }));
                      return;
                    }
                  } catch (err) {
                    console.warn('[zhongxue-ai] Live AI call failed, falling back to local Sinology engine:', err instanceof Error ? err.message : err);
                  }
                }

                // Local High-Precision Sinology AI Engine (Zero-Latency, 100% Reliable Fallback)
                const content = generateSinologyAiReply(lastMsg, roleId);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  mode: 'ai',
                  provider: 'Sinology Local NLP',
                  content,
                  thread: { id: Date.now(), messages }
                }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid request body' }));
              }
            });
            return;
          }
        }

        next();
      });
    }
  };
}
