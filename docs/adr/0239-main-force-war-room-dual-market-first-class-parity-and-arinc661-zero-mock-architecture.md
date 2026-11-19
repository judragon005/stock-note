# ADR 0239: 主力戰情室 5.0 — 台美雙市場一等公民對等架構、統一市場能力適配層與 ARINC 661 零造假閘門

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-19
- **關聯規格 (Spec)**: [docs/specs/0239-main-force-war-room-dual-market-parity-and-21-card-zero-defect-spec.md](file:///d:/APP/股票紀錄/docs/specs/0239-main-force-war-room-dual-market-parity-and-21-card-zero-defect-spec.md)
- **關聯 Issue**: `#592`

---

## 1. 背景與問題定義 (Context & Problem Statement)

「主力戰情室 (`AiForceDashboardView`)」原先存在五大結構性斷層：
1. **雙市場語意劫持與評分數學封殺**：`usMacroData` 未依市場隔離導致台股遭美股宏觀視圖劫持；美股未接入 `usMicrostructure` 且以股數比對台股張數門檻（1,000 倍量綱誤差），造成美股健康度鎖死 `50%`、動態信號封頂 `55` 分與主力總評判退化為 `+0 張`。
2. **台股採集器靜默失效**：`TWTB4U` 現股當沖率漏讀 `tables[0].data`、TAIFEX 期貨未平倉 Big5 亂碼、缺少台股 P/C Ratio 與全市場融資維持率、TPEx 歷史覆寫污染與 2.5s 按需補齊阻塞。
3. **美股基本面/13F/ETF 管線真空**：缺乏本地美股估值與 13F/Short Float 持久化表、SEC EDGAR 僅硬編碼 18 檔 CIK 且瀏覽器直傳違規 `User-Agent`。
4. **資產分類衝突與路由攔截**：3 套衝突之 ETF 判斷誤殺金融股 (`2881`/`2882`)；中介層未支援點號代碼 (`BRK.B`) 且每請求重開資料庫。
5. **Zero-Mock 漏洞與互動死鎖**：`TaskViewsSwitcher` 點擊攔截死鎖；預設報表與子引擎殘留假數值（`-64張`、`2131`、`2400~1600`、`60k~0k`）於載入與 `<5D` 狀態外洩。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 Dual-Market First-Class Parity（台美雙市場一等公民對等架構）
- 嚴格隔離 `twMacroData` 與 `usMacroData`（依 `market` 專屬寫入），全域貫通 `colorTheme` 與 `market` 至全 21 卡、4 大任務子頁籤 (`TaskPanels.tsx`) 與 HTML 匯出 (`exportReportPipeline.ts`)。
- 中介層 ([vite-market-middleware.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs)) 改採單例快取與點號代碼路由（支援 `BRK.B` ↔ `BRK-B`），並將按需歷史補齊首屏等待上限收縮至 `300ms`（`ON_DEMAND_TIMEOUT_MS = 300`）搭配前端受控輪詢。
- 新增 `us_fundamentals_daily` 資料表 ([us-fundamentals-ingestion.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/us-fundamentals-ingestion.cjs)) 整合 Yahoo `quoteSummary` Crumb（24H TTL + 429 熔斷），並於本地中介層建置 SEC EDGAR 代理路由 `/api/market/sec-edgar/companyfacts/:symbol` ([sec-edgar-proxy.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/sec-edgar-proxy.cjs)) 透過 `company_tickers.json` 動態解析全美股 CIK。

### 2.2 Unified Market Capability Adapter（統一市場能力適配層）
- 將美股 `usMicrostructure`（MFI/OBV/RVOL/VWAP 乖離 + 13F/Short Float 權重）與美股股數/成交額流動性門檻對等接入 [aiForceDashboardEngine.ts](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts)、[riskSpiderEngine.ts](file:///d:/APP/股票紀錄/src/engine/riskSpiderEngine.ts)、[aiConfidenceEngine.ts](file:///d:/APP/股票紀錄/src/engine/aiConfidenceEngine.ts) 與 [dayTradeRiskEngine.ts](file:///d:/APP/股票紀錄/src/engine/dayTradeRiskEngine.ts)，徹底解除美股評分封殺。

### 2.3 Canonical Asset Classification SSOT（權威資產型態單一分類來源）
- 收斂全專案衝突之 ETF 判斷至 [assetClassifier.ts](file:///d:/APP/股票紀錄/src/engine/assetClassifier.ts) 之 `resolveAssetClass` / `isCanonicalEtfSymbol`：優先信任 `symbols_meta.type === 'ETF'`，移除 `/(富邦|國泰)/` 誤殺規則，涵蓋全量台股主動/債券 ETF (`00403A`, `00679B`) 與主流美股 ETF (`VT`, `SPY`, `QQQ`)。

### 2.4 ARINC 661 Zero-Mock Loading & Pending Gate（零幻覺載入與待命硬閘門）
- 清除預設報表、子引擎與 `ETF_BASELINE_META` 內之靜態假數值與美股靜態 ETF 回退。
- 歷史有效日 K `< 5` 根一律維持 `isDataPending = true`，於 [AiForceDashboardView.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx) 全面隔離 Executive Verdict Strip 與 `TASK_2~5` 子頁籤，並於 [WarRoomPromptCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/WarRoomPromptCard.tsx) 物理鎖定複製按鈕與 `currentPrice > 0` 停損監控門禁。

---

## 3. 影響與驗證 (Consequences & Verification)

- **驗證覆蓋**：由 [t16DualMarketFourQuadrantE2E.test.tsx](file:///d:/APP/股票紀錄/src/engine/t16DualMarketFourQuadrantE2E.test.tsx) 覆蓋台美四象限（`2330/2881`、`0050/00403A`、`NVDA/SOUN`、`VT`）與 `< 5D / 0D` 邊界，搭配 T01–T15 獨立單元/整合測試與 `npm run build` 零錯誤驗證。
- **後續追蹤**：4 項非阻斷 Fowler Code Smells 已建檔至 [docs/debts/0062-war-room-dual-market-code-smells-consolidation.md](file:///d:/APP/股票紀錄/docs/debts/0062-war-room-dual-market-code-smells-consolidation.md)。
