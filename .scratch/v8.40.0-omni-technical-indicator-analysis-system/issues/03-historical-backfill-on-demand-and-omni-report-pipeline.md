# Ticket 03: 歷史 K 線隨選回補與全指標報告組裝管線 (Omni Report Pipeline)

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0121-omni-technical-indicator-analysis-system-spec.md` (模組二)
- 關聯 Issue: #37
- 標籤: `enhancement,ready-for-agent`

## 任務目標
建立 `src/engine/omniReportPipeline.ts`，串接現有之 `historicalOhlcvBackfill.ts` 與 IndexedDB 本地快取，提供傳入任意代碼（台股/美股）即可隨選非同步回補日 K 線、並組裝出完整 `OmniIndicatorReport` 之管線函式。

## 具體修改清單
1. **`src/engine/omniReportPipeline.ts`**：
   - 實作 `fetchAndBuildOmniReport(symbol: string, market: MarketType, options?: { forceRefresh?: boolean }): Promise<OmniIndicatorReport>`。
   - 整合 `backfillSymbolOhlcvAndIndicators` 取得最新真實日 K 線。
   - 整合 `technicalIndicatorEngine.ts` 與 `omniIndicatorEngine.ts`，調度運算 5 大矩陣與多空共振評分。
   - 實作 Markdown 診斷報告字串生成器 `generateOmniReportMarkdown(report: OmniIndicatorReport): string`。
2. **單元測試 (`src/engine/omniReportPipeline.test.ts`)**：
   - 模擬有本地快取情境（快速命中，不打外部網路）。
   - 模擬外部 API 回傳失敗時的平滑降級處理。
   - 驗證生成的 Markdown 格式結構完整且語法正確。

## 驗收標準
- [ ] Pipeline 測試 100% 綠燈通過。
- [ ] 能在 300ms 內完成報告裝配與回傳。
