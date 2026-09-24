# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-24 10:15 (UTC+8)  
> **當前最新里程碑**：
> - **V8.50.0 股利收益月度現金流 Tooltip 智慧避讓、券商毛淨額雙軌切換與官方發放日對照庫**（ADR-0137, Spec 0137, Issue #83, PR #84, PR #85）：
>   - **長條圖 Tooltip 邊界碰撞智慧避讓**：徹底修復 12 月長條 Tooltip 向右溢出容器遮擋隔壁「股息貢獻排行 (Top)」卡片的 UI 破版問題。實作 `calculateMonthTooltipAlign` 演算法，1~2 月靠左向右展開、10~12 月靠右向左展開、3~9 月保持置中。
>   - **券商 APP「累積現金股利」對帳口徑雙軌切換**：證實國泰證券等券商 APP 之「累積現金股利」為「按入帳發放日 (Payment Date) 結算之應發毛額 (Gross)」。首張 KPI 卡片增設 `[券商對帳 (毛額)] / [存摺入帳 (實領)]` 雙軌切換按鈕，大字直覺對齊券商 APP；明細表頂部增設「年度各標的券商對帳小計」面板，支援單點即時過濾校正。
>   - **官方除息入帳常態發放日快取對照庫**：建立 `OFFICIAL_TW_PAY_DATE_MAP`，收錄 00919, 0056, 00878, 00713, 00921, 00929, 00940, 2886, 2890, 9927 與核心債券 ETF。優先依標的代碼比對真實入帳日（如 2024 年底除息之 00919 精準於 2025-01-13 入帳認列），終結推估天數引發之跨年時序漂移。
> - **V8.49.0 股利收益日誌與現金流全景：實質入帳日時序 SSOT 對齊與毛淨額雙軌對帳系統**（ADR-0136, Spec 0136, PR #82）：導出 `getEffectiveDividendPayDate` 作為時序 SSOT，股息貢獻排行榜加入已入帳過濾，歷史明細表新增年度連動切換。
> - **V8.48.0 全市場全歷史數據回補與四層容錯修復管線**（ADR-0135, Spec 0135, PR #80）：加權指數 7,158 日歷 SSOT 對齊、四層容錯修復、二分搜尋 33 秒極速回補、IndexedDB 本地秒讀。
> - **V8.47.1 頂部 Header 盤後快取狀態膠囊視覺重構與設定中心 Windows 排程管理中樞**（ADR-0134, Spec 0134, PR #78）：原生黑金深色半透明毛玻璃收斂、極簡膠囊 (`🇹🇼 16:00 · 🇺🇸 08:00`)、Windows 排程面板。
> - **V8.47.0 每日收盤全市場台美股定時同步、本地快取秒讀與零遺漏稽核**（ADR-0133, Spec 0133, PR #76）：全市場整包下載批次獲取。
> **品質狀態**：全量單元測試 **962/962 通過 (100% Passed / 101 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`main`（與 `origin/main` 保持完全同步，工作目錄 Clean）
- **最新已合併 PR**：
  - [PR #84](https://github.com/judragon005/stock-note/pull/84)：`feat(dividend): 實作月度現金流 Tooltip 智慧避讓、券商毛淨額雙軌切換與官方發放日對照庫 (Spec 0137)`（自動關閉 Issue #83）
  - [PR #85](https://github.com/judragon005/stock-note/pull/85)：`docs: 更新 README.md 測試通過徽章與 V8.50.0 核心特色說明`
- **單元測試套件**：**962/962 通過 (101 test suites / 100% 綠燈，耗時 ~94s)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包耗時 ~17.2 秒，產出 0 錯誤
- **當前釋出版本**：**V8.50.0**
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens 均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `dividendAggregator.ts`、`receivableDividendEngine.ts`、`keyMetricsEngine.ts`、`taiwanFinancialPipeline.ts`、`cryptoEngine.ts`、`secureProxyRouter.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化，嚴格遵守每小時 5 次推播節流與 CI 防濫用原則。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及股價、股利發放日、除息日、本益比、殖利率與財務報表資料。
   - 核心準則：實施即時 API 與官方發放日查表比對，拒絕靜態假資料與幻覺數值，堅持第一性原理推導真實股利與入帳時間軸。

---

## 🏗️ 3. 規格、架構決策與版本鏡像對照 (Specs, ADRs & Local Tickets)

| 規格編號 (PRD) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 關聯 Issue / PR | 版本 | 核心主題 |
| :--- | :--- | :--- | :--- | :--- | :--- |
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

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **股利收益日誌與現金流** | [`src/components/DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx) | `calculateMonthTooltipAlign` 智慧避讓演算法（1~2月靠左、10~12月靠右、3~9月居中）、KPI 首卡券商對帳毛淨額雙軌切換、明細表標的對帳小計卡片網格與單點過濾。 |
| **個股分析工作台** | [`src/components/analysis/StockAnalysisWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) | 整合 6 大核心指標分頁（獲利力、安全性、成長力、現金流、價值評估、公開股利），提供股票代碼搜尋、快顯膠囊、自適應響應式佈局。 |
| **指標圖表與河流圖** | [`src/components/analysis/AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx) | 向量 SVG 估值河流圖引擎（`<polygon>` 漸層色帶 + 通道邊界 + 現價脈衝）、成長率離群值視覺封頂防禦演算法、7 大價值評估子分頁獨立分流渲染。 |

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
   - 接手前務必執行 `npm test`（確認 101 個測試檔案、962 個測試 100% 綠燈）與 `npm run build`（確認 0 型別錯誤）。
3. **工作流閉環準則**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。

