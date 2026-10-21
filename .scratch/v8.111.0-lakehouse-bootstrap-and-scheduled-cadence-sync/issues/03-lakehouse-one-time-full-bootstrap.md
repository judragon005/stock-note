# 03 — 湖倉一次性全量注水 (TWSE 估值、宏觀情緒、董監質押)

**What to build:**
建立整合式注水腳本 `scripts/market-sync/bootstrap-lakehouse-full.cjs`，提供一次性無損注水：
1. **全市場台股估值注水**：全量沉澱 TWSE 1,084 檔每日估值至 `tw_valuation_daily`（包含 1217 愛之味 PE 14.92 / PB 0.63 / 殖利率 2.54%），徹底根除卡片 21「尚無估值數據」缺漏。
2. **宏觀指標全量注水**：調用 `ingest-macro-sentiment.cjs`，將 10 年期美債殖利率、10Y-2Y 倒掛利差、VIX、CNN 恐懼貪婪指數寫入 `macro_sentiment_daily`，消滅 0 筆狀態。
3. **董監質押全量注水**：介接全市場董監質押開放資料，批次寫入 `tw_insider_pledge_records`。
4. 執行全庫健康檢查，確保各表筆數均大於 0。

**Blocked by:** Ticket 02

**Status:** done

- [x] 撰寫 `scripts/market-sync/bootstrap-lakehouse-full.cjs` 腳本
- [x] 執行全量注水，確保 `tw_valuation_daily`、`macro_sentiment_daily`、`tw_insider_pledge_records` 均有數據
- [x] 驗證 1217 愛之味在卡片 21 顯示正確 PE/PB/殖利率 (PE: 14.92, PB: 0.63, 殖利率: 2.54%)
- [x] 單元測試通過 (`src/engine/bootstrapLakehouseFull.test.ts`)
