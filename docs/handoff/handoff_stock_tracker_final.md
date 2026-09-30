# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-30 16:50 (UTC+8)  
> **當前最新里程碑**：
> - **V8.65.0 全市場歷史日 K 本地緊湊快取注入 IndexedDB 與 Yahoo 代理防限流降級**（ADR 0154, Spec 0154, Issue #136）：
>   - **按需緊湊歷史日 K 提取與單例記憶體快取**：實現 `loadSymbolCompactHistory`，按需從 `tw_market_ohlcv_compact.json` (17.5 MB) 解析特定標的並格式化為標準 `DailyCandle`，模組級單例 Promise 快取防重複請求。
>   - **歷史日 K 與當日收盤無縫合流與防限流降級**：在 `vite.config.ts` 補齊桌面瀏覽器標頭，當 Yahoo API 429 失敗且本地快取不足時，自動調用本地 compact 歷史日 K 與每日 16:00 盤後更新之 `tw_market_summary.json` 當日收盤價，透過 `mergeDailyCandles` 去重升冪合併，重新計算指標並持久化沉澱至 IndexedDB，100% 杜絕圖表全空破圖。
>   - **無效標的代碼智慧診斷與指引**：在戰情室精確標註「⚠️ 查無此台股標的代碼，請確認代碼是否輸入正確（如 00403A、2330）」，消除使用者對系統故障之猜忌。
> - **V8.64.0 AI 主力戰情室單一真實數據來源校準、淘汰衝突硬編碼假資料與優雅 Empty State**（ADR 0152, Spec 0152, Issue #133）。
> **品質狀態**：全量單元測試 **1,213/1,213 通過 (100% Passed / 141 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過 (11.15s)。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`feature/136-compact-history-indexeddb-hydration`
- **單元測試套件**：**1,213/1,213 通過 (141 test suites / 100% 綠燈)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包順利通過，0 錯誤
- **當前釋出版本**：**V8.65.0**
- **工作區與分支整潔度**：工作區 100% clean，本地過期 feature 分支已全數刪除，專案臨時備份檔案已全量清理。
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens 均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `aiForceDashboardEngine.ts`、`volumeProfileEngine.ts`、`forecastConeEngine.ts`、`keyMetricsEngine.ts`、`taiwanFinancialPipeline.ts`、`cryptoEngine.ts`、`secureProxyRouter.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化，嚴格遵守每小時 5 次推播節流與 CI 防濫用原則。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及股價、股利發放日、除息日、本益比、殖利率與財務報表資料。
   - 核心準則：實施即時 API 與官方發放日查表比對，拒絕靜態假資料與幻覺數值，堅持第一性原理推導真實數據與時間軸。

---

## 🏗️ 3. 規格、架構決策與版本鏡像對照 (Specs, ADRs & Local Tickets)

| 規格編號 (PRD) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 關聯 Issue / PR | 版本 | 核心主題 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`Spec 0149`](file:///d:/APP/股票紀錄/docs/specs/0149-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements-spec.md) | [`ADR 0149`](file:///d:/APP/股票紀錄/docs/adr/0149-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements.md) | [`.scratch/v8.62.0-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.62.0-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements/issues/) | Issue #125 / PR #126 | V8.62.0 | 全市場排程工作目錄絕對錨定、空數據防清空守門員、搜尋代碼彈性防截斷、Tooltip Portal 穿透、Card 04 籌碼熱區圖自適應填滿、Card 05 風險雷達圖半徑擴大與大字級 |
| [`Spec 0148`](file:///d:/APP/股票紀錄/docs/specs/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair-spec.md) | [`ADR 0148`](file:///d:/APP/股票紀錄/docs/adr/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair.md) | [`.scratch/v8.61.0-ai-force-cards-visual-fidelity-and-popover-boundary-repair/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.61.0-ai-force-cards-visual-fidelity-and-popover-boundary-repair/issues/) | Issue #121 / PR #122 | V8.61.0 | 卡片 04/02/06/07 視覺動態連動、自適應刻度與熱力矩陣、三態橫幅、扇形預測錐與山脈堆疊、字典小方塊抗裁切防遮蔽 |
| [`Spec 0145`](file:///d:/APP/股票紀錄/docs/specs/0145-ai-force-dashboard-responsive-bento-grid-and-header-redesign-spec.md) | [`ADR 0145`](file:///d:/APP/股票紀錄/docs/adr/0145-ai-force-dashboard-responsive-bento-grid-and-header-redesign.md) | [`.scratch/v8.58.0-ai-force-bento-grid-and-header-redesign/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.58.0-ai-force-bento-grid-and-header-redesign/issues/) | Issue #112 / PR #113 | V8.58.0 | 雙層全繁中即時行情列、01 主 K 線獨立全寬滿版、01➔18 內容導向自然流 Bento-Grid、圖表防碰撞修復 |
| [`Spec 0144`](file:///d:/APP/股票紀錄/docs/specs/0144-ai-force-cards-06-07-photo-alignment-spec.md) | [`ADR 0144`](file:///d:/APP/股票紀錄/docs/adr/0144-ai-force-cards-06-07-photo-alignment.md) | [`.scratch/v8.57.0-ai-force-cards-06-07-photo-alignment/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.57.0-ai-force-cards-06-07-photo-alignment/issues/) | Issue #109 / PR #110 | V8.57.0 | 卡片 06 雙色發散錐與價格軸、卡片 07 多時段多層波形堆疊圖、卡片 09 籌碼換手率校準 |
| [`Spec 0143`](file:///d:/APP/股票紀錄/docs/specs/0143-ai-force-institutional-chips-and-task-views-live-sync-spec.md) | [`ADR 0143`](file:///d:/APP/股票紀錄/docs/adr/0143-ai-force-institutional-chips-and-task-views-live-sync.md) | [`.scratch/v8.56.0-ai-force-institutional-chips-and-task-views/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.56.0-ai-force-institutional-chips-and-task-views/issues/) | Issue #103, #105, #107 | V8.56.0 | 三大法人真實籌碼管線、中間量化卡片群加權動態化、底部 5 大任務視圖全景連動 |
| [`Spec 0140`](file:///d:/APP/股票紀錄/docs/specs/0140-ai-force-decision-dashboard-spec.md) | [`ADR 0140`](file:///d:/APP/股票紀錄/docs/adr/0140-ai-force-decision-dashboard-architecture.md) | [`.scratch/v8.53.0-ai-force-decision-dashboard/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.53.0-ai-force-decision-dashboard/issues/) | Issue #93 | V8.53.0 | 18 張卡片 Bento-Grid 網格、原生向量 SVG 圖表、5 大任務視圖、5 大量化匯出管線 |
| [`Spec 0139`](file:///d:/APP/股票紀錄/docs/specs/0139-unified-full-payoff-and-engine-dry-refactor-spec.md) | [`ADR 0139`](file:///d:/APP/股票紀錄/docs/adr/0139-unified-full-payoff-and-engine-dry-refactor.md) | [`.scratch/v8.52.0-unified-full-payoff-and-dry-engine/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.52.0-unified-full-payoff-and-dry-engine/issues/) | Issue #25 / PR #91 | V8.52.0 | 質押借貸 FULL_PAYOFF 統一委託 applyDebtRepayment 引擎與純函式 DRY 閉環 |
| [`Spec 0150`](file:///d:/APP/股票紀錄/docs/specs/0150-pending-market-close-pre-close-anchor-and-alert-spec.md) | [`ADR 0150`](file:///d:/APP/股票紀錄/docs/adr/0150-pending-market-close-pre-close-anchor-and-alert.md) | [`.scratch/v1.150/issues/`](file:///d:/APP/股票紀錄/.scratch/v1.150/issues/) | Issue #128 / PR #129 | V8.52.0 | 未收盤標的前日收盤數據定錨與雙層警示機制 (台股15:00 / 美股08:00) |
| [`Spec 0138`](file:///d:/APP/股票紀錄/docs/specs/0138-header-realtime-clock-and-accurate-dividend-reconciliation-spec.md) | [`ADR 0138`](file:///d:/APP/股票紀錄/docs/adr/0138-header-realtime-clock-and-accurate-dividend-reconciliation.md) | [`.scratch/v8.51.0-header-clock-and-dividend-reconciliation/`](file:///d:/APP/股票紀錄/.scratch/v8.51.0-header-clock-and-dividend-reconciliation/) | Issue #87 / PR #88 | V8.51.0 | 頂部 Header 即時盤中時鐘與股利收益對帳精準化 |
| [`Spec 0137`](file:///d:/APP/股票紀錄/docs/specs/0137-dividend-gross-reconciliation-smart-boundary-and-reconciliation-wizard-spec.md) | [`ADR 0137`](file:///d:/APP/股票紀錄/docs/adr/0137-dividend-gross-reconciliation-smart-boundary-and-reconciliation-wizard.md) | [`.scratch/v8.50.0-dividend-gross-reconciliation-and-tooltip-boundary/`](file:///d:/APP/股票紀錄/.scratch/v8.50.0-dividend-gross-reconciliation-and-tooltip-boundary/) | Issue #83 / PR #84, #85 | V8.50.0 | 月度長條圖 Tooltip 邊界避讓、券商 APP 應發毛額對帳雙軌切換、官方發放日對照庫 |
| [`Spec 0136`](file:///d:/APP/股票紀錄/docs/specs/0136-dividend-log-view-pay-date-aggregation-and-contributor-ranking-spec.md) | [`ADR 0136`](file:///d:/APP/股票紀錄/docs/adr/0136-dividend-log-view-pay-date-aggregation-and-contributor-ranking.md) | [`.scratch/v8.49.0-dividend-pay-date-aggregation-and-contributor-ranking/`](file:///d:/APP/股票紀錄/.scratch/v8.49.0-dividend-pay-date-aggregation-and-contributor-ranking/) | Issue #81 / PR #82 | V8.49.0 | 實質入帳日時序 SSOT 對齊、毛淨額對帳、貢獻榜過濾與明細表年度連動 |
| [`Spec 0135`](file:///d:/APP/股票紀錄/docs/specs/0135-market-full-history-backfill-and-reconciliation-pipeline-spec.md) | [`ADR 0135`](file:///d:/APP/股票紀錄/docs/adr/0135-market-full-history-backfill-and-reconciliation-pipeline.md) | [`.scratch/v8.48.0-market-full-history-backfill-and-reconciliation-pipeline/`](file:///d:/APP/股票紀錄/.scratch/v8.48.0-market-full-history-backfill-and-reconciliation-pipeline/) | Issue #79 / PR #80 | V8.48.0 | 加權指數 7,158 日歷 SSOT 對齊、四層容錯修復、二分搜尋 33 秒極速回補 |
| [`Spec 0134`](file:///d:/APP/股票紀錄/docs/specs/0134-header-sync-status-capsule-redesign-and-settings-windows-tasks-hub-spec.md) | [`ADR 0134`](file:///d:/APP/股票紀錄/docs/adr/0134-header-sync-status-capsule-redesign-and-settings-windows-tasks-hub.md) | [`.scratch/v8.47.1-header-sync-capsule-and-windows-task-hub/`](file:///d:/APP/股票紀錄/.scratch/v8.47.1-header-sync-capsule-and-windows-task-hub/) | Issue #77 / PR #78 | V8.47.1 | Header 狀態膠囊極簡毛玻璃收斂與設定中心 Windows 排程管理中樞 |
| [`Spec 0133`](file:///d:/APP/股票紀錄/docs/specs/0133-scheduled-full-market-batch-sync-and-zero-latency-cache-spec.md) | [`ADR 0133`](file:///d:/APP/股票紀錄/docs/adr/0133-scheduled-full-market-batch-sync-and-zero-latency-cache.md) | [`.scratch/v8.47.0-scheduled-full-market-batch-sync/`](file:///d:/APP/股票紀錄/.scratch/v8.47.0-scheduled-full-market-batch-sync/) | Issue #75 / PR #76 | V8.47.0 | 每日收盤全市場台美股定時同步、本地快取秒讀與零遺漏稽核 |
| [`Spec 0131`](file:///d:/APP/股票紀錄/docs/specs/0131-stock-analysis-growth-river-and-valuation-audit-spec.md) | [`ADR 0131`](file:///d:/APP/股票紀錄/docs/adr/0131-stock-analysis-growth-river-and-valuation-audit.md) | [`.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/`](file:///d:/APP/股票紀錄/.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/) | Issue #61 / PR #62 | V8.46.2 | 成長率基期擴充、毛利離群視覺封頂、向量河流圖與動態流通股數推導 |

---

## 🧩 4. 關鍵核心引擎與組件清單 (Key Engines & Components)

### 4.1 股息與時序核心模組 (`src/engine/`)

| 模組 | 檔案路徑 | 職責與關鍵演算法 | 測試覆蓋 |
| :--- | :--- | :--- | :--- |
| **股利數據聚合引擎** | [`src/engine/dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) | 導出 `getEffectiveDividendPayDate(trade)` 作為時序 SSOT，支援標的官方發放日對照，計算年度應發毛額、實領淨額、扣稅額與 1~12 月月度分佈。 | 9 tests |
| **應收股利與發放日引擎** | [`src/engine/receivableDividendEngine.ts`](file:///d:/APP/股票紀錄/src/engine/receivableDividendEngine.ts) | 內建 `OFFICIAL_TW_PAY_DATE_MAP` 官方常態發放日快取對照庫，`estimatePaymentDate` 依標的與除息日精確比對，推估天數無縫回退。 | 12 tests |
| **量化關鍵指標引擎** | [`src/engine/keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts) | 動態流通股數推導（`capitalStock / 10`）、近 4 季 TTM FCF Yield 報酬率、DCF 現金流折現每股內在價值、Piotroski F-Score 九項指標評分。 | 6 tests |
| **指標審計測試套件** | [`src/engine/analysisMetricsAudit.test.ts`](file:///d:/APP/股票紀錄/src/engine/analysisMetricsAudit.test.ts) | 5 大核心金融審計檢驗：基期缺失平整化、毛利暴衝真實性與離群高度維持、動態股數 >70 億股、FCF Yield 合理區間、DCF 25~55 元。 | 9 tests |
| **市場結算狀態與定錨引擎** | [`src/engine/marketSettlementEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marketSettlementEngine.ts) | Asia/Taipei 時區感知純函式，判定台股 15:00 籌碼發布門檻與美股 08:00 結算門檻，未收盤時自適應回退前一收盤交易日定錨日。 | 8 tests |
| **AI 主力戰情室決策報告引擎** | [`src/engine/aiForceDashboardEngine.ts`](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts) | 支援 `basePrice` 與 `realtimeQuote` 動態注入與自適應回退，杜絕 2290 寫死假資料，實現 18 張卡片與即時行情等比動態同步。 | 13 tests |

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **股利收益日誌與現金流** | [`src/components/DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx) | `calculateMonthTooltipAlign` 智慧避讓演算法（1~2月靠左、10~12月靠右、3~9月居中）、KPI 首卡券商對帳毛淨額雙軌切換、明細表標的對帳小計卡片網格與單點過濾。 |
| **個股分析工作台** | [`src/components/analysis/StockAnalysisWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) | 整合 6 大核心指標分頁（獲利力、安全性、成長力、現金流、價值評估、公開股利），提供股票代碼搜尋、快顯膠囊、自適應響應式佈局。 |
| **指標圖表與河流圖** | [`src/components/analysis/AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx) | 向量 SVG 估值河流圖引擎（`<polygon>` 漸層色帶 + 通道邊界 + 現價脈衝）、成長率離群值視覺封頂防禦演算法、7 大價值評估子分頁獨立分流渲染。 |
| **AI 主力頂部行情與雙層警示** | [`src/components/aiForceDashboard/HeaderMarketBar.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/HeaderMarketBar.tsx) | 未結算時動態切換「前日收盤價」、出示橘黃警示徽章、定錨基準日標示，並次級輔助顯示盤中即時參考價。 |
| **AI 決策核心卡片** | [`src/components/aiForceDashboard/cards/AiDecisionCoreCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/AiDecisionCoreCard.tsx) | 未結算時頂部出示顯著防禦警示橫幅，明確宣告量化基準日，確保決策透明度。 |
| **主力 K 線卡片 (Card 01)** | [`src/components/aiForceDashboard/cards/KLineChartCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/KLineChartCard.tsx) | 實作 `normalizeAndSortCandles` 升冪排序守護，校正時間軸為左側歷史軌跡、右側最新交易日。 |
| **多維度六角雷達 (Card 03)** | [`src/components/aiForceDashboard/cards/MultiDimensionRadarCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MultiDimensionRadarCard.tsx) | `RADAR_CHART_CONFIG` 有效半徑擴展至 100px，標籤 13px 加粗高對比，數值 12px 高亮，判讀體驗顯著提升。 |
| **健康度綜合評估 (Card 11)** | [`src/components/aiForceDashboard/cards/HealthSummaryCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/HealthSummaryCard.tsx) | `DONUT_GAUGE_CONFIG` 甜甜圈直徑擴大至 78px，間距緊湊無重疊，數值字級 15px，對齊照片 4 飽滿風格。 |
| **主力追蹤總評判 (Card 18)** | [`src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx) | 容器 100% 高度與 Card 16、17 齊平，Bento 佈局重新層次化（狀態 ➔ 核心看板 ➔ 數據膠囊 ➔ 論述）。 |

---

## 🛠️ 5. 技術債現況追蹤 (Technical Debts Status)

依據專案規範與 [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)，當前重點如下：

- **待進行評估之架構改善 (Backlog / Open)**：
  - `DEBT-0038`：[提取流通股數推導共用輔助函式 (deriveSharesOutstanding) 消除 DRY 異味](file:///d:/APP/股票紀錄/docs/debts/0038-derive-shares-outstanding-helper-refactor.md) (`P3`，待量化估值模型擴充時一併重構)。
  - `DEBT-0037`：全市場個股 7 步深度投研與決策閉環引擎 (`P2`)。
  - `DEBT-0036`：質押借貸 FULL_PAYOFF 全額結清分支統一委託 applyDebtRepayment 引擎重構 (`P2`, Issue #25)。
  - `DEBT-0033`：靜態資源 Content-Security-Policy (CSP) 安全標頭與 XSS 深度防護 (`P1`)。
  - `DEBT-0034`：JSON / CSV 匯入解析的原型鏈污染防禦 (`P2`)。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支與儲存庫狀態**：
   - 當前位於分支 `main`，與 `origin/main` 保持一致，Working Tree Clean。
   - 所有變更均已透過 GitHub Actions CI 綠燈驗證並 Squash and Merge 回主幹。
2. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 149 個測試檔案、1,248 個測試 100% 綠燈）與 `npm run build`（確認 0 型別錯誤）。
3. **工作流閉環準則**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。

