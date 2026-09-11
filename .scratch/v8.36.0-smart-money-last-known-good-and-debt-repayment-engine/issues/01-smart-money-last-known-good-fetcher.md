# 01 — 籌碼日報 Last Known Good 哨兵與歷史自動回溯引擎 (Smart Money Last Known Good Fetcher)

**What to build:**
升級 `src/engine/smartMoneyFetcher.ts` 中的籌碼日報抓取機制。台股盤後法人日報通常在 15:00~16:30 始陸續公布，系統在台北時間 15:30 之前，或線上請求查無當日日報時，自動鎖定前一交易日（T-1）已確認結算之完整日報。在請求過程中若線上 API 逾時或遇到證交所防爬限制，引擎自動遞迴向歷史回溯檢索本地 IndexedDB 中最新一份有效日報（以 `2330` 台積電數據存在為有效哨兵），保證永不回傳空物件 `{}` 或顯示全 0 張。將回傳型別由原先純字典擴充為結構化物件 `InstitutionalReportResult`（包含 `reportDate`, `isLiveToday`, `data`, `totalSymbols`），以向下相容方式支援呼叫端。

**Blocked by:** None — can start immediately

**Status:** complete

- [x] 定義 `InstitutionalReportResult` 介面（含 `reportDate`, `isLiveToday`, `data`, `totalSymbols`）
- [x] 調整基準交易日推算邏輯，以每日 15:30 作為當日與前一日分界點
- [x] 改造 `fetchTwseInstitutionalReport`，在重試迴圈中優先命中本地 IndexedDB 快取
- [x] 實作 Last Known Good 遞迴歷史回溯，最多回溯 5 個交易日，確保必有有效資料
- [x] 於 `src/engine/smartMoneyFetcher.test.ts` 新增測試驗證盤中自動請求 T-1、線上失敗自動回溯本地快取、以及正確回傳資料所屬日期與檔數
