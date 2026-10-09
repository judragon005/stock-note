/**
 * 個股 7 步深度投研決策閉環引擎與提示詞工廠 (Spec 0156 / Ticket 09 ~ 15)
 */

import { MarketType } from '../types/stock';
import { EquityDeepDiveInput, EquityDeepDiveReport } from '../types/equityDeepDive';
import { assembleAllDeepDiveData } from './equityDeepDiveAssembler';

/**
 * Ticket 09: 步驟 1 商業模式 Prompt 產生器
 */
export function buildStep1BusinessModelPrompt(symbol: string, name: string, _market?: MarketType): string {
  return `### 【第 1 步】商業模式拆解 (${name} - ${symbol})
請用約 500 字白話說明 ${name} (${symbol}) 的業務核心，回答以下關鍵問題：
1. 公司靠什麼賺錢？核心產品或服務項目為何？營收佔比結構？
2. 主要客戶是誰？客戶集中度如何？
3. 處於產業鏈的哪個位置（上游原料/中游製造/下游品牌銷售）？定價權高低？
4. 它的核心護城河（技術專利/規模優勢/轉換成本/網路效應）是什麼？
目標：釐清這檔股票是否在個人的能力圈邊界之內。`;
}

/**
 * Ticket 10: 步驟 2 財報魔鬼細節 Prompt 產生器
 */
export function buildStep2FinancialForensicPrompt(input: EquityDeepDiveInput): string {
  const { symbol, name, quote } = input;
  const peText = quote?.pe ? `${quote.pe} 倍` : 'N/A';
  const pbText = quote?.pb ? `${quote.pb} 倍` : 'N/A';
  const yieldText = quote?.dividendYield ? `${quote.dividendYield}%` : 'N/A';

  return `### 【第 2 步】財報魔鬼細節檢驗 (${name} - ${symbol})
當前參考指標：本益比 ${peText} | 股價淨值比 ${pbText} | 殖利率 ${yieldText}。
請檢驗該公司最新季度財報，找出是否存在以下 3 大背離異常點（防禦地雷）：
1. 營收成長 vs. 自由現金流背離：是否存在「營收頻創新高，但自由現金流與營業活動現金流卻為負或急劇萎縮」之虛胖跡象？
2. 應收帳款與存貨周轉天數：是否較去年同期顯著拉長？是否有塞貨或滯銷庫存跌價風險？
3. 毛利率與營益率趨勢：近四季走勢是否平穩？營業利益率是否遭同業價格戰大幅侵蝕？`;
}

/**
 * Ticket 11: 步驟 3 同業對照 Prompt 產生器
 */
export function buildStep3PeerComparisonPrompt(symbol: string, name: string, _market?: MarketType): string {
  return `### 【第 3 步】同業對照與相對估值 (${name} - ${symbol})
請列出 2 檔競爭對手（與 ${name} (${symbol}) 業務最為直接競爭的同業標的），並橫向對比：
1. 毛利率與營業利益率：誰的獲利品質與附加價值更高？
2. 預估本益比 (Forward PE) 與股價淨值比 (PB)：目前市場給予的估值倍數是否合理？
3. 現金殖利率與資本支出彈性：誰更有長期抗風險底氣？
目標：破除單看絕對價格高低之偏誤，釐清溢價或折價的根本原因。`;
}

/**
 * Ticket 12: 步驟 4 市場沒說的事 Prompt 產生器
 */
export function buildStep4LatentRisksPrompt(input: EquityDeepDiveInput): string {
  const { symbol, name, market, statusTag = 'NORMAL' } = input;
  let statusWarning = '';
  if (statusTag === 'DISPOSITION') {
    statusWarning = `⚠️ 【重大警示】此標的當前正處於「證交所處置股票（分盤撮合）」期間，流動性凍結且交易摩擦高，請預留額外滑價空間，並重點評估流動性折價與停損執行風險！\n`;
  } else if (statusTag === 'ATTENTION') {
    statusWarning = `⚠️ 【短線警示】此標的當前被列為「注意股票」，近期周轉率或振幅過熱，需嚴防主力倒貨追高套牢！\n`;
  }

  const marketSpecific =
    market === 'US'
      ? '美股市場特有風險：請評估 Beta 波動率、盤後流動性、空頭比例 (Short Interest) 與潛在監管調查。'
      : '台股市場特有風險：請評估外資借券賣出、大客戶砍單、匯率貶值對毛利之敏感度。';

  return `### 【第 4 步】市場沒說的事（未定價潛在黑天鵝）(${name} - ${symbol})
${statusWarning}請從以下維度剖析市場主流共識下尚未定價的下行風險：
1. 客戶與供應鏈集中度：單一客戶營收佔比是否過高？
2. 政策與地緣政治：是否有反壟斷、貿易關稅或補貼退坡威脅？
3. 匯率與原物料：美元/台幣波動對其淨利的真實衝擊幅度？
4. ${marketSpecific}`;
}

/**
 * Ticket 13: 步驟 5 未來一年情境推演 Prompt 產生器
 */
export function buildStep5ScenarioSimulationPrompt(input: EquityDeepDiveInput): string {
  const { symbol, name, candles = [], quote, market } = input;
  const currentPrice = quote?.price ?? (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const currency = market === 'US' ? 'USD' : 'TWD';

  return `### 【第 5 步】未來一年情境推演 (${name} - ${symbol})
當前市價定錨基準：${currentPrice} ${currency}。
請建立未來一年樂觀、中性、悲觀 3 套動態劇本，並推演具體目標價區間：
1. 樂觀情境 (Bull Case)：新產品/新訂單超預期爆發，預估營收成長率、毛利率、EPS 與合理目標價上限。
2. 中性基準 (Base Case)：維持目前市場成長預期，對應之合理估值價位區間。
3. 悲觀防守 (Bear Case)：若景氣衰退或大客戶砍單，下檔主要獲利估算與防守支撐底線。
請明確給出價位區間數字，拒絕模稜兩可。`;
}

/**
 * Ticket 14: 步驟 6 籌碼微觀解讀 Prompt 產生器
 */
export function buildStep6ChipsAnalysisPrompt(input: EquityDeepDiveInput): string {
  const { symbol, name, market, institutionalRecords = [], boxFloorPrice, boxCeilingPrice } = input;

  if (market === 'US') {
    return `### 【第 6 步】籌碼微觀解讀 (${name} - ${symbol})
美股籌碼以量能分佈與價格動能代理：
1. 檢視近 20 日成交量能變化與換手率（是否有巨量長黑或爆量洗盤）。
2. 對照當前市價與 20 日 / 60 日均線位置，研判量價配合強度。
3. 研判目前處於機構吸籌、拉抬、出貨派發還是籌碼沉澱整理階段。`;
  }

  let totalNet = 0;
  for (const r of institutionalRecords) {
    totalNet += (r.foreignShares || 0) + (r.trustShares || 0) + (r.dealerShares || 0);
  }

  const boxInfo =
    boxFloorPrice && boxCeilingPrice
      ? `關鍵支撐與突破防線：近 60 日箱底防線 ${boxFloorPrice} 元，箱頂防線 ${boxCeilingPrice} 元。`
      : '關鍵支撐與突破防線：需留意近期平台整理區間下緣。';

  return `### 【第 6 步】籌碼微觀解讀 (${name} - ${symbol})
本地湖倉近 20 日三大法人累計淨買賣超：約 ${totalNet} 張。
${boxInfo}
請根據上述真實籌碼與技術價位，分析：
1. 外資、投信近期是同向買超吃貨、還是土洋對作或主力倒貨結帳？
2. 融資餘額與散戶動向：是否有融資高檔多殺多風險？
3. 外資借券賣出 (SBL) 與券資比動態：外資現貨買超背後是否同步大幅借券放空？融券與借券餘額是否有軋空或避險鎖單？
4. 綜合研判當前處於主力吃貨吸籌、壓盤洗盤、突破推升、還是拉高出貨？`;
}

/**
 * Ticket 15: 步驟 7 投資筆記結構範本 (券商法人級擴充 Spec 0173)
 */
export function buildStep7InvestmentMemoTemplate(symbol: string, name: string): string {
  return `### 【第 7 步】投資筆記（200 字極簡交易卡）(${name} - ${symbol})
請產出簡練嚴謹之交易決策卡：
- **買進核心理由**：以一句話說明最強催化劑（如：同業競爭力強大、估值具安全邊際、主力剛突破箱頂）。
- **目標價區間**：未來 6~12 個月合理獲利了結價位。
- **停損價底線**：跌破即無條件出場之紀律價位（如：跌破關鍵箱底或虧損達 8%）。
- **核心論點失效條件（證偽開關 Kill-Switch）**：若發生何種基本面或產業逆風，原始進場假設即被證偽，必須無條件立即清倉（如：大客戶轉單、毛利連續兩季低於 30%）。
- **預計持有週期**：短線波段 (1~3 週) / 中期波段 (1~3 個月) / 長期投資 (半年以上)。
- **3 個追蹤觀察指標**：次月營收年增率、外資累計買超連續性、毛利率是否維持高檔。`;
}

/**
 * Ticket 15: 7 步全量 Prompt 聚合產生器
 */
export function generateFull7StepsPromptPayload(input: EquityDeepDiveInput): EquityDeepDiveReport {
  const assembled = assembleAllDeepDiveData(input);
  const { symbol, name, market } = input;

  const step1 = buildStep1BusinessModelPrompt(symbol, name, market);
  const step2 = buildStep2FinancialForensicPrompt(input);
  const step3 = buildStep3PeerComparisonPrompt(symbol, name, market);
  const step4 = buildStep4LatentRisksPrompt(input);
  const step5 = buildStep5ScenarioSimulationPrompt(input);
  const step6 = buildStep6ChipsAnalysisPrompt(input);
  const step7 = buildStep7InvestmentMemoTemplate(symbol, name);

  const fullPayloadPrompt = `# 🎯 ${name} (${symbol}) 全市場個股 7 步深度投研決策閉環報告需求
你是一位擁有 20 年實戰經驗的機構級買方資深研究員與資產配置總監。請依據以下 7 步結構化框架，對 ${name} (${symbol}) 進行深度剖析與全方位投研，語言務求精準、客觀、具備第一性原理與實戰可執行性：

---
${step1}

---
${step2}

---
${step3}

---
${step4}

---
${step5}

---
${step6}

---
${step7}
`;

  return {
    symbol,
    name,
    market,
    generatedAt: Date.now(),
    step1Prompt: step1,
    step2Prompt: step2,
    step3Prompt: step3,
    step4Prompt: step4,
    step5Prompt: step5,
    step6Prompt: step6,
    step7MemoTemplate: step7,
    fullPayloadPrompt,
    assembledData: assembled,
  };
}
