# ADR 0188: 全市場全歷史數據湖倉架構解耦、250日預載視窗與跨模組本地優先整合工程

## 狀態 (Status)
已採納 (Accepted) - 2026-10-16

## 決策背景 (Context)
在先前版本中，系統存在嚴重儲存深度與應用層視窗混淆問題：
1. **儲存深度被截斷**：入庫腳本 (`backfill-local-csv.cjs`, `ingest-historical-chips.cjs`) 硬編碼 `limit=260`，修剪器 (`retention-cleaner.cjs`) 還會定時 `DELETE` 超過 260 天的日 K 與籌碼，破壞了資料庫作為「十餘年全歷史資產」的本質。
2. **大盤基準依賴假數據**：美股 SPY 基準價格依賴靜態寫死常數，未直接使用本地湖倉天天採集的真實 SPY 日 K。
3. **歷史淨值與除權息捨近求遠**：歷史價格與股利查詢直接連網 Yahoo Finance 與 FinMind，經常遭遇 `ECONNRESET` 逾時破圖與配額限制。
4. **回補進度視覺算術混淆**：雙軌回補時後端將台股進度折半（13%），前端 UI 卻直接與台股單軌天數 (63/250天) 混排，造成算術誤會；單日看門狗熔斷跳過的天數缺少尾盤自動補漏。

## 決策內容 (Decisions)
1. **儲存深度徹底解耦 (Append-Only)**：
   - 歷史 CSV 與法人籌碼入庫腳本的 `limit` 預設改為 `0`（全量無限制入庫）。
   - 歷史修剪器 `retention-cleaner.cjs` 永久封印對 `daily_candles` 與 `tw_institutional_chips` 之 `DELETE` 語句，確保歷史行情永不刪除。
2. **應用層嚴守 250 天預載視窗**：
   - API 中介層 `/api/market/history/:symbol` 預設維持 `limit=250`（極速預載視窗，<10ms 秒開），並支援 `limit=all`（全量檢索）或任意自訂整數天數。
3. **Zero-Mock 大盤基準直連**：
   - 拔除 `benchmarkData.ts` 寫死數學，優先透過 `/api/market/history/SPY?limit=all` 直讀本地湖倉真實日 K，查無時安全降級為備用常數。
4. **Lakehouse-First 本地優先路由**：
   - `historicalPriceFetcher.ts` 查詢日 K 與 `dividendService.ts` 查詢歷年配息時，優先檢索本機 SQLite 湖倉（0.05秒秒開），未在庫時才對外發起網路請求。
5. **回補進度口徑分離與看門狗尾盤自動補漏**：
   - 全域回補狀態明確提供獨立的 `globalProgressPct`、`tw.progressPct` 與 `us.progressPct`；前端 UI 清晰分列標註。
   - 台股回補主循環末尾若有少數熔斷或異常天數（$\le 5$ 天），自動於 5 秒冷卻後發起單輪重試並補漏入庫。
6. **降序複合索引優化**：
   - 建立 `tw_institutional_chips(symbol, date DESC)` 複合索引，提升 `busy_timeout` 至 15000ms。

## 後續影響 (Consequences)
- **正面效益**：
  - 本機十餘年歷史行情與籌碼得以全量完整保存，不再遭到排程修剪截斷。
  - 主力戰情室與圖表維持最近 250 天預載的高效能秒開體驗。
  - 大盤基準 SPY、歷史淨值回推與除權息全面擺脫外部網路斷線與逾時破圖。
  - 回補進度顯示精確透明，看門狗具備尾盤自我修復閉環。
- **潛在權衡**：
  - 資料庫檔案 (`market_history.db`) 隨全量歷史導入會持續增長，由 `runIncrementalVacuum` 提供定時磁碟重組保障。
