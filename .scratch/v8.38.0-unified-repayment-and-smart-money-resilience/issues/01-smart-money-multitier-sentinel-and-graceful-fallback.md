# Ticket 01: 籌碼日報多維哨兵校驗、優雅降級回退 T-1 與單元測試

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0119-pledge-unified-repayment-and-smart-money-resilience-spec.md` (模組二)
- 關聯 Issue: #32

## 任務目標
在 `src/engine/smartMoneyFetcher.ts` 中建立強固的多維健康度哨兵 `isInstitutionalReportComplete`，並在日報數據未齊全（全市場總檔數 < 1,200 檔或權值成交量全為 0）時，自動優雅降級 (Graceful Fallback) 回退至前一交易日 (T-1) 之完整日報，不污染當日快取。

## 具體修改清單
1. **`src/engine/smartMoneyFetcher.ts`**：
   - 實作 `isInstitutionalReportComplete(data: Record<string, TwseInstitutionalRow> | null | undefined): boolean`：
     - 檔數門檻：`Object.keys(data).length >= 1500`（若小於 1200 視為殘缺資料）。
     - 活躍法人交易量門檻：檢驗前 30 大股票之三大法人買賣超絕對值總和大於 0。
   - 在 `fetchTwseInstitutionalReportDetailed` 中：
     - 使用 `isInstitutionalReportComplete` 取代舊有的 `isMarketCoverageValid`。
     - 若當日資料未通過檢驗，不寫入當日快取，自動遞推抓取/讀取前一交易日有效日報。
     - 在回傳之 `InstitutionalReportResult` 中標記 `fallbackReason?: 'INCOMPLETE_DATA'` 與 `reportDate`。
2. **測試驅動開發 (`src/engine/smartMoneyFetcher.test.ts`)**：
   - 新增針對 `isInstitutionalReportComplete` 的單元測試（包含全 0 張、檔數過低 894 檔、以及完整 1800 檔情境）。
   - 驗證當日資料不完整時，`fetchTwseInstitutionalReportDetailed` 正確降級回退到有效前一日並標記 `isLiveToday = false`。

## 驗收標準
- [ ] 模擬 894 檔或全 0 張情境，哨兵皆回傳 `false`。
- [ ] 當日未合格時自動回退 T-1 完整日報，不產生全 0 氣泡。
- [ ] `npm test src/engine/smartMoneyFetcher.test.ts` 100% 通過。
