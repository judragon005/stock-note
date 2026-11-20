# ADR 0241: Wave 2 UI 巨石元件解耦與台股全市場 ETF 動態 AUM/費率湖倉閉環

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-20
- **關聯規格 (Spec)**: [docs/specs/0241-wave2-ui-decomposition-and-etf-meta-lakehouse-spec.md](file:///d:/APP/股票紀錄/docs/specs/0241-wave2-ui-decomposition-and-etf-meta-lakehouse-spec.md)
- **關聯 Issue**: `#596`

---

## 1. 背景與問題定義 (Context & Problem Statement)

Wave 1（Spec 0240 / PR #595）完成後，專案剩餘三筆純重構與數據管線技術債（Debt 0049、Debt 0050、Debt 0061 #3）：
1. **台股 ETF 靜態規模基準嚴重失真且冷門標的空白（Debt 0061 #3）**：`ETF_BASELINE_META` 僅靜態寫死 10 檔（`0050` 寫死 `4,380` 億 / `0.43%`、`00679B` 寫死 `2,980` 億），與官方實時規模（`0050` 實測 `21,781.81` 億 / 費率 `0.32%`、`00679B` 實測 `1,538.00` 億）誤差高達 `-80%~+94%`，且冷門期貨/債券 ETF（如 `00693U`）完全顯示 `--`。實測既有 `all_etf.txt` 早已回傳全部 367 檔的發行單位數 `c` 與單日淨申贖單位差 `d`，卻於解析時直接被丟棄。
2. **Card 12 展示職責聚合（Debt 0049）**：`DynamicSignalsCard.tsx`（400 行）將量化進度條、監理警戒標籤與戰術指引混寫於單檔。
3. **深度財報單體巨石膨脹（Debt 0050）**：`AnalysisMetricView.tsx`（2,134 行）同時內嵌 600 行共用 SVG 繪圖原語與 35 個 `subTab` 財務分頁 JSX。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 零新增爬蟲之全市場 367 檔台股 ETF 實時 AUM 衍生
- [sqlite-db-core.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/sqlite-db-core.cjs) 對 `etf_daily_nav` 執行冪等 `ALTER TABLE` 補齊 `issued_units`、`unit_change`、`aum_billion`，並作為單一事實來源（SSOT）建立 `etf_meta` 表。
- [ingest-macro-sentiment.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-macro-sentiment.cjs) 擴充 `parseTwseEtfNavResponse` 自 `all_etf.txt` 既有欄位 `c × f / 1e8` 衍生 367 檔全市場實時 AUM 與初級市場淨申贖流，0 新增 HTTP 請求、0ms 額外延遲。

### 2.2 雙軌 `etf_meta` 與 ARINC 661 Zero-Mock 費率自癒
- 新增 [ingest-tw-etf-meta.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-tw-etf-meta.cjs)：支援 TWSE OpenAPI `t187ap47_L` 批次入庫，以及保留 `.TW`/`.TWO` 後綴（不經美股連字號轉換）之 Yahoo Crumb 按需費率補齊（30D TTL + `UNAVAILABLE` 負快取 + `AbortSignal`）。
- 經 [on-demand-backfill-orchestrator.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/on-demand-backfill-orchestrator.cjs)、[vite-market-middleware.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs)、[marketCacheLoader.ts](file:///d:/APP/股票紀錄/src/engine/marketCacheLoader.ts) 與 [aiForceDashboardEngine.ts](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts) 端到端貫通，嚴格優先採用湖倉實時 `aumBillion`/`expenseRatio`，查無費率者誠實呈現 `undefined`。

### 2.3 ARINC 661 純展示分區隔離（Debt 0049 & Debt 0050）
- `DynamicSignalsCard.tsx`（400 行 ➔ 147 行）拆出 `DynamicSignalsScoreBar`、`DynamicSignalsRegulatoryLayer`、`DynamicSignalsTacticalAdvice` 於 `src/components/aiForceDashboard/cards/dynamicSignals/`，原匯出 API 100% 不變。
- `AnalysisMetricView.tsx`（2,134 行 ➔ 190 行）抽離 `sections/metricChartPrimitives.tsx` 與 6 個領域 Section（`FinancialStatementsSection`、`ProfitabilitySection`、`SolvencySection`、`GrowthSection`、`ValuationMultiplesSection`、`QuantValuationModelsSection`），保留既有 `ForensicWarningSection.tsx` 原路徑與全部 Props 契約。

### 2.4 防復發架構適應度守門擴充
- [architecturalFitnessGuard.test.ts](file:///d:/APP/股票紀錄/src/engine/architecturalFitnessGuard.test.ts) 新增不變量 5：機械化鎖定 `DynamicSignalsCard.tsx <= 160 行`、`AnalysisMetricView.tsx <= 220 行` 與 `etf_meta` DDL 僅歸屬 `sqlite-db-core.cjs`。

---

## 3. 影響與驗證 (Consequences & Verification)

- **測試與建置**：新增 [twEtfMetaLakehouse.test.ts](file:///d:/APP/股票紀錄/src/engine/twEtfMetaLakehouse.test.ts) 全數通過，既有 `DynamicSignalsCard.test.ts`（7/7）、`AnalysisMetricView.test.tsx`（11/11）、`StockAnalysisWorkspace` 套件（9/9）、`aiForceDashboardEngine.test.ts`（41/41）與 `architecturalFitnessGuard.test.ts`（5/5）100% 綠燈；`npm run build` 0 錯誤。
- **技術債看板**：Debt `0049`、`0050`、`0061` 三筆同步標記 `RESOLVED`，全專案純重構與資料管線債正式歸零。
