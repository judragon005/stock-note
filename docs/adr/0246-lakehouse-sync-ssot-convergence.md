# ADR 0246: 外部資料更新中樞收斂（單一缺口調諧）、NAS 分軌水位線自治排程、靜態快取退役與 Card 01 盤中實量縫合

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-24
- **關聯規格與 Issue**: [Spec 0246](../specs/0246-lakehouse-sync-ssot-convergence-spec.md) / GitHub Issue `#607`

## 背景 (Context)

實測 QNAP NAS 24/7 Docker 容器與本機開發環境時，發現外部市場資料多處停滯（11/24 交易日開啟時 `Card 01` 成交量與台股日 K 仍停在 11/19，近 30 日累積 8 個週五／週一斷層缺口，NAS 端資料亦長期未前進）。全量根因盤點揭露八項結構性缺陷：

1. **NAS 單日共享鎖餓死台股**：`nas-autonomous-scheduler.cjs` 以單一 `lastDailyIsoDate` 綁定美股與台股；週二至週五台北清晨 06:00 美股到期觸發時連帶執行開盤前空台股同步，卻寫入當日完成鎖，導致下午 15:30 後台股收盤日更 100% 被跳過。
2. **缺口盲視追趕與跨模組契約斷裂**：開機追趕僅呼叫無日期參數之單日同步，盤中即空跑退出且不回補歷史缺口；`runTwMarketSync` 誤將設定物件當日期字串導致 `customDbPath` 未傳遞且繞過休市日檢查；中介層對 `runUsMarketSync` 傳遞錯誤鍵名 `dbPath` 導致自訂路徑被忽略；`weekly-lakehouse-sync.cjs` 匯入不存在的 `ingestTwseEtfMetaList`、誤將 ETF 淨值物件當數字運算並缺交易日定錨，導致週排程 100% 失敗。
3. **休市日曆缺漏、四套結算時鐘與歷史補抓門檻陷阱**：`Dockerfile` 執行期映像遺漏 `src/data/market-holidays.json`；前後端四處各自計算結算線且前端忽略法定休市日；空表時 `tdcc`/`revenue` 鮮度誤判 `isStale: false`；`2026-10-23`（薔琵颱風停市）、`2026-10-26`（光復節補假）與 `2026-12-25`（行憲紀念日）未入表；歷史補抓日（`< twLatest`）因 TPEx OpenAPI 僅支援當日快照，遭套用全市場 1500 門檻形成無限陳舊迴圈。
4. **靜態 JSON 市場快取腦裂與 Card 01 盤中零量縫合**：`nas-server.cjs` 對 `.json` 回傳一年期 `immutable` 快取頭，`App.tsx` 開機下載過期靜態檔並以單根 K 線覆寫 IndexedDB 既有 250 日歷史；`useMarketCatchupSync` 從未掛載且追趕期間無輪詢；`priceFetcher.ts` 未提取盤中真實 OHLCV，迫使 `Card 01` 盤中縫合固定寫入 `volume = 0` 平盤線並退回過期結算日成交量。

## 決策 (Decision)

1. **單一結算時鐘、休市日曆容器化與跨模組契約統一**：
   - 於 `scripts/market-sync/sync-thresholds.cjs` 建立 `MARKET_SETTLEMENT_CUTOFFS` SSOT（TW 15:00 TPE / Phase 1 14:40 / Phase 2 16:30 / US 17:00 NY / 30D 回溯窗 / 4 次重試配額）與歷史補抓日 TWSE-only 底線（`HISTORICAL_TWSE_MARGIN_COUNT_MIN = 900`、`HISTORICAL_TWSE_VALUATION_COUNT_MIN = 900`）；`Dockerfile` 正式階段補複製 `src/data/market-holidays.json`（並補齊 2026 實戰休市日）；前端 `marketSettlementEngine.ts` 匯入共享休市日曆對齊前後端結算日。
   - 修復 `market-freshness-service.cjs` 空表陳舊判定與歷史補抓門檻；統一 `runTwMarketSync`、`runUsMarketSync`（美東結算日 Checkpoint）與 `weekly-lakehouse-sync.cjs` 參數及匯出契約；抽離共享 `isTwOtcWarrantSymbol` 規則確保台股日更與回補對齊。
2. **Gap-Set Lakehouse Reconciliation 與 Per-Lane Watermark Convergence**：
   - 建立零依賴單一調諧中樞 `scripts/market-sync/lakehouse-sync-coordinator.cjs`，提供同行程 token-safe 全域互斥鎖 `withGlobalSyncLock`、30 日缺口集合升冪調諧 `computeTwReconciliationPlan` / `reconcileTwLakehouse`、台股兩階段盤後容錯收斂（`PHASE_1_PRICE_ONLY` 寫價量不推進水位線，`PHASE_2_FULL` 全齊始推進）與每軌每日 4 次冷卻重試配額。
   - 重構 `nas-autonomous-scheduler.cjs` 為 `twDaily`、`usDaily`、`macro`、`weekly` 四軌獨立水位線狀態機，徹底切斷跨市場互相鎖死；`nas-server.cjs` `/healthz`、`vite-market-middleware.cjs` 與 `backfill-full-market-history.cjs` 全面合流至同一鎖與遙測快照。
3. **SQLite-Only Sync Telemetry SSOT（Expand–Contract 退役靜態快取）**：
   - 擴充 `GET /api/market/sync-status` 輸出完整 SQLite 分軌遙測；將 `MarketSyncStatusBadge` 與 `MarketScheduleHubSection` 遷移至該 API 並監聽 `LAKEHOUSE_SYNCED_EVENT`。
   - 於 `App.tsx` 刪除開機靜態 JSON 水合與 IndexedDB 單根覆寫，正式掛載支援背景追趕期間自動輪詢的 `useMarketCatchupSync`；`sync-tw-market.cjs` / `sync-us-market.cjs` 預設關閉靜態檔輸出，`nas-server.cjs` 取消 `.json` 的 `immutable` 快取標頭，並於 `architecturalFitnessGuard.test.ts` 植入不變量 7 永久封鎖靜態市場快取回流。
4. **Card 01 盤中真實 OHLCV 縫合（零回歸保留 Spec 0245 防禦）**：
   - 擴充 `PriceQuote`（可選 `open`/`high`/`low`/`volume`/`transactions`）與 `parseYahooQuoteResponse` / `parseTWSEDayAllResponse`；`generateAiForceReportFromCandles` 優先寫入盤中真實量價，若上游確實缺量則降級回 `volume = 0` 完整觸發 Spec 0245 `isVolumeAnchoredToPrevClose` 定錨保護。

## 後果 (Consequences)

- **正向效益**：零新增外部依賴（0 KB 增量）；NAS 四軌自治排程彼此隔離且台股不再被清晨美股鎖死；啟動追趕與例行補齊具備 30 日自癒與兩階段收斂能力（本機實測 11/20、11/23 與近 30 日缺口全數歸零、`isStale: false`）；消滅開機 5 MB 過期靜態下載與 IndexedDB 250 日歷史覆寫；Card 01 盤中即時呈現當日真實 OHLCV 同時保留零量防禦。
- **權衡**：完全移除靜態市場快取讀寫後，無後端純靜態託管環境將直接依賴 `/api/market/sync-status` 與即時報價 API 運作（CLI 仍保留 `writeStaticCache: true` 顯式開關供除錯使用）；歷史補抓日因 TPEx OpenAPI 物理限制不含上櫃融資／估值快照，系統明確以最新結算日雙市場 1500、歷史日 TWSE 900 雙層門檻誠實衡量完整度。
