import { GlossaryEntry } from './aiForceGlossary';
import { WaveBusinessCyclePhase, TidalRegime } from '../types/zavySlowWealth';

/**
 * 將波浪製造業週期階段轉換為繁體中文白話標籤
 */
export function formatWavePhaseLabel(phase: WaveBusinessCyclePhase): string {
  switch (phase) {
    case 'RECOVERY':
      return '復甦期';
    case 'EXPANSION':
      return '擴張成長期';
    case 'BOOM_MID':
      return '榮景主升段';
    case 'BOOM_LATE':
      return '榮景末升段';
    case 'MID_CYCLE_SLOWDOWN':
      return '中期趨緩期';
    case 'RECESSION':
      return '實質衰退期';
    default:
      return String(phase);
  }
}

/**
 * 將 10Y 美債殖利率新常態區間狀態轉為繁體中文白話描述
 */
export function formatTreasuryStatusLabel(
  status: 'BELOW_RANGE' | 'IN_RANGE_4_TO_5_5' | 'ABOVE_RANGE'
): string {
  switch (status) {
    case 'IN_RANGE_4_TO_5_5':
      return '4.0%~5.5% 新常態平衡區';
    case 'BELOW_RANGE':
      return '低於 4.0% 寬鬆預期區';
    case 'ABOVE_RANGE':
      return '高於 5.5% 高壓警戒區';
    default:
      return String(status);
  }
}

/**
 * 將 30 年潮汐體制轉為繁體中文白話描述
 */
export function formatTidalRegimeLabel(regime: TidalRegime): string {
  switch (regime) {
    case 'PRODUCTIVITY_EXPANSION':
      return '生產力擴張大週期 (AI/半導體驅動)';
    case 'STAGFLATION_PRESSURE':
      return '停滯性通膨壓力期';
    case 'STRUCTURAL_TRANSITION':
      return '結構轉型過渡期';
    default:
      return String(regime);
  }
}

/**
 * Zavy「散戶慢富之路」工作區專屬新手白話決策字典 (M01~M06, B01~B04, T01~T08)
 * 100% 相容既有 TermTooltip 組件 (Spec 0174 / Spec 0223)
 */
export const ZAVY_SLOW_WEALTH_GLOSSARY: Record<string, GlossaryEntry> = {
  M00_confidenceScore: {
    id: 'M00_confidenceScore',
    term: '總經指標入庫信心度 (Data Completeness)',
    enTerm: 'Macro Data Completeness & Confidence Score',
    category: 'core',
    metaphor:
      '這不是「預測未來漲跌的勝率」，而是氣象局衛星雲圖的「解析度與清晰度」。打分數只代表今天有多少項核心總經硬數據已準時到位入庫。',
    meaning:
      '評估製造業擴張、10Y 美債、美台動能輪動與信用裂痕雷達等 6 項核心宏觀指標之實時連線完整度（6/6 項入庫即為 100 分）。',
    buySignal:
      '信心度達 60 分以上且指標顯示順風時，代表判斷依據建立在充分真實的硬數據上，決策具高度代表性與抗雜訊能力。',
    sellSignal:
      '信心度低於 50 分時，表示部分國際或官方指標延遲發布，系統將自動啟動免費替代硬數據（如營收擴散指數、新訂單減存貨利差），切勿因此盲目猜測方向。',
    neutralWarning:
      '永遠記住：信心度代表「數據充分度」，而非「市場上漲機率」。只要客觀數據齊全，就算風雨欲來也能提前穿好防彈衣。',
  },

  M01_threeTierCycle: {
    id: 'M01_threeTierCycle',
    term: '三級總經週期（潮汐 · 波浪 · 漣漪）',
    enTerm: 'Three-Tier Macro Cycle (Tidal / Wave / Ripple)',
    category: 'core',
    metaphor:
      '把投資想像成在海上航行：「潮汐」是 10~30 年的科技與利率大氣候；「波浪」是 2~4 年企業清庫存與補庫存的四季循環；而每天的新聞、突發利空或單日暴跌，都只是海面上的「漣漪」。',
    meaning:
      'Zavy 慢富體系的最高大局觀框架：以 30 年生產力與利率中樞定錨（潮汐），以 2~4 年製造業庫存循環決定攻守水位（波浪），並過濾日度市場情緒雜訊（漣漪）。',
    buySignal:
      '只要 30 年潮汐向上（AI 生產力擴張）且 2~4 年波浪處於復甦或擴張期，任何因為短期壞消息造成的急跌都只是「波浪回檔」，切記勿對漣漪起反應，應抱牢或逢低分批買進！',
    sellSignal:
      '只有當 2~4 年製造業波浪進入「榮景末升段過熱」或「實質衰退」時，才需要依紀律分批調降股票比例、轉進防彈衣，絕不因單日新聞恐慌殺低。',
    neutralWarning:
      '散戶之所以拿不到長期複利，是因為總把「漣漪」當成「海嘯」，在多頭半路上自己跳船。看懂週期位階，才能安心把路走完。',
  },

  M02_treasury10yNewNormal: {
    id: 'M02_treasury10yNewNormal',
    term: '10Y 美債殖利率新常態 (4.0%~5.5%)',
    enTerm: '10-Year Treasury Yield New Normal (4.0%–5.5%)',
    category: 'valuation',
    metaphor:
      '全球資金的「定價地心引力」與「健康體溫」。告別過去極端的零利率時代，現在 4.0%~5.5% 就像成年人正常健康的體溫，代表經濟有活力、且公債防彈衣自帶豐厚利息。',
    meaning:
      '美國 10 年期公債殖利率。Zavy 實證指出二次升息後，只要實質生產力持續成長，4.0%~5.5% 為長期宏觀平衡區間，更是未來萬一發生衰退時聯準會具備「充足降息緩衝空間」的保護墊。',
    buySignal:
      '處於 4.0%~5.5% 新常態平衡區時，代表經濟穩健、沒有衰退疑慮，同時公債殖利率甜美。無需天天焦慮猜測降息幾碼，安心按比例持有股票，並用股息分批建立純公債防彈衣。',
    sellSignal:
      '突破 5.5% 高壓警戒區時，長期資金成本過高，高估值投機股容易面臨殺估值壓力，應暫停追高波段個股，優先償還借貸槓桿。',
    neutralWarning:
      '跌破 4.0% 寬鬆/放緩區時，市場開始反映景氣趨緩或降息預期，此時手上的純公債防彈衣將開始發揮資本利得保護效果。',
  },

  M03_waveBusinessCyclePmi: {
    id: 'M03_waveBusinessCyclePmi',
    term: '波浪商業週期 (美 ISM / 台 PMI 與免費替代硬數據)',
    enTerm: 'Wave Business Cycle & Manufacturing PMI',
    category: 'core',
    metaphor:
      '全球工廠老闆的「訂單忙不忙溫度計」，以 50 分當作及格線。大於 50 代表工廠訂單滿滿、加班擴張；小於 50 代表倉庫堆滿貨、老闆正在縮衣節食清庫存。',
    meaning:
      '每 2~4 年循環一次的製造業庫存週期（復甦 ➔ 擴張 ➔ 榮景主升 ➔ 榮景末升 ➔ 中期趨緩 ➔ 實質衰退）。股市的中期方向永遠跟著製造業補庫存與去庫存的節奏走。',
    buySignal:
      '復甦期 / 擴張期 / 榮景主升段：PMI 站穩 50 以上或新訂單減存貨翻正，代表企業獲利持續向上，是勝率最高的順風期，建議維持 80%~90% 積極股票水位。',
    sellSignal:
      '榮景末升段 / 實質衰退期：當景氣過熱（PMI > 55 且通膨/利差極端）或掉入衰退（PMI < 48 且訂單萎縮），應預防性將持股調降至 65%~75%（衰退期降至 25%~40%），保護勝利果實。',
    neutralWarning:
      '為什麼有時顯示 --？美國 ISM 與台灣官方 PMI 屬於機構付費封閉調查。當顯示 -- 時，系統已自動改用更即時客觀的免費官方硬數據——「美國製造業新訂單減存貨利差」與「台股上市櫃月營收擴散指數」幫你精準定錨！',
  },

  M04_ordersMinusInventory: {
    id: 'M04_ordersMinusInventory',
    term: '製造業新訂單減存貨利差',
    enTerm: 'Manufacturing New Orders Minus Inventories Spread',
    category: 'forecast',
    metaphor:
      '工廠的「未來新訂單」減去「倉庫舊存貨」的領先望遠鏡。只要新訂單跑得比倉庫存貨還快（數值 > 0），就代表工廠馬上要開工大補貨了！',
    meaning:
      '由美國人口普查局 (FRED: AMTMNO - AMTMTI) 計算之製造業新訂單年增率減去總存貨年增率差值。比一般 PMI 更早 1~2 個季度預告製造業波浪的谷底翻揚與高檔轉折。',
    buySignal:
      '利差翻正 (> 0) 或由負轉正收斂：客戶倉庫已經清空、新訂單開始湧入，這是 2~3 年製造業多頭波浪最可靠的起跑訊號，遇到拉回皆應勇敢佈局！',
    sellSignal:
      '利差高檔大幅翻負 (< -2.0)：新訂單急凍、倉庫卻堆滿賣不掉的存貨，預告企業即將進入痛苦的去庫存修正，宜停止追高並拉高防彈衣比重。',
    neutralWarning:
      '0 軸附近震盪：處於中期庫存微調階段，維持核心底倉與定期定額，不必過度頻繁進出。',
  },

  M05_smallTruckVsBigTruck: {
    id: 'M05_smallTruckVsBigTruck',
    term: '美台動能輪動（美國大卡車 vs 台灣小車）',
    enTerm: 'US Big Truck vs. Taiwan Small Scooter Lead-Lag Model',
    category: 'core',
    metaphor:
      '美國是載滿內需消費的「重型大卡車」，轉彎慢但噸位大；台灣則是專做半導體與外銷代工的「靈活小跑車」。蘋果與輝達要先向台灣下單造晶片（小車先衝），幾個月後美國商場才有成品賣（大卡車跟上）！',
    meaning:
      '結合台灣外銷訂單年增率與「台股上市櫃月營收擴散指數（營收年增正成長家數佔比）」，對比美國製造業動能。台灣小車通常領先美國大卡車 1~2 個季度（約 3~6 個月）觸底或見頂。',
    buySignal:
      '台灣小車率先向上領先：當台股外銷訂單或月營收擴散指數率先衝破 50 加速向上，就算美國數據看起來還在溫吞整理，也預告全球景氣 1~2 季後將全面升溫，可安心提前卡位續抱！',
    sellSignal:
      '台灣小車率先降溫轉弱：當美國股市還在創高，但台灣出口與營收擴散指數卻率先掉頭降溫，代表上游已經感受到砍單庫存壓力，應提前收斂投機部位。',
    neutralWarning:
      '美台週期同步：大卡車與小車同速前進，順著當前製造業波浪方向穩健配置即可。',
  },

  M06_creditCrackRadar: {
    id: 'M06_creditCrackRadar',
    term: '信用裂痕雷達（OAS 高收益債 & CCC 垃圾債利差）',
    enTerm: 'Credit Crack Radar (HY OAS & CCC Spread)',
    category: 'risk',
    metaphor:
      '礦坑裡的「金絲雀警報器」。體質差的公司（高收益債）與最脆弱的爛公司（CCC 垃圾債）去借錢時，銀行因為怕它倒帳，會要求比美國公債多加幾 % 的「風險保護費（利差）」。',
    meaning:
      '監測 FRED 高收益債利差 (BAMLH0A0HYM2) 與最底層 CCC 級利差 (BAMLH0A3HYC)。股市往往後知後覺，但債券市場對「企業缺錢違約」最敏感，是識別系統性崩盤最關鍵的防線。',
    buySignal:
      '信貸流動性充裕 / 恐慌插針後回落：當利差穩定且無底層裂痕時，代表企業資金鏈健康，股市沒有系統性崩盤風險；若在空頭末期利差飆高後開始回落，則是長線大底訊號。',
    sellSignal:
      '早期信貸裂痕浮現 (CCC >= 8.5%)：當整體市場看似歌舞昇平（OAS 極低），但最底層 CCC 垃圾債利差卻率先飆高拉開，代表最脆弱的企業已經快斷氣了！必須立即停止加碼股票，優先還清借貸並拉滿純公債防彈衣。',
    neutralWarning:
      'OAS 極低過熱警戒 (<= 3.5%)：代表市場樂觀到極點、連借錢給爛公司都不收保護費。這不是馬上崩盤的訊號，但提醒你「現在股票已經不便宜了」，切勿在此時開槓桿追高，務必確認防彈衣有穿好。',
  },

  B01_multiHorizonBreadth: {
    id: 'B01_multiHorizonBreadth',
    term: '20 / 60 / 200MA 全市場寬度（扣除殭屍股）',
    enTerm: 'Multi-Horizon Market Breadth (20 / 60 / 200 MA)',
    category: 'sentiment',
    metaphor:
      '台股全市場的「真實健康普查率」（已剔除沒人交易的權證與殭屍股）。不看台積電一人的臉色，而是直接點名全市場 100 檔股票裡，有幾檔真正站在月線 (20MA)、季線 (60MA) 與年線 (200MA) 之上。',
    meaning:
      '衡量多頭氣勢是「百花齊放」還是「拉積盤假象」，並遵循 Zavy「週期情境耦合」法則：必須先看鏡頭一的製造業週期，再解讀寬度高低。',
    buySignal:
      '製造業上行期 + 20MA 寬度 < 20%（鑽石買點）：在大局觀向上的擴張期，當 20MA 寬度殺到 20% 以下（代表全市場超過 8 成股票短線超跌），這是「漣漪震盪」送給你的黃金回檔買點，千萬別砍在阿呆谷，有閒錢應分批低接！',
    sellSignal:
      '20MA 寬度 > 80% 短線過熱：全市場超過 8 成股票都在狂歡大漲、短線乖離過大，隨時容易出現獲利回吐洗盤，此時切忌追高，可將領到的股息轉進防彈衣。',
    neutralWarning:
      '20%~80% 健康巡航區：市場結構均衡，不用理會每天漲跌，照原定比例定期定額或續抱即可。',
  },

  B02_decadeMaInvalidationGate: {
    id: 'B02_decadeMaInvalidationGate',
    term: '十年線鈍化閘門（200MA 超賣失效防線）',
    enTerm: '10-Year MA Invalidation Gate & T10YIE Fallback',
    category: 'risk',
    metaphor:
      '「抄底尺會不會斷掉」的保命安全閥。平時小感冒看體溫計（200MA 年線寬度）就能抓底部；但如果遇到像 2008 金融海嘯那種「跌破十年均線的真正大衰退」，普通的抄底尺會全部失靈（鈍化）！',
    meaning:
      '當大盤跌破十年線且總經進入實質衰退期 (RECESSION)，200MA 寬度即便跌到極低也會長期躺平鈍化，過早抄底會接刀重傷。此時系統會自動鎖死均線抄底訊號，改看宏觀極端落底指標。',
    buySignal:
      '未跌破十年線（常態）：安全閥綠燈，20MA/60MA/200MA 寬度與落底核對表完全有效，可放心用來尋找波浪回檔買點。',
    sellSignal:
      '跌破十年線 / 鈍化閘門啟動：大型空頭結構確立！請立刻收起「跌深就是便宜」的抄底衝動，嚴格保留現金與純公債防彈衣，等待 10 年平衡通膨率 (T10YIE) 與 CCC 垃圾債利差出現「恐慌插針見底」後才准分批進場。',
    neutralWarning:
      '十年線閘門十年才開一次，一旦開啟，活下來、保住本金永遠比抄底更重要。',
  },

  B03_marginDeleveragingRatio: {
    id: 'B03_marginDeleveragingRatio',
    term: '融資去槓桿比率（融資減幅 ÷ 大盤跌幅）',
    enTerm: 'Margin Deleveraging Ratio',
    category: 'sentiment',
    metaphor:
      '檢驗「借錢買股的散戶被嚇跑乾淨了沒」的籌碼清潔度計。如果大盤跌了 10%，借錢融資的人卻只少 4%（比率 0.4），代表大家還在死撐凹單；如果融資大減 12%（比率 1.2 >= 1.0），代表浮額已經徹底洗乾淨了！',
    meaning:
      '計算近 60 日波段修正中，「全市場融資餘額減幅 %」除以「加權指數最大回撤 %」之比值。比率 >= 1.0 代表槓桿清洗充分，是中期修正落底最關鍵的籌碼要件。',
    buySignal:
      '比率 >= 1.0（清洗充分）：融資減幅超過大盤跌幅，不穩定的借貸籌碼已經認賠出場，多殺多斷頭賣壓宣洩完畢，底部支撐極為扎實！',
    sellSignal:
      '大盤重挫但比率 < 0.8（浮額待沉澱）：指數已經大跌，但散戶非但沒退場還在融資攤平接刀，小心後續還有「維持率不足被迫斷頭」的第二波殺盤，先別急著重押抄底。',
    neutralWarning:
      '大盤無明顯回撤時（比率 = 1.0）：多頭平穩爬升期無須去槓桿，維持正常配置即可。',
  },

  B04_bottomingChecklist: {
    id: 'B04_bottomingChecklist',
    term: '中期修正落底核對表（四大落底要件）',
    enTerm: 'Mid-Cycle Correction Bottoming Checklist',
    category: 'signal',
    metaphor:
      '幫你在股災恐慌中戰勝心魔的「機師降落 4 點安全檢查表」。不靠感覺猜底部，而是客觀打勾：散戶洗乾淨了嗎？跌到通道地板了嗎？超過 8 成股票超跌了嗎？壞消息出來跌不下去了嗎？',
    meaning:
      '整合四大落底實證指標：1. 融資去槓桿比率 >= 1.0；2. 大盤觸及季線/年線布林通道下軌 (%B 低檔)；3. 全市場 20MA 寬度 < 20% 極度超賣；4. 恐慌利空鈍化不破底（近 5 日低點不再破近 20 日新低）。',
    buySignal:
      '就緒度 >= 75%（滿足 3~4 項 · 落底確認）：恐慌情緒與籌碼清洗已達極致，這是中期修正千載難逢的黃金佈局區，請勇敢把預留的銀彈分批買進核心資產！',
    sellSignal:
      '就緒度 <= 25%（僅 0~1 項 · 尚未落底）：下跌才剛開始或散戶還在硬撐，切勿因為跌了幾天就急著把現金打光，耐心握緊防彈衣。',
    neutralWarning:
      '就緒度 50%（滿足 2 項 · 底部醞釀中）：黎明前的黑暗正在收斂，此時絕對禁止恐慌殺低砍倉，靜待最後一項確認訊號亮起。',
  },

  T01_dualTrackKnowYourself: {
    id: 'T01_dualTrackKnowYourself',
    term: '「見自己」A / B 雙軌決策模式',
    enTerm: 'Track A (Cycle Tactical) vs. Track B (Slow Wealth Allocation)',
    category: 'view',
    metaphor:
      '投資就像挑衣服，沒有最好的衣服，只有最合身的尺寸（見自己）。「A 軌」像手排車，適合願意看總經路況、換檔加減速的人；「B 軌」像自排定速巡航，設好股債金比例就一路穩穩開到退休終點。',
    meaning:
      'Zavy 雙軌架構：A 軌（市場紀要模式）依製造業週期與個人風險預算動態調節持股水位 (25%~95%)；B 軌（慢富配置模式）固定 60% 股 / 20% 純公債 / 10% 黃金 / 10% 現金，靠偏離度與股息活水自動再平衡。',
    buySignal:
      '選擇適合你性格的軌道：如果你喜歡研究景氣循環、想在榮景末期少跌一點，請看 A 軌；如果你只想專心上班陪伴家人、不想猜高低點，請切到 B 軌並長期堅持。',
    sellSignal:
      '最忌諱「精神分裂式操作」：切忌買進時告訴自己「我是 B 軌長線配置」，結果遇到波浪回檔又嚇到變成「短線追高殺低」。認清自己是誰，才能把路走完。',
    neutralWarning:
      '先決定比例，再決定標的：無論選 A 軌或 B 軌，資產大類的比例永遠比挑哪一檔個股更重要。',
  },

  T02_personalRiskBudget: {
    id: 'T02_personalRiskBudget',
    term: '個人風險預算上限（耐受回撤 ÷ 壓力跌幅）',
    enTerm: 'Personal Risk Budget & Max Equity Exposure',
    category: 'risk',
    metaphor:
      '量測「你的心臟最多能裝多少 % 股票而不崩潰」的安全感計算機。假設大股災股市會跌 30%，而你晚上睡得著覺的極限是總財產縮水 20%，那你最多就只能拿 66.7% (20÷30) 的錢買股票！',
    meaning:
      '以「個人最大可承受帳面回撤 % ÷ 壓力測試跌幅 (預設 30%)」反推個人持股天花板，並與「總經週期建議水位」取最保守的小值（安全交集上限），確保任何股災都不會突破你的心理底線。',
    buySignal:
      '當前實際股票佔比 <= 最終建議上限：你的持股水位完全在景氣順風與個人心臟承受範圍內，晚上可以安心睡好覺，維持紀律續抱！',
    sellSignal:
      '當前實際股票佔比 > 最終建議上限：就算現在景氣再好，你的股票部位也已經超過你心臟能承受的極限了！一旦遇到突發大跌你很容易恐慌砍在最低點，請依四階瀑布流適度減碼至安全上限內。',
    neutralWarning:
      '請誠實點選「可承受回撤比例」，別在多頭時高估自己的膽量。',
  },

  T03_debtAsNegativeBond: {
    id: 'T03_debtAsNegativeBond',
    term: '負債即負向債券（質押借款優先降槓桿）',
    enTerm: 'Pledge Debt as Negative Bond',
    category: 'risk',
    metaphor:
      '純公債是幫你擋子彈的「防彈衣」，而欠銀行或券商的質押借款則是「負向債券（把防彈衣脫掉還綁上炸藥）」。在景氣最好、股票最賺錢的時候，最優雅的防守不是賣光好股票，而是先把借來的錢還掉！',
    meaning:
      '在資產負債表上，借款負債等同於負的固定收益部位。股票質押最大的風險是股災時「維持率跌破 130% 被強制斷頭抬出場（中斷風險）」，徹底喪失把路走完的資格。',
    buySignal:
      '零質押負債 / 維持率極高：沒有斷頭中斷風險，在波浪回檔時擁有 100% 的底氣與時間等待市場反彈。',
    sellSignal:
      '榮景末期或股票超配 + 帳上有質押借款：系統強烈建議啟動「優先還債」！拿現金、股息或調節 Tier 1 波段股的錢優先償還質押本金，消除斷頭引信，同時系統會將已設質的核心股標記「🔒設質鎖定」避免誤砍。',
    neutralWarning:
      '沒有什麼比「把路走完」更重要，永遠不要讓槓桿成為把你踢出牌桌的元兇。',
  },

  T04_fourTierSellWaterfall: {
    id: 'T04_fourTierSellWaterfall',
    term: '四階減碼瀑布流（存量保護 · 減碼優先序）',
    enTerm: '4-Tier Sell Waterfall Protocol',
    category: 'core',
    metaphor:
      '修剪花園的標準SOP：當需要降低股票比例時，一定要先拔掉「雜草與亂衝的藤蔓（Tier 1 投機股/正2反1/套牢凹單股）」，絕對不能把花園裡最珍貴的「百年果樹（Tier 3 高股息母雞、Tier 4 0050/VOO 大盤核心底倉）」給砍了！',
    meaning:
      '將持倉自動分類為四道防線：Tier 1 波段個股與槓桿反向（最優先出清）➔ Tier 2 主題/產業型 ETF（次要調節）➔ Tier 3 高股息 ETF（存量不動）➔ Tier 4 市值型核心寬基 ETF（最後防線）。',
    buySignal:
      'Tier 3 高股息 & Tier 4 核心底倉：這兩區是你的退休護城河，平時只進不出、長線複利滾存，享受市場長期向上的果實。',
    sellSignal:
      '需要調降股票水位時：請嚴格從 Tier 1（紅框）與 Tier 2（黃框）開始獲利了結或停損換現金，徹底改掉散戶「賣掉賺錢的 0050、留著賠錢的投機股凹單」的致命壞習慣！',
    neutralWarning:
      '凡標註「🔒[設質鎖定]」之標的因綁定質押擔保品，應優先償還借款解質，避免直接賣出引發維持率波動。',
  },

  T05_trueDefensiveArmor: {
    id: 'T05_trueDefensiveArmor',
    term: '純避險防彈衣 vs. 假防彈衣（公司債/高股息盲區）',
    enTerm: 'True Defensive Armor (Gov Bonds & Gold) vs. Risk Assets',
    category: 'valuation',
    metaphor:
      '上戰場穿的「真防彈衣」只有「純美國政府公債 (00679B/00687B/TLT)、短債與黃金 (00635U/GLD)」。很多人以為公司債 (00720B/00937B) 或高股息 ETF 也是防彈衣，其實它們只是「比較厚的外套」，真遇到大股災子彈飛來時，會跟著股票一起中彈下跌！',
    meaning:
      '投資級公司債與金融債帶有「信用利差風險」，在系統性股災時利差擴大會抵銷降息利多，與股市呈現正相關同跌；唯有零違約風險的純政府公債與黃金，才具備股災逆勢抗跌的負相關保護力。',
    buySignal:
      'B 軌防禦配置（20% 純公債 + 10% 黃金 + 10% 現金）：真正的全天候防彈衣！平時幫你收息抗通膨，股災大跌時逆勢上漲，變成你逢低加碼便宜股票的超級銀彈庫。',
    sellSignal:
      '誤把公司債、mREITs (00712) 或正2反1當成防禦資產：系統會自動將公司債分離標示，並將槓桿型與抵押權型 mREITs 列入剔除警告池，請逐步轉換為純政府公債。',
    neutralWarning:
      '買進公債或黃金 ETF 前，若溢價率 > 1.0% 代表買貴了，應優先選擇同類型平價替代標的（如 00679B 溢價時改買 00687B 或 00795B）。',
  },

  T06_dividendRedirectRebalance: {
    id: 'T06_dividendRedirectRebalance',
    term: '股息活水轉向再平衡（存量不動 · 增量轉向）',
    enTerm: 'Dividend-Redirect Rebalancing',
    category: 'core',
    metaphor:
      '不用賣股票就能完成資產配置的「無痛導流魔法」。你手上的高股息母雞一股都不用賣（存量不動，省下交易稅與手續費）；只要把母雞每年剛生下來的「金雞蛋（現金股息）」，改拿去買還不夠的公債與黃金防彈衣（增量轉向）！',
    meaning:
      '針對台灣投資人偏好領息的特性，利用每年新流入的現金股息（Inflow），精準計算並導流買入目前低配（Underweight）的純公債與黃金，實現零賣出摩擦成本的動態再平衡。',
    buySignal:
      '領到股息發放日：打開 B 軌查看「股息活水轉向建議」，照著系統算出的比例與金額，把新鮮股息買進低配的純公債 (00687B) 與黃金 (00635U)，不知不覺就穿好防彈衣！',
    sellSignal:
      '切忌在股票已經超配時，還無腦把股息繼續投入股票：這會讓你的船頭越來越重，一旦遇到大風浪將毫無緩衝保護。',
    neutralWarning:
      '既保留了讓你安心的收息股數，又補足了抗跌的防彈衣，這就是最符合人性的慢富之道。',
  },

  T07_fire30xAndCoastFire: {
    id: 'T07_fire30xAndCoastFire',
    term: '慢富 30x 退休本金與 Coast-FIRE（滑行退休門檻）',
    enTerm: '30x Annual Expense Target & Coast-FIRE Threshold',
    category: 'forecast',
    metaphor:
      '「30x 本金」是你終點站要存到的退休金水庫（年開銷的 30 倍，每年只領 3.3% 永遠花不完）；而「Coast-FIRE（滑行退休）」則是腳踏車爬到山頂的那一刻——跨過這條線後，就算你從此不再踩踏板（不再多存錢），光靠下坡慣性（時間複利），到退休那年水庫也會自動集滿！',
    meaning:
      '以 30 倍年支出為終極安全目標，並依你距離預計退休年齡的剩餘年數與實質年化報酬率 (5%) 折現回今日，算出今日的「Coast-FIRE 提早滾存門檻」。',
    buySignal:
      'Coast-FIRE 顯示「已達標」：恭喜你！你已經贏得人生最重要的財務選擇權。現在起你不再需要為了退休金拼命加班省錢，只要守住 B 軌配置、不開危險槓桿、不犯大錯，時間會自動幫你把路走完！',
    sellSignal:
      '達成率尚低且急於賭一把暴富：離目標還遠時，最怕去買妖股或開大槓桿想彎道超車，結果反而翻車歸零。專注本業現金流投入，慢就是快。',
    neutralWarning:
      '看著進度條一步步靠近滑行門檻，每存下一筆錢、每領一次股息，都在幫未來的自己贖回自由時間。',
  },

  T08_sequenceOfReturnsRisk: {
    id: 'T08_sequenceOfReturnsRisk',
    term: '報酬順序風險 (SRR) 與前 10 年破產率對比',
    enTerm: 'Sequence of Returns Risk (SRR) Shield Simulation',
    category: 'risk',
    metaphor:
      '退休族最怕的「剛退休就遇到大股災」詛咒。如果退休前 10 年遇到大崩盤，100% 滿手股票的人為了吃飯，被迫在股價打 5 折時賤賣兩倍的股票，結果本金提早被掏空，後面股市漲再多也跟自己無關了！',
    meaning:
      '透過 1,000 次蒙地卡羅隨機路徑模擬，對比「100% 純股票組合」與「60/20/10/10 股債金防彈衣組合」在退休提領前 10 年遭遇連續空頭導致資產耗盡（破產）的機率差額 (`srrRiskReductionPercent`)。',
    buySignal:
      '穿上股債金防彈衣（前 10 年破產率大幅降低）：防彈衣的真正價值不是為了平時多賺幾 %，而是當退休初期遇到股災時，你可以先賣逆勢上漲的公債與黃金過日子，一股便宜的股票都不用賤賣，徹底消滅順序風險！',
    sellSignal:
      '資產規模已大或接近退休，卻仍 100% 單押股票：一旦在退休前夕或剛退休時撞上週期衰退，將面臨極高的報酬順序傷害，務必透過股息活水逐步建立 20% 公債 + 10% 黃金護城河。',
    neutralWarning:
      '理財不是比誰在多頭賺得最快，而是比誰在經歷兩三次景氣循環後，還能穩穩留在場上把路走完。',
  },
};

