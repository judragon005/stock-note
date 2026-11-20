# Spec 0241: Wave 2 UI 巨石元件解耦與台股全市場 ETF 動態 AUM/費率湖倉閉環規格 (Wave 2 UI Decomposition & Full-Market TW ETF Dynamic AUM/Meta Lakehouse Spec)

## Problem Statement

在 Wave 1（Spec 0240 / PR #595）完成湖倉同步核心與戰情室雙市場技術債收斂後，專案技術債看板（`docs/debts/README.md`）尚餘三筆可於本迭代一次清零之結構與數據管線債務（Debt 0049、Debt 0050、Debt 0061 #3）：

1. **台股 ETF 靜態基準表嚴重失真且冷門標的缺乏實時 AUM（Debt 0061 #3）**：
   - `aiForceMarketAssembly.ts` 的 `ETF_BASELINE_META` 僅靜態硬編碼 10 檔主流 ETF（如 `0050` 寫死 `4,380` 億 / `0.43%`、`00679B` 寫死 `2,980` 億），但實測今日官方 `all_etf.txt` 與 Yahoo `fundProfile` 數據顯示 `0050` 實時規模已達 `21,781.81` 億（誤差 `-79.9%`）、總費用率已降至 `0.32%`，`00679B` 實時規模為 `1,538.00` 億（誤差 `+93.8%`），冷門債券/期貨/主動 ETF（如 `00693U`、`00400A`）更是完全顯示 `--`。
   - 既有 `ingest-macro-sentiment.cjs` 每日已拉取覆蓋全台灣 367 檔上市櫃 ETF 的 `https://mis.twse.com.tw/stock/data/all_etf.txt`，卻在 `parseTwseEtfNavResponse` 直接丟棄了同一個 JSON 物件內的 `c`（已發行受益權單位數）與 `d`（單日淨申贖單位差異），白白浪費零成本衍生全市場實時 AUM 與初級市場申贖流的黃金欄位。
   - 現有 `us-fundamentals-ingestion.cjs` 之 `normalizeYahooSymbol` 會將所有 `.` 轉為 `-`，若直接查詢台股 `.TW`/`.TWO` 會錯轉為 `-TW`/`-TWO` 而觸發 HTTP 404。
2. **主力戰情室 Card 12 展示職責過度聚合（Debt 0049）**：
   - `src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`（400 行）混雜綜合量化進度條、交易所監理與券商融資警戒標籤、VWAP 偏離與關鍵價位/AI 情境指引等多重呈現職責，不利於後續擴充與單元隔離。
3. **個股深度財報單體巨石元件超過 2,100 行（Debt 0050）**：
   - `src/components/analysis/AnalysisMetricView.tsx`（2,134 行）同時內嵌 600 行 3 支共用 SVG 圖表繪製原語（`renderSimpleBars`、`renderDualLines`、`renderValuationRiver`）與 35 個 `subTab` 財務分頁 JSX，單檔體積過大導致維護與變更風險高。

---

## Solution

執行 **「Wave 2 UI 巨石模組化拆解 + 全市場 ETF 零爬蟲實時 AUM 與 `etf_meta` 湖倉自癒」**，在不破壞任何既有 API、React Props 與歷史測試的前提下一次清償 Debt 0049、Debt 0050 與 Debt 0061 最後一項：

1. **台股 367 檔 ETF 零爬蟲實時 AUM 與 `etf_meta` 混合湖倉管線（Debt 0061 #3）**：
   - **Schema 冪等擴充**：`sqlite-db-core.cjs` 對 `etf_daily_nav` 執行冪等 `ALTER TABLE` 補齊 `issued_units REAL`、`unit_change REAL`、`aum_billion REAL` 三欄，並建立 `etf_meta` 資料表（存儲基金類型、追蹤指數、發行商、上市日、保管機構、實時費用率 `expense_ratio`、來源 `expense_source` 與 `updated_at`）。
   - **零增量 AUM 計算**：擴充 `parseTwseEtfNavResponse` 與 `ingestEtfDailyNavToDb`，自 `all_etf.txt` 既有欄位 `c`（發行單位數）× `f`（淨值）除以 $10^8$ 即時衍生全台灣 367 檔 ETF 實時 `aumBillion` 與單日淨申贖單位 `unitChange`，零新增 HTTP 請求。
   - **輕量 `etf_meta` 雙軌自癒（`scripts/market-sync/ingest-tw-etf-meta.cjs`）**：
     - 批次對接官方 `https://openapi.twse.com.tw/v1/opendata/t187ap47_L`（281 檔上市 ETF 基本資料，30D TTL）。
     - 按需透過既有 Yahoo Finance Crumb 機制（正確保留 `.TW`/`.TWO` 後綴，絕不誤轉 `-TW`）補齊單檔台股 ETF `annualReportExpenseRatio`（30D TTL，無資料時寫入 `expense_source = 'UNAVAILABLE'` 避免 30 天內重打 API，嚴格遵守 ARINC 661 Zero-Mock）。
   - **前後端端到端貫通**：`/api/market/history/:symbol` 回傳 `etfNav`（含 `aumBillion`、`issuedUnits`、`unitChange`）與 `etfMeta`（含 `expenseRatio`、`trackingIndex`、`issuer`）；按需補齊調度器在既有 `AbortController` 300ms 競速門禁內非阻塞自癒缺漏之台股 `etf_meta`；前端 `marketCacheLoader.ts` 與 `aiForceMarketAssembly.ts` 嚴格優先使用湖倉實時 `aumBillion`/`expenseRatio`，`ETF_BASELINE_META` 僅作無湖倉數據時的離線安全退路。
2. **`DynamicSignalsCard.tsx` 三層純展示解耦（Debt 0049）**：
   - 拆出 `DynamicSignalsScoreBar.tsx`、`DynamicSignalsRegulatoryLayer.tsx`、`DynamicSignalsTacticalAdvice.tsx` 至 `src/components/aiForceDashboard/cards/dynamicSignals/`，主檔收斂至 $\le 150$ 行，維持既有匯出（`DynamicSignalsCardProps`、`getSignalLightColor`、`getVerdictBadgeConfig`、default/named export）100% 不變。
3. **`AnalysisMetricView.tsx` 圖表原語與 6 大財務領域拆解（Debt 0050）**：
   - 抽離共用圖表原語 `src/components/analysis/sections/metricChartPrimitives.tsx`（`renderSimpleBars`、`renderDualLines`、`renderValuationRiver`）。
   - 抽離 6 個無狀態領域 Section：`FinancialStatementsSection.tsx`、`ProfitabilitySection.tsx`、`SolvencySection.tsx`、`GrowthSection.tsx`、`ValuationMultiplesSection.tsx`、`QuantValuationModelsSection.tsx`（每檔均 $\le 450$ 行）。
   - 保留既有 `ForensicWarningSection.tsx` 原路徑零更動，主檔 `AnalysisMetricView.tsx` 收斂至 $\le 200$ 行且 Props 100% 不變。
4. **防復發架構守門與技術債三連清零**：
   - 擴充 `src/engine/architecturalFitnessGuard.test.ts` 新增行數紅線不變量：`DynamicSignalsCard.tsx <= 160 行`、`AnalysisMetricView.tsx <= 220 行`。
   - 標記 Debt 0049、0050、0061 為 `RESOLVED`，更新 `docs/debts/README.md`、`CONTEXT.md`、`README.md` 與 ADR 0241。

---

## Implementation Decisions

1. **SQLite 舊資料庫無損遷移**：`initSqliteLakehouseDb` 建立完 `etf_daily_nav` 後，以 `PRAGMA table_info(etf_daily_nav)` 動態檢查欄位，缺失時自動執行 `ALTER TABLE etf_daily_nav ADD COLUMN ...`，確保既有使用者本地 `.db` 零破壞平滑升級。
2. **Yahoo 台股後綴安全解析**：台股 ETF 呼叫 Yahoo `quoteSummary` 時獨立採用 `formatTwYahooSymbol(symbol, marketHint)`（依市場/代碼規則保留 `.TW` 或 `.TWO`，且支援先查 `.TW` 若 404 自動回退 `.TWO` 覆蓋上櫃債券 ETF），絕不經過美股點號轉連字號函式。
3. **ARINC 661 Zero-Mock 費率守則**：當 Yahoo 對特定冷門台股 ETF 回傳空 `annualReportExpenseRatio` 時，資料庫寫入 `expense_ratio = NULL, expense_source = 'UNAVAILABLE'`，前端誠實顯示 `--`，絕不捏造假費率。
4. **零新增依賴與純 Props 傳遞**：`DynamicSignalsCard` 與 `AnalysisMetricView` 拆解全程僅採用顯式 Props 傳遞，不引入新 Context 或狀態庫，保持 $O(1)$ 渲染開銷與既有 DOM 100% 等價。

---

## Testing Decisions

1. **湖倉 ETF AUM 與 `etf_meta` 縫隙測試（新增 `src/engine/twEtfMetaLakehouse.test.ts`）**：
   - 驗證 `parseTwseEtfNavResponse` 從真實 `all_etf.txt` 結構正確推導 `issuedUnits`、`unitChange` 與 `aumBillion`（例如 `0050`、`00693U`），且在無 `c` 欄位舊格式下優雅回退為 `null` 不報錯。
   - 驗證 `initSqliteLakehouseDb` 對舊版無 `aum_billion` 欄位之 `etf_daily_nav` 表執行冪等遷移成功，且建立 `etf_meta` 表。
   - 驗證 `ingest-tw-etf-meta.cjs` 正確解析 `t187ap47_L`、保留 `.TW`/`.TWO` 後綴查 Yahoo 費率、遇到無費率時寫入 `UNAVAILABLE` 負快取並於 TTL 內命中快取不重複發請求、支援 `AbortSignal`。
   - 驗證 `marketCacheLoader` 與 `aiForceDashboardEngine` 優先使用湖倉實時 `aumBillion` 與 `expenseRatio` 覆寫 `ETF_BASELINE_META`，且無費率冷門 ETF 誠實呈現 `undefined`。
2. **UI 解耦零回歸縫隙測試**：
   - 既有關鍵測試 `DynamicSignalsCard.test.ts`、`AnalysisMetricView.test.tsx`、`StockAnalysisWorkspace.ui.test.tsx`、`aiForceDashboardEngine.test.ts` 100% 通過；補齊 3 個 `DynamicSignals*` 子元件與 `AnalysisMetricView` 各財務 Section 切換驗證。
3. **架構適應度守門與全量回歸**：
   - `architecturalFitnessGuard.test.ts` 驗證 `DynamicSignalsCard.tsx <= 160` 與 `AnalysisMetricView.tsx <= 220`。
   - 全專案 `npm run build` 0 錯誤、`npm run lint:docs` 0 錯誤、核心及全庫 Vitest 100% 綠燈。

---

## Out of Scope

- **Debt 0046（NAS 中央金鑰庫與全端代理網格）**：屬獨立資安與部署架構專案，不納入本 Spec。
- **Debt 0051（未來現金流投影慣性配息動態學習引擎）**：屬獨立股利演算法專案，不納入本 Spec。
- **既有 UI 視覺改版與 API 路由變更**：維持 100% 既有視覺呈現與 REST 介面契約。
