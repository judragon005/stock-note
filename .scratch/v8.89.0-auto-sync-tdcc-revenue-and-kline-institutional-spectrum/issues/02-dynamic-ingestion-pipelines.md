# Ticket 02: 全市場入庫腳本動態錨點化與歷史序列回補容錯 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  * `scripts/market-sync/ingest-tw-tdcc.cjs`
  * `scripts/market-sync/ingest-tw-monthly-revenue.cjs`
* **測試檔案**：`src/engine/tdccAndMonthlyRevenueSeries.test.ts`

## 2. 需求描述 (Description)
1. 拔除寫死之靜態日期：
   * `runTdccIngestion(customDbPath, targetDate, backfillWeeks)`：若 `targetDate` 未傳入，預設呼叫 `getLatestSettledTdccFriday()`。
   * `runMonthlyRevenueIngestion(customDbPath, targetYearMonth, backfillMonths)`：若 `targetYearMonth` 未傳入，預設呼叫 `getLatestSettledRevenueMonth()`。
2. 保持向後相容：
   * 若外部傳入明確的 `targetDate` 或 `targetYearMonth`，仍依外部指定日期回補，保障歷史審計與測試冪等性。
3. 測試斷言升級：
   * 在 `tdccAndMonthlyRevenueSeries.test.ts` 中，使用動態回傳的 `yearMonth` 比對資料庫最新值，消除測試程式碼中的硬編碼月份脆弱性。

## 3. 測試縫隙 (Test Seams)
* 調用入庫管線公開 entrypoint，驗證 SQLite 湖倉生成資料之時間序列邊界與數量。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0177 之 **AC 1, AC 2, AC 7**。
* [ ] `src/engine/tdccAndMonthlyRevenueSeries.test.ts` 測試 100% 綠燈。
