# 技術債 0061: 同步門檻常數跨檔收斂、按需補齊中斷控制與長照爬蟲擴展 (Market Sync Threshold Constants, Abort Controller & Long-term ETF Coverage)

* **建立日期**：2026-11-19
* **狀態**：`OPEN`（核心 3 項已於 Spec 0240 / Issue #594 Wave 1 完整清償：門檻 SSOT `sync-thresholds.cjs`、按需補齊 `AbortController`、質押追趕測試斷言；僅剩第 3 項「非主流 ETF 規模/費率月報爬蟲」屬獨立新功能延後）
* **優先級**：`P3 (Low)`
* **來源**：/code-review 雙軸審查回饋 (Spec 0238 / Issue #590)
* **標籤**：`Refactor` · `CleanCode` · `MarketSync` · `Lakehouse` · `Resilience` · `TestSmell`

---

## 1. 現狀診斷與背景 (Context & Problem)

在 Spec 0238 主力戰情室 4.1 湖倉自癒、ETF 多型合流與零微字人體工學重構中，已成功實作 7 維欄位完好度探針（日 K、法人、融資、借券、當沖、估值、ETF 淨值）、半殘日自癒重拉、按需補齊歷史序列（集保與月營收）以及 ETF 淨值全分組入庫。

在代碼雙軸審查（Standards + Spec）中，識別出以下 4 處非阻擋性之演進與維護性改善空間：

1. **7 維門檻常數跨檔重複 (Magic Numbers & DRY)**：
   `scripts/market-sync/backfill-tw-history-web.cjs` 與 `scripts/market-sync/market-freshness-service.cjs` 兩檔均分別宣告了：
   - `MARGIN_THRESHOLD = 1500`
   - `SBL_THRESHOLD = 500`
   - `DAY_TRADE_THRESHOLD = 500`
   - `VALUATION_THRESHOLD = 1500`
   - `ETF_NAV_THRESHOLD = 100`
   若未來證交所標的檔數大幅增長或分流規則調整，需雙邊手動同步，存在維護脫節風險。

2. **按需補齊之逾時機制缺少 `AbortController` 主動取消**：
   `scripts/market-sync/vite-market-middleware.cjs` 透過 `Promise.race([taskPromise, timeoutPromise])` 實作 2500ms 快速降級門禁。雖然前端在 2500ms 後已立即收到降級回應（確保 UI 零卡頓），但被放棄的背景 Promise 若仍在進行 HTTP 請求，會繼續佔用系統網路連接埠直到完成。

3. **非主流 ETF 規模與經理費率之動態爬蟲自動化接入**：
   目前 Card 20 針對主流 ETF 提供了靜態基準回退（如規模、費用率），動態資料（折溢價、淨值、受益人數、近一年年化殖利率）則由湖倉即時提供。非主流 ETF（例如冷門債券或期貨 ETF）若未收錄於基準表，其靜態資產規模與經理費率欄位暫時顯示為 `--`。

4. **`viteMarketMiddleware.test.ts` 質押追趕 mock 斷言補充**：
   在代碼審查修繕中，追趕任務成功掛載了 `fetchAndIngestTwPledge`，確保伺服器啟動時自動追趕董監質押資料；但單元測試 `viteMarketMiddleware.test.ts` 中尚未對此新增的質押呼叫建立專屬的 mock 呼叫計數斷言。

---

## 2. 建議解法與演進路徑 (Proposed Solution)

1. **門檻常數單一來源抽取 (SSOT)**：
   - 建立 `scripts/market-sync/sync-thresholds.cjs`，匯出 `MARKET_HEALTH_THRESHOLDS` 物件。
   - `backfill-tw-history-web.cjs` 與 `market-freshness-service.cjs` 統一從該模組解構匯入。
2. **導入 `AbortController` 與 `signal` 取消信號**：
   - 在 `vite-market-middleware.cjs` 的按需補齊任務中引入 `new AbortController()`。
   - 當 `timeoutPromise` 優先觸發時，呼叫 `controller.abort()`，並在子進程或 `fetch` 傳入 `signal`，即時終止底層網路 I/O。
3. **ETF 公開資訊觀測站/投信投顧公會月報爬蟲排程**：
   - 未來可新增 `scripts/market-sync/ingest-tw-etf-meta.cjs`，定期從投信投顧公會或證交所抓取全市場 ETF 最新基金規模 (AUM) 與經理費/保管費率，直接存入湖倉 `etf_meta` 資料表。
4. **測試斷言補齊**：
   - 在 `viteMarketMiddleware.test.ts` 新增測試案例，模擬當前日缺少質押記錄時，驗證 `fetchAndIngestTwPledge` 確實被調用且帶入正確日期。

---

## 3. 預期效益 (Benefits)

1. **消除重複**：門檻數值統一維護，杜絕多檔常數偏離。
2. **釋放 I/O 資源**：按需逾時即時終止連線，減輕高並發下的外部網路負擔。
3. **數據完備性**：全市場 ETF 規模與費用率 100% 動態更新。
