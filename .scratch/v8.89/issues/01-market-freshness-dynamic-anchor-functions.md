# Ticket 01: 市場週期動態結算純函數抽離與領域單元測試 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：`scripts/market-sync/market-freshness-service.cjs`
* **測試檔案**：`src/engine/marketFreshnessService.test.ts`

## 2. 需求描述 (Description)
1. 實作並導出 `getLatestSettledTdccFriday(now?: Date): string`：
   * 台北時間 (UTC+8)。
   * 若為週五且已過 21:00，結算為當日；未滿 21:00 則退回上週五。
   * 非週五（週六至週四）自動扣除對應天數，回退至剛過去之週五。
2. 實作並導出 `getLatestSettledRevenueMonth(now?: Date): string`：
   * 台北時間 (UTC+8)。
   * 若當月日期已過 10 日 17:30，結算為上個月 (`YYYY-MM`)。
   * 若在 10 日 17:30 之前，結算為上上個月 (`YYYY-MM`)。
   * 支援跨年 1 月份邊界保護（回退至前一年 11/12 月）。
3. 擴展 `checkMarketFreshness(db, now?: Date)`：
   * 查詢 `tw_tdcc_distribution` 的最新日期與 `tw_monthly_revenue` 的最新月份。
   * 回傳新增 `tdcc` 與 `revenue` 物件，並準確標註 `isStale` 布林狀態。

## 3. 測試縫隙 (Test Seams)
* 透過公開導出之函數介面切片測試，只測行為與極值，不依賴內部實作細節。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0177 之 **AC 1, AC 2, AC 3**。
* [ ] `src/engine/marketFreshnessService.test.ts` 相關測試 100% 綠燈。
