# Spec 0150: 未收盤標的前日收盤數據定錨與雙層警示機制 (Pending Market Close Pre-Close Anchor & Alert Spec)

## Problem Statement

當使用者在開盤時段、盤中交易進行中、或盤後籌碼尚未完全結算之時點（例如台股 15:00 前、美股台灣時間 08:00 前）進入「AI 主力決策與量化分析儀」時，目前的系統直接擷取當日不完整之盤中即時報價或未結算日 K 作為當前數據。

這導致以下核心痛點：
1. **量化模型與籌碼指標失真**：三大法人籌碼、融資券買賣、主力成本（VWAP）與多維度評分皆依賴「盤後完整結算數據」。盤中即時量能與價格若混入歷史指標，會導致 AI 決策核心（卡片 02）、籌碼分佈（卡片 08）與健康度產生誤導性結論。
2. **語意混淆與誤導**：頂部行情列常駐顯示「今日收盤價」，但在盤中時根本尚未收盤，使用者無法快速辨識當前呈現的是「盤中不完整數據」還是「昨收確定數據」。
3. **缺乏防禦性警示**：系統未明確告知使用者「當前處於盤中或結算中，模型已安全降級至前一收盤日」，降低決策透明度。

## Solution

建立嚴格的「市場結算狀態引擎 (Market Settlement Engine)」，在未達到正式收盤與盤後數據結算時點前，強制採取以下行為：
1. **核心分析回退定錨 (Data Anchor Fallback)**：所有 18 項量化指標（K線圖、均線、多維度雷達、VWAP、三大法人歷史動態、AI 多空能量）一律以「前一個已收盤交易日之完整資料」為運算基準。
2. **雙層視覺警示體系 (Dual-Layer Alert System)**：
   - **頂部行情列 (HeaderMarketBar)**：將「今日收盤價」改為「前日收盤價」，並在「最新交易日」旁標註橘黃色警示徽章 `[⚠️ 盤中未結算·以 YYYY-MM-DD 為準]`；若即時行情可用，同步保留顯示 `[盤中即時參考: 價格 (漲跌幅)]`。
   - **AI 決策核心 (Card 02)**：在決策核心頂部出示顯著警示 Banner，明確說明：「當前標的尚未收盤結算，為確保主力籌碼與 AI 模型之嚴謹性，本分析以 YYYY-MM-DD 完整收盤數據為準。」

## User Stories

1. As an active trader, I want the system to recognize when the market has not closed or settled yet, so that I don't get misled by incomplete intraday data.
2. As a Taiwan stock investor, I want the system to treat the market as pending settlement before 15:00, so that institutional chip data (foreign, investment trust, dealer) is not prematurely calculated.
3. As a US stock investor, I want the system to treat US markets as pending settlement before 08:00 Taiwan time, so that the post-market closing numbers and indicators are completely aligned.
4. As a quantitative user, I want all technical indicators, VWAP, and radar scores to be computed strictly on the previous fully settled trading day, so that mathematical models maintain historical integrity.
5. As an interface user, I want to see the label changed from "今日收盤價" to "前日收盤價 (未收盤)", so that I know at a glance that the market is still trading or settling.
6. As an interface user, I want to see an eye-catching warning badge indicating that the report is anchored on the previous close date, so that there is no ambiguity.
7. As a day trader, I still want to see the latest intraday real-time quote displayed as a secondary reference alongside the previous close, so that I can observe immediate market momentum without breaking the quant model.
8. As a risk-averse investor, I want the AI Decision Core (Card 02) to display an explicit warning banner explaining that the analysis is based on yesterday's close, so that I can calibrate my trading actions accordingly.
9. As an auditor, I want the market settlement detection logic to be deterministic and timezone-aware (Asia/Taipei), so that weekend rollovers and statutory holidays are gracefully handled.
10. As a developer, I want pure function test seams with mockable timestamps, so that tests can verify 11:00 am, 14:00 pm, 15:00 pm, weekend, and US market transitions with 100% test coverage.

## Implementation Decisions

1. **獨立純函式結算狀態引擎 (`marketSettlementEngine`)**
   - 建立獨立模組，接受 `MarketType` 與可注入的 `referenceDate: Date = new Date()`。
   - **台股 (TW) 規則**：
     - 週六、週日全天：`isSettled: false`（退回週五收盤）。
     - 週一至週五 < 15:00：`isSettled: false`（退回前一已收盤交易日，週一早上退回週五）。
     - 週一至週五 >= 15:00：`isSettled: true`（當日已收盤且籌碼發布完畢）。
   - **美股 (US) 規則**：
     - 換算至台北時間 (UTC+8)。
     - 台北時間每日 08:00 前：`isSettled: false`（前一美股交易日未結算完全，退回更前一已收盤日）。
     - 台北時間每日 08:00 (含) 之後：`isSettled: true`。

2. **型別合約更新 (`src/types/aiForceDashboard.ts`)**
   - 在 `MarketBarData` 擴充：
     ```ts
     export interface MarketBarData {
       // ...既有欄位
       isSettled: boolean;
       settlementReason?: string;
       anchorTradingDate: string; // 實際分析基準日 (YYYY-MM-DD)
       intradayQuote?: {
         price: number;
         change: number;
         changePercent: number;
         updatedAt?: string;
       };
     }
     ```
   - 在 `DecisionCoreData` 或頂部宣告擴充：
     ```ts
     export interface DecisionCoreData {
       // ...既有欄位
       settlementNotice?: string; // 警示橫幅文字，如 "⚠️ 標的尚未收盤結算，分析以 2026-09-29 完整收盤數據為準"
     }
     ```

3. **分析引擎回退機制 (`aiForceDashboardEngine.ts`)**
   - `generateAiForceReportFromCandles` 引入 `marketSettlementEngine` 檢查。
   - 若 `isSettled === false`：
     - 若 `candles` 最新一筆日期等於今日或未收盤日，自動退後一根，以 `anchorTradingDate` 之 Candle 為基準計算 18 項指標。
     - 封裝 `intradayQuote`（若傳入的 `quote` 具備即時價格），供 UI 作為「盤中即時參考」展示。
     - `marketBar.latestTradingDate` 顯示 `anchorTradingDate`。

4. **UI 視覺強化 (`HeaderMarketBar.tsx` & `AiDecisionCoreCard.tsx`)**
   - `HeaderMarketBar`：
     - 當 `!data.isSettled` 時，主價格標籤改為「前日收盤價」。
     - 於主價格右側或下方顯示高對比度警示徽章：`⚠️ 未收盤 (以 YYYY-MM-DD 為準)`。
     - 若存在 `data.intradayQuote`，於價格旁以次級色輔助顯示 `盤中即時: $XXXX (+X.XX%)`。
   - `AiDecisionCoreCard`：
     - 當有 `settlementNotice` 時，於卡片頂端（AI WARNING 標籤上方）渲染橘黃色警示條：
       `⚠️ 盤中未結算提醒：當前分析模型以 [YYYY-MM-DD] 正式收盤數據為準`。

## Testing Decisions

1. **測試外部行為而非實作細節**：
   - 測試 `marketSettlementEngine` 在不同台北時區時間點（週一 10:00、週五 14:00、週五 15:00、週日 12:00、美股台灣時間 07:30 與 08:30）回傳的 `isSettled` 與 `anchorTradingDate` 是否符合預期。
   - 測試 `aiForceDashboardEngine` 在未結算情境下，產出的 `latestTradingDate` 是否確實定錨於上一交易日，且包含正確的 `settlementNotice` 與 `intradayQuote`。
2. **Prior Art (既有測試借鏡)**：
   - 參考 `src/hooks/usePriceAutoRefresh.test.ts` 中對 `isTaiwanMarketOpen` 時間點的模擬測試手法。
   - 參考 `src/engine/smartMoneyFetcher.test.ts` 中 `getLatestTradingDateString` 的時區轉換驗證測試。

## Out of Scope

1. 逐筆即時 Tick 串流接收（WebSocket）：本專案為主力與量化波段分析儀，不引入微秒級高頻 Tick 引擎。
2. 期貨夜盤與盤前試撮量化分析：非現階段範圍，維持現股日 K 與籌碼盤後基準。

## Further Notes

- 全程恪守 KISS 原則與零破壞性更新。
- 嚴格控制 UI 佈局，不產生 Cumulative Layout Shift (CLS)，所有警示徽章與橫幅具備固定高度與自適應換行。
