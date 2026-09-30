# 0150. 未收盤標的前日收盤數據定錨與雙層警示機制 (Pending Market Close Pre-Close Anchor & Alert)

Date: 2026-09-30

## Status

Accepted

## Context

當使用者在盤中或盤後尚未結算之時點分析標的時，直接採計當日未結算之價格或日 K 會嚴重扭曲籌碼分析、VWAP 主力成本與 AI 多維度雷達結論。且既有 UI 頂部標示「今日收盤價」在盤中時容易引發認知誤導。

經討論後確定：
1. **台股時點**：每日 15:00 證交所三大法人與盤後籌碼完整公布前，視為未結算。
2. **美股時點**：台灣時間每日 08:00 前，美股盤後數據未完整結算，視為未結算。
3. **雙層警示＋保留即時價**：核心分析定錨上一收盤日，頂部標記前日收盤並出示橘黃警示徽章，AI 決策核心出示防禦橫幅，同時輔助顯示盤中即時參考價。

## Decision

1. **模組封裝**：建立獨立純函式 `src/engine/marketSettlementEngine.ts`，接收 `MarketType` 與參考時間 `referenceDate`，支援時區感知（Asia/Taipei）與時段/週末推算。
2. **合約擴充**：於 `src/types/aiForceDashboard.ts` 擴充 `MarketBarData`（`isSettled`、`anchorTradingDate`、`intradayQuote`）與 `DecisionCoreData`（`settlementNotice`）。
3. **數據隔離防禦**：`aiForceDashboardEngine.ts` 於未結算時，以 `anchorTradingDate` 之日 K 作為量化分析基準日，盤中即時行情不參與歷史模型計算。
4. **雙層視覺體驗**：
   - `HeaderMarketBar`：動態切換為「前日收盤價」，出示 `[⚠️ 盤中未結算·以 YYYY-MM-DD 為準]` 徽章與盤中即時參考價。
   - `AiDecisionCoreCard`：頂端出示顯著警示橫幅。

## Consequences

- **正面效果**：徹底阻斷盤中不完整數據對量化與籌碼模型的污染，提升 AI 分析結論的專業嚴謹度與透明度。
- **維護代價**：需要在分析引擎中處理日期定錨邊界與模擬時間注入，但純函式設計確保 100% 可單元測試。
