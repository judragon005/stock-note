# 需求規格說明書：AI 戰情室單一真實數據來源校準、淘汰衝突硬編碼假資料與優雅 Empty State 規範 (AI Force Real Data SSOT & Resilient Empty State)

- **規格編號**：`SPEC-0152`
- **狀態**：`READY_FOR_AGENT`
- **領域上下文**：`AI 主力戰情室 (AI Force Decision Dashboard)`、`市場結算引擎 (Market Settlement Engine)`、`日 K 圖表渲染 (K-Line Chart System)`
- **關聯 PRD / ADR**：[ADR-0140](../adr/0140-ai-force-decision-dashboard.md)、[ADR-0150](../adr/0150-pending-market-close-pre-close-anchor-and-alert.md)、[ADR-0151](../adr/0151-ai-force-data-pipeline-sync-and-visual-alignment.md)

---

## Problem Statement

使用者在「AI 主力決策儀表板」中查詢 `00403A`（主動統一升級50）或其他查無即時報價/外部日 K 之標的時，發現多處嚴重的數據失真與視覺衝突破圖現象：

1. **今日收盤價顯示為寫死之 150.00 元且全套造假**：頂部行情列無差別顯示 `150.00 (+1.80, +1.20%)`、成交量 2,681 張、成交筆數 6,260 筆、資料筆數 98 日，且日期標記為今天 (2026-09-30)。這並非標的真實數據，而是系統查無資料時，由 `createDefaultAiForceReport` 寫死的假資料模板。
2. **K 線圖內部以 2,100 元假數列繪製，與 150 元支撐線在同一畫布嚴重拉扯破圖**：在日 K 不足或為空時，`KLineChartCard` 的 `normalizeAndSortCandles` 硬編碼以 `basePrice = 2100` 生成 30 根 K 棒（2,085 ~ 2,147 元），但同時接收由 150 元計算出的 `supportLevel = 138.00 元`。兩組極端衝突的價格強行壓縮於同一張 SVG 畫布，導致 Y 軸刻度爆裂，「支撐區 138.00」被壓扁並疊在圖表右下角。
3. **盤中未結算與歷史資料定錨機制失效**：當前時段為盤中（15:00 前），但 `createDefaultAiForceReport` 寫死 `isSettled: true` 與 `anchorTradingDate: todayStr`，完全繞過了 `marketSettlementEngine` 的未結算防禦機制，既未切換標籤為「前日收盤價」，亦未定錨於上一交易日。
4. **資訊列說明文字完全脫鉤**：`HeaderExportBar` 永遠顯示寫死的 `區間 2026-05-04 ~ 2026-09-18，共 98 個交易日，法人資料 20 日`，與頂部的 2026-09-30 產生直觀上的自我矛盾。
5. **卡片 02~18 全數陷入靜態假數值展示**：AI 決策核心（評分 56、壓力區 4%、波動 62 等）在無資料時全數展示靜態假象，缺乏明確的 Empty State，誤導使用者決策。

---

## Solution

1. **徹底淘汰硬編碼價格偽造 (Eliminate Hardcoded Price Mocking)**：
   - 廢除 `createDefaultAiForceReport` 中 `price = 150.0` 及依此比例計算之漲跌額、開高低與成交量等捏造邏輯。
   - 廢除 `KLineChartCard` 內 `normalizeAndSortCandles` 之 `basePrice = 2100` 假 K 棒生成邏輯。
2. **單一真實數據來源與最後已知收盤價定錨 (SSOT & Last-Known-Close Anchor)**：
   - 若本地或遠端查有歷史日 K（>= 1 根）：以「最新一筆有效歷史日 K」為定錨基準（標記為「前日收盤」或「最後收盤」），展示該日真實收盤價、成交量與截止日期，絕不在無即時行情時捏造當日虛假跳動。
   - 嚴格遵守 `marketSettlementEngine`：當處於盤中未結算時，一律將頂部收盤價標記為「前日收盤價」，並呈現 `[⚠️ 盤中未結算·以 YYYY-MM-DD 為準]` 橘黃警示徽章。
3. **高質感無數據優雅 Empty State (Graceful Empty State)**：
   - 當標的完全無歷史日 K（如新掛牌新股尚未有日 K 沉澱）時，K 線圖（Card 01）呈現具備玻璃擬態與科技感的 Empty State 占位卡片（「📊 尚無歷史日 K 數列·數據串接中」），絕不渲染破圖的 2100 元假蠟燭。
   - 頂部行情列之數值安全呈現 `-`，資料狀態標註「無歷史報價」，並引導使用者切換至具備日 K 之標的。
4. **修復 HeaderExportBar 數據脫鉤**：
   - 在 `AiForceDashboardView.tsx` 中正確將 `report.marketBar.dataSourceText` 與 `report.marketBar.dataRangeText` 傳入 `HeaderExportBar`，使資料說明列與實際查詢標的 100% 保持同步。
5. **其餘卡片數據透明化**：
   - 在無歷史資料時，Card 02~18 呈現清晰的「數據不足·等待日 K 補齊」透明狀態，避免展示偽造的 56 分與 AI 建議。

---

## User Stories

1. 作為投資人，當我查詢新掛牌或暫無日 K 之標的（如 `00403A`）時，我希望系統明確提示「尚無歷史數據 / 數據串接中」，而不是憑空捏造一個 150.00 元的假收盤價，以避免我做出錯誤的買賣決策。
2. 作為技術分析者，當標的無日 K 數列時，我希望 K 線圖顯示優雅的 Empty State 提示，而不是顯示 2,100 元且把 138 元支撐線壓在右下角的破圖畫面。
3. 作為盤中看盤使用者，當我於 15:00 結算前查看標的時，我希望行情標籤準確顯示為「前日收盤價」，並顯示上一交易日（如 2026-09-29）的定錨收盤數據，以確保符合金融交易真實情況。
4. 作為一般使用者，當有歷史資料但當天尚未更新時，我希望看到的是最後一筆已知歷史日 K 的收盤價與日期，而不是跳回寫死的致茂假資料或 150 元。
5. 作為注重資訊透明度的使用者，我希望中間的資料來源說明條能精確顯示當前標的的真實日期區間與筆數，而不是固定顯示寫死的「2026-05-04 ~ 2026-09-18」。
6. 作為專業操盤手，當卡片 02~18 因日 K 不足而無法計算時，我希望能看到明確的「歷史資料不足（需至少 5 根日 K）」之防呆提示，而不是被捏造的假訊號（如 AI WARNING 或 56 分）所誤導。

---

## Implementation Decisions

### 1. 核心計算引擎模組改動 (`aiForceDashboardEngine.ts`)
- **`createDefaultAiForceReport` 改造**：
  - 移除 `price = 150.0` 與所有依此推算的假漲跌、假成交量。
  - 引入 `getMarketSettlementStatus(market)`，預設 report 亦必須符合當前市場結算狀態，不得硬編碼 `isSettled: true`。
  - 當無 `basePrice` 且為無資料標的時，數值給予 `undefined` 或安全回退，並標註 `isDataPending: true`。
- **`generateAiForceReportFromCandles` 強化**：
  - 允許 1~4 根日 K 時提取「最後已知日 K」填補頂部收盤價與日期，標註「歷史日 K 不足（小於 5 根），部分量化卡片暫停運算」。

### 2. K 線圖渲染模組改動 (`KLineChartCard.tsx`)
- **淘汰 2,100 元假 K 棒**：
  - 移除 `normalizeAndSortCandles` 中的 `let basePrice = 2100` 迴圈偽造邏輯。
  - 當 `candles` 為空或不足時，回傳空陣列 `[]`。
  - 當 `displayCandles.length === 0` 時，K 線畫布直接渲染友善的「📊 尚無歷史交易日 K 數列」Empty State 視覺面板，不再計算與繪製打架的 Y 軸或破圖支撐線。

### 3. 視圖層資料綁定修復 (`AiForceDashboardView.tsx` & `HeaderExportBar.tsx`)
- **修復資訊列 props 脫鉤**：
  - 在 `AiForceDashboardView.tsx` 調用 `<HeaderExportBar>` 時，完整傳入：
    ```tsx
    <HeaderExportBar
      report={report}
      sourcesText={report.marketBar.dataSourceText}
      rangeText={report.marketBar.dataRangeText}
    />
    ```
  - 確保使用者看到的日期範圍與資料來源跟隨當前標的動態連動。

---

## Testing Decisions

- **良好測試原則**：只檢驗公開對外介面與行為契約，不測試內部私有變數或具體實作細節。
- **測試切片 (Seams)**：
  1. `src/engine/aiForceDashboardEngine.test.ts`：
     - 測試無日 K 且無即時報價時，`createDefaultAiForceReport` 不會產出 150 元捏造價格與 2100 元均線。
     - 測試盤中未結算狀態下，預設報告能正確標註 `isSettled: false` 與退回上一交易日定錨。
     - 測試傳入少於 5 根但至少 1 根日 K 時，正確以最後一根日 K 填補收盤價與最新交易日。
  2. `src/components/aiForceDashboard/cards/KLineChartCard.test.ts`：
     - 測試 `normalizeAndSortCandles([])` 回傳空陣列，不再回傳 2100 股價之 30 根合成數列。
     - 測試當傳入空陣列時，圖表安全處理且不與 `keyLevels` 產生除以零或 Y 軸座標溢出。
  3. `src/components/aiForceDashboard/HeaderExportBar.test.ts` / `.test.tsx`：
     - 測試傳入自訂 `sourcesText` 與 `rangeText` 時，介面正確呈現，不再被預設寫死字串覆蓋。

---

## Out of Scope

- 本規格不包含向第三方採購付費實時 WebSocket 串流之架構變更（維持現有 Yahoo Finance / TWSE 雙軌輪詢與 IndexedDB 增量回補機制）。
- 本規格不包含對其他非股票記錄工作區（如 FIRE 試算器、財報雷達）之介面變更。

---

## Further Notes

- 遵循第一性原理與事實為本原則：金融看盤軟體的最高天條為「誠實反映數據狀態」。查無資料或回補中，必須誠實揭露，絕對嚴禁以偽造之暴漲暴跌或固定價格假充場面。
