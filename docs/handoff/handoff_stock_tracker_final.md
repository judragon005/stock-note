# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-09 15:46 (UTC+8)  
> **當前最新里程碑**：
> - **V8.30.0 Yahoo Finance 報價昨日收盤價與今日漲跌幅精準修正**（徹底隔離 `chartPreviousClose` 歷史圖表起算價干擾，以官方即時差值優先與成交價扣除價差精確倒推昨收，實盤數值 100% 吻合券商 APP）。
> - **V8.29.0 肌肉書僮風益比全面統一專業 R 倍數規範**（全系統統一為國際專業交易標準之 `${rrRatio}R`，徹底消滅 `1 :` 與 `R` 混搭語病與上下方向矛盾）。
> - **V8.28.0 肌肉書僮布林帶寬審查硬門檻 (Bandwidth <= 8%)、作戰看板目標價對齊與美股 US$ 貨幣別標示**。
> - **V8.27.0 肌肉書僮今日核心作戰指令 (Top 3 買進先鋒 vs 在庫持股限定賣出) 與自適應色彩主題**。
> - **V8.26.0 肌肉書僮目標池滿編規格化與名實相符擴充**（臺灣 50 滿編 50 檔、台股焦點滿編 30 檔、美股巨頭 50 檔與焦點 30 檔）。
> - **V8.25.0 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速**（IndexedDB 快取秒開、7 天短期增量請求、頂部就緒度進度條）。
> - **V8.14.0 ~ V8.24.0 宏觀戰情室、黑天鵝保證金壓力測試矩陣、雙動能輪動與量化防護網**。
> - **V7.0.0 ~ V8.13.0 籌碼動態星圖 (Smart Money Flow)、資產再平衡、法定假日交割日曆與雙軌批次會計**。
> **品質狀態**：全量單元測試 **655/655 通過 (100% Passed / 57 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **測試套件狀態**：**655/655 通過** (57 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V8.30.0**
- **核心架構風格**：純前端單頁應用 (SPA) + 0 外部後端相依 + 離線優先 (Offline-First) + 原生 IndexedDB 本地持久化 + 多節點 CORS 代理池。
- **隱私安全**：所有交易記帳、持倉、質押金流與自訂 API Key 均留存於本地瀏覽器儲存區（IndexedDB & LocalStorage），嚴格受 `.gitignore` 隔離保護，杜絕個人財務隱私推播至 GitHub 遠端。

---

## 🏛️ 2. 全系統數據流動與架構藍圖 (Architecture & Data Flow)

```mermaid
graph TD
    subgraph External_Data_Sources [外部數據來源 (無伺服器/純前端直連)]
        TWSE[台灣證交所 / 櫃買中心 TWSE/TPEx OpenAPI]
        YF[Yahoo Finance Chart & Quote API]
        CORS[多節點 CORS 代理池 & 指數退避重試]
    end

    subgraph Core_Engines [核心計算引擎層 (純函數 / 100% TDD)]
        P_ENG[即時報價引擎 priceFetcher]
        H_ENG[日 K 增量抓取 historicalPriceFetcher / historicalOhlcvBackfill]
        M_ENG[肌肉書僮動能量化引擎 muscleBookerEngine]
        C_ENG[現金在途與購買力引擎 cashLedgerEngine]
        S_ENG[籌碼與聰明錢引擎 smartMoneyEngine / Fetcher]
        CA_ENG[公司行動掃描引擎 corporateActionScanner]
        CALC_ENG[雙軌損益與批次會計 calculator / lotEngine]
        XIRR_ENG[年化報酬率引擎 xirrCalculator]
        WAR_ENG[宏觀與黑天鵝矩陣 macroAdvisor / marginStressMatrix]
    end

    subgraph Local_Storage [本地持久化層 (離線秒開)]
        IDB[(原生 IndexedDB: StockTrackerDB 9 大 Stores)]
        LS[(LocalStorage: 偏好設定 / 報價備援快取)]
    end

    subgraph UI_Workspaces [前端工作台視圖 (WorkspaceTabs)]
        W1[持股總覽 & 損益板塊 HoldingsTable / Treemap]
        W2[肌肉書僮動能雷達 MuscleBookerWorkspace]
        W3[籌碼與聰明錢星圖 ChipsWorkspace]
        W4[現金與借貸工作台 CashLedgerWorkspace]
        W5[宏觀戰情室 WarRoomWorkspace]
        W6[資產配置與再平衡 RebalancingView]
        W7[股利日誌與稅務 DividendLogView]
        W8[系統設定與時光機快照 SettingsWorkspace]
    end

    TWSE --> CORS --> CA_ENG & S_ENG & P_ENG
    YF --> CORS --> P_ENG & H_ENG
    P_ENG & H_ENG --> IDB
    IDB --> M_ENG & CALC_ENG & C_ENG & S_ENG & XIRR_ENG
    Core_Engines --> UI_Workspaces
```

---

## 🖥️ 3. 九大核心工作台視圖索引 (Workspaces Map)

專案採用分頁標籤導航體系 (`WorkspaceTabs.tsx`)，各工作台職責清晰且解耦：

| 工作台名稱 | 核心元件檔案 | 核心功能與使用者價值 |
| :--- | :--- | :--- |
| **1. 持股總覽 (Holdings)** | [`HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx)<br>[`SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx)<br>[`TreemapChart.tsx`](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx)<br>[`AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx)<br>[`LotsBreakdownModal.tsx`](file:///d:/APP/股票紀錄/src/components/LotsBreakdownModal.tsx) | 台美股多資產即時盈虧、加權持有成本、個股技術訊號膠囊（MA/RSI/MACD/乖離率）、多幣別市值、資產板塊樹狀圖 (Treemap)、個別批次明細 (Lots) 與虧損收割試算。 |
| **2. 肌肉書僮動能雷達 (Muscle Booker)** | [`MuscleBookerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MuscleBookerWorkspace.tsx) | 達瓦斯箱體與 20MA 扣抵共振、**今日核心作戰指令 (Top 3 買進先鋒 vs 在庫限定賣出)**、三色實戰操盤導航儀、布林帶寬門檻 (<= 8%)、統一專業 R 倍數制 (`7.9R`)、本地日 K 離線秒開。 |
| **3. 籌碼與聰明錢星圖 (Chips & Smart Money)** | [`ChipsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/ChipsWorkspace.tsx)<br>[`SmartMoneyBubbleChart.tsx`](file:///d:/APP/股票紀錄/src/components/SmartMoneyBubbleChart.tsx) | 0 外部圖表純 SVG 渲染、三大法人買賣超、美股 20 日 CMF 佳慶資金流、四象限標準化散佈圖、彗星位移軌跡 (Motion Trails)、小白速讀診斷。 |
| **4. 現金與借貸工作台 (Cash & Loans)** | [`CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx)<br>[`PendingSettlementCard.tsx`](file:///d:/APP/股票紀錄/src/components/PendingSettlementCard.tsx)<br>[`CashTransactionModal.tsx`](file:///d:/APP/股票紀錄/src/components/CashTransactionModal.tsx)<br>[`LoanModal.tsx`](file:///d:/APP/股票紀錄/src/components/LoanModal.tsx) | 三層可用性核算 (已結算現金/在途交割/真實購買力)、T+2 在途時序排程面板、質押擔保品維持率追蹤與借貸規費損益結算。 |
| **5. 宏觀戰情室 (War Room)** | [`WarRoomWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/WarRoomWorkspace.tsx) | 全球總經情勢監控、黑天鵝保證金極限壓力測試矩陣（維持率敏感度階梯）、雙動能跨市場輪動建議、避險防禦策略指引。 |
| **6. 目標配置與再平衡 (Rebalancing)** | [`RebalancingView.tsx`](file:///d:/APP/股票紀錄/src/components/RebalancingView.tsx) | 目標資產權重偏離度診斷、最小交易摩擦再平衡試算、智慧加減碼分配建議。 |
| **7. 股利日誌與稅務 (Dividend Log)** | [`DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx)<br>[`CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx) | 除權息時序分離日曆（除息日 vs 發放日）、單筆二代健保 20,000 元扣繳核算、全市場官方除權息/減資線上即時掃描補登。 |
| **8. 交易歷史與明細 (Trade History)** | [`TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx)<br>[`TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx)<br>[`EnhancedImportModal.tsx`](file:///d:/APP/股票紀錄/src/components/EnhancedImportModal.tsx) | 多券商帳戶分流管理、CSV 智慧匯入預覽與欄位映射、歷史交易去重校驗。 |
| **9. 設定與時光機快照 (Settings & Time Machine)** | [`SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx)<br>[`FrictionCenterModal.tsx`](file:///d:/APP/股票紀錄/src/components/FrictionCenterModal.tsx) | 券商手續費/證交稅折扣設定、摩擦成本中心、IndexedDB 10 份自動快照輪替、鎖定快照保護、一鍵還原二次確認、全庫 JSON 匯入匯出。 |

---

## 📂 4. 核心實體模組與單元測試對照 (Codebase & Test Seams)

| 核心職責 | 核心實體代碼 | 單元測試檔案 | 測試案例數與涵蓋範疇 |
| :--- | :--- | :--- | :--- |
| **肌肉書僮量化引擎** | [`src/engine/muscleBookerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/muscleBookerEngine.ts) | `src/engine/muscleBookerEngine.test.ts` | **14 tests**：達瓦斯箱體、20MA 扣抵、帶寬收斂門檻、R 倍數制、Top 3 買進、在庫賣出。 |
| **市場即時報價引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | `src/engine/priceFetcher.test.ts` | **24 tests**：Yahoo Chart API 昨收隔離、差值倒推、匯率抓取、台美股延遲報價。 |
| **日 K 歷史增量回補** | [`src/engine/historicalPriceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/historicalPriceFetcher.ts)<br>[`src/engine/historicalOhlcvBackfill.ts`](file:///d:/APP/股票紀錄/src/engine/historicalOhlcvBackfill.ts) | `src/engine/historicalPriceFetcher.test.ts`<br>`src/engine/historicalOhlcvBackfill.test.ts` | **8 tests**：短期 7 天增量回補、180 天受控並發隊列 (Concurrency=3)、多節點輪替。 |
| **現金、在途與購買力** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | `src/engine/cashLedgerEngine.test.ts` | **29 tests**：三層可用性核算、法定交割假日排除、在途分組、質押可用資產。 |
| **原生 IndexedDB 儲存庫** | [`src/utils/db.ts`](file:///d:/APP/股票紀錄/src/utils/db.ts) | `src/utils/db.test.ts` | **9 tests**：原生 Promise 封裝 9 大 Stores、CRUD、事務、快照輪替淘汰。 |
| **公司行動智慧掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | `src/engine/corporateActionScanner.test.ts` | **22 tests**：TWSE 除權息/減資官方預告、虛擬時序動態配股、二代健保精確扣繳。 |
| **籌碼量化與聰明錢** | [`src/engine/smartMoneyEngine.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyEngine.ts)<br>[`src/engine/smartMoneyFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyFetcher.ts) | `src/engine/smartMoneyEngine.test.ts`<br>`src/engine/smartMoneyFetcher.test.ts` | **25 tests**：TWSE T86 官方法人日報解析、美股 20 日 CMF 計算、四象限無量綱標準化。 |
| **黑天鵝保證金壓力測試** | [`src/engine/marginStressMatrixEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.ts)<br>[`src/engine/marginStressEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressEngine.ts) | `src/engine/marginStressMatrixEngine.test.ts`<br>`src/engine/marginStressEngine.test.ts` | **12 tests**：斷頭維持率矩陣、極端跌幅情境、質押擔保品受壓預警。 |
| **投資組合量化績效指標** | [`src/engine/quantMetrics.ts`](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts) | `src/engine/quantMetrics.test.ts` | **20 tests**：夏普值、索提諾值、最大回撤 MDD、大盤基準 Beta 對比。 |
| **雙動能跨市場輪動** | [`src/engine/dualMomentumEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.ts) | `src/engine/dualMomentumEngine.test.ts` | **7 tests**：絕對動能門檻、相對動能評級、避險資產切換。 |
| **雙軌損益與會計核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts)<br>[`src/engine/lotEngine.ts`](file:///d:/APP/股票紀錄/src/engine/lotEngine.ts) | `src/engine/calculator.test.ts`<br>`src/engine/lotEngine.test.ts` | **35+ tests**：加權平均與 FIFO 雙軌記帳、個別批次會計、已實現與未實現損益。 |
| **XIRR 年化報酬求解器** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | `src/engine/xirrCalculator.test.ts` | **11 tests**：0 依賴牛頓拉弗森法與二分法混合求解器、30 天平滑防護。 |
| **官方股票全市場字典** | [`src/engine/stockDictionarySync.ts`](file:///d:/APP/股票紀錄/src/engine/stockDictionarySync.ts)<br>[`src/engine/stockNameResolver.ts`](file:///d:/APP/股票紀錄/src/engine/stockNameResolver.ts) | `src/engine/stockDictionarySync.test.ts`<br>`src/engine/stockNameResolver.test.ts` | **8 tests**：TWSE / TPEx 上市上櫃興櫃官方清單自動抓取與補全解析。 |
| **資產再平衡優化器** | [`src/engine/rebalancingEngine.ts`](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts) | `src/engine/rebalancingEngine.test.ts` | **7 tests**：權重偏離度量化、低摩擦資金再配置。 |
| **法定假日結算日曆** | [`src/engine/holidayCalendar.ts`](file:///d:/APP/股票紀錄/src/engine/holidayCalendar.ts) | `src/engine/holidayCalendar.test.ts` | **11 tests**：台股休市行事曆、T+2 交割日推算、週末跨日處理。 |
| **個股技術指標共振** | [`src/engine/technicalIndicatorEngine.ts`](file:///d:/APP/股票紀錄/src/engine/technicalIndicatorEngine.ts) | `src/engine/technicalIndicatorEngine.test.ts` | **10 tests**：MA5/10/20/60、RSI、MACD、布林通道與乖離率共振。 |
| **CSV 智慧清洗與去重** | [`src/engine/csvSanitizer.ts`](file:///d:/APP/股票紀錄/src/engine/csvSanitizer.ts)<br>[`src/engine/tradeDeduplicator.ts`](file:///d:/APP/股票紀錄/src/engine/tradeDeduplicator.ts) | `src/engine/csvSanitizer.test.ts`<br>`src/engine/tradeDeduplicator.test.ts` | **22 tests**：各大券商 CSV 格式標準化、重複交易比對防禦。 |
| **歷史淨值 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | `src/engine/historicalNav.test.ts` | **9 tests**：歷史每日資產淨值曲線回溯、遇假日 Forward-Fill。 |

---

## 🏛️ 5. 架構決策紀錄索引 (Recent ADR Highlights)

- [`ADR-0111`](file:///d:/APP/股票紀錄/docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md)：V8.30.0 修復 Yahoo 報價誤用圖表昨收導致漲跌幅與今日損益失真。
- [`ADR-0110`](file:///d:/APP/股票紀錄/docs/adr/0110-muscle-booker-risk-reward-r-multiple-format.md)：V8.29.0 肌肉書僮風益比全面統一專業 R 倍數規範（消除 `1 :` 與 `R` 混搭）。
- [`ADR-0109`](file:///d:/APP/股票紀錄/docs/adr/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency.md)：V8.28.0 肌肉書僮布林帶寬硬門檻 (Bandwidth <= 8%)、作戰看板目標價與美股 US$ 標示。
- [`ADR-0108`](file:///d:/APP/股票紀錄/docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md)：V8.27.0 肌肉書僮今日核心作戰指令與自適應色彩主題。
- [`ADR-0107`](file:///d:/APP/股票紀錄/docs/adr/0107-muscle-booker-full-universe-top30-top50-alignment.md)：V8.26.0 肌肉書僮目標池滿編規格化（臺灣 50 滿編 50 檔等）。
- [`ADR-0106`](file:///d:/APP/股票紀錄/docs/adr/0106-muscle-booker-incremental-backfill-and-local-cache.md)：V8.25.0 肌肉書僮日 K 受控並發增量回補與本地持久化加速。
- 完整歷史決策請參閱 [`docs/adr/`](file:///d:/APP/股票紀錄/docs/adr/)。

---

## ⚡ 6. 常用驗證與維護指令 (Verification Commands)

```bash
# 1. 執行全量單元測試 (確保 655/655 100% 綠燈通過)
npm test

# 2. 執行 TypeScript 嚴格型別檢查 (確保 0 錯誤)
npx tsc --noEmit

# 3. 執行 Vite 生產環境建置 (確保順利產出 dist 包)
npm run build

# 4. 本地啟動前端開發伺服器
npm run dev
```
