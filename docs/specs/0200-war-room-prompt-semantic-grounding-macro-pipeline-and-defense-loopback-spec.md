# 規格書 0200：戰情室外聯提示詞語意防護、宏觀資券管線穿透與實戰決策閉環規範 (Spec 0200)

## 1. 摘要與目標 (Executive Summary & Objectives)

本規格書旨在針對「主力戰情室 AI 一鍵複製」外聯提示詞輸出給外部 AI 時所面臨的**資料缺損（N/A 天窗）**、**外部 AI 算術與語意質疑（對帳錯誤、PE 矛盾）**、**真實持倉成本假脫敏洩漏**，以及**決策單向斷鏈無法回流**等系統級盲點進行全方位根治，建立從戰情室到外部 AI 再回流戰情室的「端到端閉環作業系統」。

核心目標：
1. **消除外部 AI 語意歧義與對帳報警**：將 Prompt 中容易被 LLM 誤判的縮寫（如 `20d` 誤讀為 20 號單日）改為顯式語意標籤（`cumulative period="20D"`），並對官方 PE 標註 `TTM` 滾動四季計算口徑，徹底杜絕外部模型將單季 EPS 與年化本益比混淆引發的算術質疑。
2. **根治真實成本洩漏（真脫敏安全護欄）**：修復 `pre_calculated_pivots` 在 `desensitized: true` 時仍強制輸出精確買進成本的漏洞，嚴格改採百分比相對階梯，杜絕機密持倉成本外洩。
3. **貫通宏觀環境數據與資券回溯（消滅 100% N/A）**：
   - 在 Vite 中介層 `/api/market/history/:symbol` 順帶回傳本機 SQLite 已庫存之最新 1 筆宏觀數據（美債 10 年期殖利率、Put/Call Ratio、VIX 等）。
   - 實作資券有效值向後回溯（Rolling Forward Fallback），解決 15:00~21:00 盤後時差導致最新一日資券為 `NULL` 的天窗問題。
4. **注入週期股實戰防線與極限情境**：將 60 日極值改名為波動區間（避免誤判為短線箱體），並注入台股 10% 跌停鎖死無流動性預警與外聯查核邊界契約。
5. **Prompt 純淨瘦身與免費額度約束**：自動修剪未使用的空節點與無效 N/A 標籤，壓縮 30% 以上無謂 Token 消耗。
6. **建立雙向決策回流協議 (Loopback Protocol)**：
   - 在 Master Prompt 末尾強制注入標準 JSON 輸出規範（含 `aiModel`、`stopLoss`、`takeProfit`、`trendReversal`、`validityDays`）。
   - 前端實作「防呆正則秒抓貼上器」，即使貼入數千字長文亦能秒級抽取，並具備髒數字清洗（提純 `元`、`$` 等非數字字元）。
7. **戰情室策略釘選與模型血統勝率追蹤 (Strategy Pin & Provenance)**：
   - 於戰情室提供輕量 LocalStorage 策略釘選器，支援盤中觸價警報（跌破停損／突破翻多）與防疲勞一鍵確認機制。
   - 保留最近 20 筆歷史戰績，自動判定達標或停損，建立外部 AI 智囊團模型勝率榜。

---

## 2. 第一性原理架構與問題診斷 (Root Cause & First Principles)

### 2.1 外部 AI 語意誤讀與對帳破綻
- **機制**：自然語言模型（LLM）依據上下文機率預測，在中文語境中，`<foreign_net_shares_20d>68801</foreign_net_shares_20d>` 極易被解讀為「10 月 20 日外資買超 68,801 張」。外部模型將其與當日投信及三大法人合計相加，發現「外資 + 投信 ≠ 合計」，即誤判為造假或數據錯誤。
- **解法**：強制使用自解釋標籤 `<foreign_net_shares_cumulative period="20_TRADING_DAYS" unit="張">`，並在註解宣告累計週期，零成本消滅歧義。

### 2.2 偽脫敏安全漏洞 (Security Illusion)
- **機制**：前端在 `investor_context` 雖然尊重了 `desensitized` 開關，但前端確定性算術防線 `buildPrecalculatedPivotsXml` 卻無條件輸出 `<exact_cost_basis>${costBasis}</exact_cost_basis>`，導致外部 AI 仍能精準獲知使用者成本價（如 158.21 元）。
- **解法**：在脫敏模式下，不輸出具體成本數值，僅輸出 `成本基準線 (100.0%)` 與 `未實現報酬率百分比 (+0.82%)`，停損價改以 `成本 -3%` 及相應偏離度呈現。

### 2.3 盤後非同步結算與宏觀 API 孤島
- **機制**：台股三大法人約 15:00 出爐，融資融券 21:00 證交所才完成彙整。因此在傍晚時段，最新一筆籌碼列的 `margin_balance` 常為 `null`，前端只抓最後一筆便導致資券 N/A。此外，SQLite 庫雖有 `macro_sentiment_daily` 表，但個股 API 未曾回傳。
- **解法**：
  1. 中介層順帶回傳 `macro: latestMacroRow`。
  2. 前端籌碼載入時，遇 `null` 自動向前回退至最近一日非 `null` 之有效資券，並附註結算日。

### 2.4 財務指標口徑未對齊
- **機制**：證交所官方每日本益比（PE）是以「近四季滾動累計 EPS (TTM)」計算（華邦電 159.5 / 16.81 ≈ 9.49 元）；但戰情室單季獲利卡給出的是單季（2026 Q2 EPS 5.4 元）。外部 AI 缺乏口徑說明，誤以為單季 5.4 與隱含 9.49 互相矛盾。
- **解法**：在 PE 標籤加上 `calculation_basis="TRAILING_TWELVE_MONTHS_TTM"`，單季 EPS 加上 `period="SINGLE_QUARTER"`，消除算術誤解。

### 2.5 決策單向斷鏈與模型溯源真空
- **機制**：外部 AI 分析長文給出的關鍵作戰點位（停損線、翻多線）無法回流戰情室，使用者必須手動記錄或靠記憶；且無法追蹤到底哪一家 AI（ChatGPT、Claude、Gemini）的建議勝率最高。
- **解法**：建立標準 JSON 回流代碼塊規範，前端一鍵貼上解析，LocalStorage 沉澱並自動比對盤中即時行情，建立 20 筆歷史勝率看板。

---

## 3. 系統架構與變更清單 (System Architecture & Modifications)

### 3.1 檔案變更矩陣

| 檔案路徑 | 變更性質 | 變更職責說明 |
| :--- | :--- | :--- |
| `scripts/market-sync/vite-market-middleware.cjs` | 增強 | `/api/market/history/:symbol` 順帶查詢並附掛最新 1 筆 `macro` 宏觀指標回傳 |
| `src/engine/marketCacheLoader.ts` | 增強 | 映射 `macro` 數據；實作資券餘額向後回溯尋找非 `null` 最新有效交易日之演算法 |
| `src/types/aiForceDashboard.ts` | 擴充 | `AiForceDashboardReport` 與 `MarketSentimentData` 補齊 `macroData` 欄位型別；定義 `WarRoomStrategyPin` 與 `StrategyPinHistoryItem` |
| `src/engine/aiForcePromptAdapter.ts` | 核心增強 | 注入宏觀資料、有效資券；標籤語義化；注入跌停價、外聯查核契約與回流 JSON 協議指令 |
| `src/engine/strategicPromptEngine.ts` | 核心增強 | 修復確定性防線假脫敏洩漏；PE 補齊 TTM 宣告；實作 Prompt 空節點純淨修剪（瘦身 30%） |
| `src/engine/strategyPinEngine.ts` | 新增核心 | 封裝正則代碼塊抽取、數字字串清洗、勝率判定與 LocalStorage 存取純邏輯（利於 100% 單元測試） |
| `src/components/aiForceDashboard/WarRoomPromptCard.tsx` | 視覺與操作增強 | 底部整合「一鍵貼入外部 AI 裁決」按鈕、釘選策略卡片、歷史勝率榜與防疲勞一鍵確認機制 |

---

## 4. 模組規格與詳細邏輯 (Module Specifications)

### 4.1 提示詞語意重構、防偽脫敏與回流指令 (Prompt Grounding & Loopback Directive)

#### 4.1.1 累計籌碼標籤顯式化
```xml
<!-- 替換原有 20d 縮寫，杜絕 LLM 將 20d 誤判為 20 號單日 -->
<foreign_net_shares_cumulative period="LAST_20_TRADING_DAYS" unit="張">${chips.foreignNetShares20D}</foreign_net_shares_cumulative>
<trust_net_shares_cumulative period="LAST_20_TRADING_DAYS" unit="張">${chips.trustNetShares20D}</trust_net_shares_cumulative>
<total_institutional_net_cumulative period="LAST_20_TRADING_DAYS" unit="張">${chips.totalNetShares20D}</total_institutional_net_cumulative>
```

#### 4.1.2 確定性算術防線真脫敏
```ts
// strategicPromptEngine.ts
if (isInPosition) {
  if (options.desensitized) {
    // 脫敏模式：嚴格隱蔽絕對價格，改以相對比率與偏離度防線表達，杜絕成本洩漏
    lines.push(
      '  <pre_calculated_pivots mode="HOLDING_DEFENSE_DESENSITIZED">',
      '    <cost_basis_reference>成本基準線 (100.0%)</cost_basis_reference>',
      `    <unrealized_pnl_percent>${portfolio?.unrealizedPnLPercent ?? 0}%</unrealized_pnl_percent>`,
      '    <stop_loss_conservative_line>成本 -3.0% 保命防守線</stop_loss_conservative_line>',
      '    <stop_loss_defensive_line>成本 -5.0% 第二防禦線</stop_loss_defensive_line>',
      '  </pre_calculated_pivots>'
    );
  } else {
    // 明細模式：輸出精確數值
    ...
  }
}
```

#### 4.1.3 回流 JSON 協議指令 (Loopback Protocol Directive)
在 Master Prompt 最底部強制附帶：
```xml
<loopback_protocol_directive>
  【強制輸出規範】：
  請在分析長文最末尾，單獨輸出一個標準 JSON 代碼區塊（\`\`\`json ... \`\`\`），嚴禁在代碼塊內添加任何 markdown 註解，格式如下：
  ```json
  {
    "symbol": "${quote.symbol}",
    "aiModel": "填入當前模型名稱 (如 Claude 3.5 Sonnet / ChatGPT-4o / Gemini 1.5 Pro)",
    "verdict": "一句話核心裁決 (如 有條件持倉防守/暫不加碼)",
    "stopLoss": 153.46,
    "takeProfit": 167.70,
    "trendReversal": 170.71,
    "validityDays": 5
  }
  ```
</loopback_protocol_directive>
```

---

### 4.2 宏觀數據中介層回傳與資券回溯演算法

#### 4.2.1 中介層附掛宏觀數據
在 `scripts/market-sync/vite-market-middleware.cjs`：
```js
let macroRow = null;
try {
  macroRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
} catch {}

return res.end(
  JSON.stringify({
    symbol,
    meta: meta || null,
    candles,
    chips: chipsMap,
    tdcc: tdccRows,
    revenue: revenueRows,
    valuation: valRow ? { ...valRow, history: valHistory } : null,
    macro: macroRow, // 順路帶回最新宏觀指標
  })
);
```

#### 4.2.2 資券有效值向前回退 (Rolling Forward)
在 `src/engine/marketCacheLoader.ts`：
```ts
// 若當日資券為 null，向前尋找最近一個非 null 的有效資券交易日
const validMarginRow = institutionalRecords
  ? [...institutionalRecords].reverse().find((r) => r.marginBalance != null)
  : undefined;

return {
  candles,
  institutionalRecords,
  marginBalance: validMarginRow?.marginBalance,
  shortBalance: validMarginRow?.shortBalance,
  dayTradeRate: validMarginRow?.dayTradeRate,
  marginAsOfDate: validMarginRow?.date, // 標記資券實際結算日
  tdccRecords,
  revenueRecords,
  valuation,
  macro: data.macro,
};
```

---

### 4.3 戰情室策略釘選與勝率追蹤引擎 (`src/engine/strategyPinEngine.ts`)

#### 4.3.1 純邏輯解析與數字清洗
```ts
export interface WarRoomStrategyPin {
  symbol: string;
  aiModel: string;
  verdict: string;
  stopLoss: number;
  takeProfit?: number;
  trendReversal?: number;
  validityDays: number;
  createdAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TRIGGERED_STOP' | 'TRIGGERED_PROFIT';
  dismissedAlertToday?: boolean;
}

export function sanitizePriceNumber(val: any): number | undefined {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return undefined;
  const match = String(val).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : undefined;
}

export function parseLoopbackContent(rawText: string, currentSymbol: string): WarRoomStrategyPin | null {
  if (!rawText) return null;
  // 支援整篇 Markdown 文章容錯抽取 JSON
  const jsonMatch = rawText.match(/\{[\s\S]*"aiModel"[\s\S]*"stopLoss"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const data = JSON.parse(jsonMatch[0]);
    const stopLoss = sanitizePriceNumber(data.stopLoss);
    if (!stopLoss || stopLoss <= 0) return null;

    return {
      symbol: (data.symbol || currentSymbol).toUpperCase(),
      aiModel: String(data.aiModel || '外部 AI').trim(),
      verdict: String(data.verdict || 'AI 策略建議').trim(),
      stopLoss,
      takeProfit: sanitizePriceNumber(data.takeProfit),
      trendReversal: sanitizePriceNumber(data.trendReversal),
      validityDays: Number(data.validityDays) || 5,
      createdAt: Date.now(),
      status: 'ACTIVE',
    };
  } catch {
    return null;
  }
}
```

#### 4.3.2 盤中即時狀態檢測
```ts
export function evaluatePinStatus(
  pin: WarRoomStrategyPin,
  currentPrice: number
): { isStopLossTriggered: boolean; isTrendReversalTriggered: boolean; isExpired: boolean } {
  const now = Date.now();
  const elapsedDays = (now - pin.createdAt) / (1000 * 60 * 60 * 24);
  const isExpired = elapsedDays > (pin.validityDays || 5);

  const isStopLossTriggered = !isExpired && currentPrice > 0 && currentPrice <= pin.stopLoss;
  const isTrendReversalTriggered =
    !isExpired && currentPrice > 0 && pin.trendReversal !== undefined && currentPrice >= pin.trendReversal;

  return { isStopLossTriggered, isTrendReversalTriggered, isExpired };
}
```

---

## 5. 測試驗收條件 (Acceptance Criteria & Test Seams)

1. **單元測試 (TDD 100% 綠燈)**：
   - `strategicPromptEngine.test.ts`：
     - 驗證 `desensitized: true` 時，輸出內容絕不包含任何具體 `avgCost` 數值。
     - 驗證 `<foreign_net_shares_cumulative>` 標籤正確生成，不再輸出 `_20d`。
     - 驗證包含 `<loopback_protocol_directive>` JSON 協議說明。
     - 驗證未賦值之 N/A 節點被純淨修剪，Prompt Token 顯著減少。
   - `marketCacheLoader.test.ts`：
     - 驗證當最新一日籌碼資券為 `null` 時，能正確回溯至前一非 `null` 日期之資券數值與 `marginAsOfDate`。
     - 驗證 API 回傳之 `macro` 正確被映射至回傳物件。
   - `strategyPinEngine.test.ts`：
     - 驗證從純 JSON 字串與夾帶數千字 Markdown 的長文中，均能 100% 正確抽取 `WarRoomStrategyPin`。
     - 驗證 `153.46元`、`$167.7` 等髒字元能被清洗提純為浮點數。
     - 驗證過期天數與盤中觸價邏輯（停損/翻多/過期判定）。
2. **整合與 E2E 測試驗收**：
   - 模擬華邦電 2344 生成 Prompt，比對輸出文字，確認無 20d 歧義標籤、具備 TTM 說明、具備跌停警示，且資券與宏觀數據完整填滿。
   - 模擬貼入外部 AI（如 Claude 3.5 Sonnet）之 JSON，驗證戰情室卡片能即刻釘選並渲染策略標籤。
3. **編譯安全**：
   - 執行 `npm test` 通過率 100%，`npm run build` TypeScript 0 錯誤。
