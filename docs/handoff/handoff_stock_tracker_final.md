# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-14 15:32 (UTC+8)  
> **當前最新里程碑**：
> - **V8.46.2 個股分析成長率平整化、離群值視覺封頂防禦、向量河流圖與動態估值模型審計**（ADR-0131, Spec 0131, PR #62）：擴充財務管線起算日至 2021-01-01 解決 2022 年 4 季 YoY 基期缺失；無基期平整化顯示 `-` 且柱高歸零杜絕 0% 假綠柱；實作離群值視覺封頂防禦演算法保留台泥 23Q2 毛利暴增真實 +5326.2% 且維持其他季度柱高 >50%；實作向量 SVG 估值河流圖引擎（4 階漸層多邊形色帶 `<polygon>`、5 條通道輪廓線、即時現價線與落點脈衝）；獨立重構 7 大價值評估子頁面；第一性原理動態推導流通股數（台泥 75.3 億股）消除 FCF Yield 9135% 與 DCF 每股 28.5 萬元天文數字。
> - **V8.46.1 個股分析指標補齊、公開市場歷年股利串接與實盤體驗優化**（ADR-0130, Spec 0130, PR #62）：串接公開股利歷史資料、快取自癒機制、修復三率圖面標籤。
> - **V8.46.0 個股深度分析工作區與關鍵量化估值體系**（ADR-0129, Spec 0129, PR #60）：整合 45 項圖表指標與 DCF/Piotroski/FCF 量化估值模型。
> - **V8.45.0 股票健診系統原生毛玻璃擬態、ETF防呆與標的快捷膠囊全面重構**（ADR-0128, Spec 0128, PR #58）：股票健診原生 Design Tokens 毛玻璃擬態重構、ETF 專屬防呆遮罩、持股快捷膠囊 Set 去重。
> - **V8.44.0 股票健診系統診斷引擎、穿透報告與專屬工作區**（ADR-0127, Spec 0127, PR #56）：全方位財務安全性、獲利力、成長力綜合健診引擎與視覺報告。
> **品質狀態**：全量單元測試 **923/923 通過 (100% Passed / 95 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`fix/61-stock-analysis-audit`（對應 PR #62，Closes #61，狀態 `MERGEABLE`）
- **單元測試套件**：**923/923 通過 (95 test suites / 100% 綠燈，耗時 ~51s)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包耗時 ~5.9 秒，產出 0 錯誤
- **當前釋出版本**：**V8.46.2**
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens（如 FinMind / FMP / 自訂代理）均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `keyMetricsEngine.ts`、`taiwanFinancialPipeline.ts`、`cryptoEngine.ts`、`secureProxyRouter.ts`、`csvSanitizer.ts`、`priceFetcher.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化，嚴格遵守每小時 5 次推播節流與 CI 防濫用原則。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及股價、本益比、殖利率、財務報表與市場資料抓取與轉換。
   - 核心準則：實施即時 API 驗證，拒絕靜態假資料與幻覺數值，堅持第一性原理推導真實股數與報表指標。

---

## 🏗️ 3. 規格、架構決策與版本鏡像對照 (Specs, ADRs & Local Tickets)

| 規格編號 (PRD) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 關聯 Issue / PR | 版本 | 核心主題 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`Spec 0131`](file:///d:/APP/股票紀錄/docs/specs/0131-stock-analysis-growth-river-and-valuation-audit-spec.md) | [`ADR 0131`](file:///d:/APP/股票紀錄/docs/adr/0131-stock-analysis-growth-river-and-valuation-audit.md) | [`.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/`](file:///d:/APP/股票紀錄/.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/) | Issue #61 / PR #62 | V8.46.2 | 成長率基期擴充、毛利離群視覺封頂、向量河流圖與動態流通股數推導 |
| [`Spec 0130`](file:///d:/APP/股票紀錄/docs/specs/0130-stock-analysis-metrics-fix-and-public-dividends.md) | [`ADR 0130`](file:///d:/APP/股票紀錄/docs/adr/0130-stock-analysis-metrics-fix-and-public-dividends.md) | [`.scratch/v8.46.1-stock-analysis-fix/`](file:///d:/APP/股票紀錄/.scratch/v8.46.1-stock-analysis-fix/) | Issue #61 / PR #62 | V8.46.1 | 個股分析全量指標補齊、公開市場歷年股利串接與實盤體驗優化 |
| [`Spec 0129`](file:///d:/APP/股票紀錄/docs/specs/0129-stock-deep-analysis-workspace.md) | [`ADR 0129`](file:///d:/APP/股票紀錄/docs/adr/0129-stock-deep-analysis-workspace.md) | [`.scratch/v8.46.0-stock-analysis/`](file:///d:/APP/股票紀錄/.scratch/v8.46.0-stock-analysis/) | Issue #59 / PR #60 | V8.46.0 | 個股深度分析工作區與關鍵量化估值體系 |
| [`Spec 0128`](file:///d:/APP/股票紀錄/docs/specs/0128-stock-health-ux-redesign.md) | [`ADR 0128`](file:///d:/APP/股票紀錄/docs/adr/0128-stock-health-ux-redesign.md) | [`.scratch/v8.45.0-health-redesign/`](file:///d:/APP/股票紀錄/.scratch/v8.45.0-health-redesign/) | Issue #57 / PR #58 | V8.45.0 | 股票健診系統原生毛玻璃擬態、ETF防呆與標的快捷膠囊全面重構 |
| [`Spec 0127`](file:///d:/APP/股票紀錄/docs/specs/0127-stock-health-check.md) | [`ADR 0127`](file:///d:/APP/股票紀錄/docs/adr/0127-stock-health-check.md) | [`.scratch/v8.44.0-stock-health-check/`](file:///d:/APP/股票紀錄/.scratch/v8.44.0-stock-health-check/) | Issue #55 / PR #56 | V8.44.0 | 股票健診系統診斷引擎、穿透報告與專屬工作區 |

---

## 🧩 4. 關鍵核心引擎與組件清單 (Key Engines & Components)

### 4.1 核心運算引擎 (`src/engine/`)

| 模組 | 檔案路徑 | 職責與關鍵演算法 | 測試覆蓋 |
| :--- | :--- | :--- | :--- |
| **量化關鍵指標引擎** | [`src/engine/keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts) | 動態流通股數推導（`capitalStock / 10`）、近 4 季 TTM FCF Yield 報酬率、DCF 現金流折現每股內在價值、Piotroski F-Score 九項指標評分。 | 6 tests |
| **指標審計測試套件** | [`src/engine/analysisMetricsAudit.test.ts`](file:///d:/APP/股票紀錄/src/engine/analysisMetricsAudit.test.ts) | 5 大核心金融審計檢驗：基期缺失平整化、毛利暴衝真實性與離群高度維持、動態股數 >70 億股、FCF Yield 合理區間、DCF 25~55 元。 | 9 tests |
| **台股財報資料管線** | [`src/engine/taiwanFinancialPipeline.ts`](file:///d:/APP/股票紀錄/src/engine/taiwanFinancialPipeline.ts) | 起算日擴展至 `2021-01-01` 提供 2022 年完整 4 季同比基準，串接 FinMind 資產負債表、綜合損益表、現金流量表。 | 4 tests |
| **公開股利服務** | [`src/engine/dividendService.ts`](file:///d:/APP/股票紀錄/src/engine/dividendService.ts) | 串接台灣公開市場歷年除權息與配息資料，支援快取與自動容錯回退。 | 4 tests |
| **股票體質診斷引擎** | [`src/engine/stockHealthDiagnosis.ts`](file:///d:/APP/股票紀錄/src/engine/stockHealthDiagnosis.ts) | 獲利、安全、成長、現金流四維度評分與白話操盤建議。 | 9 tests |
| **穿透式財報深度排雷** | [`src/engine/forensicRadarEngine.ts`](file:///d:/APP/股票紀錄/src/engine/forensicRadarEngine.ts) | 「市場沒說什麼」六大結構性背離排雷（塞貨、紙上富貴、借債配息、業外虛胖、SBC稀釋、審計異常）。 | 8 tests |

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **個股分析工作台** | [`src/components/analysis/StockAnalysisWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) | 整合 6 大核心指標分頁（獲利力、安全性、成長力、現金流、價值評估、公開股利），提供股票代碼搜尋、快顯膠囊、自適應響應式佈局。 |
| **指標圖表與河流圖** | [`src/components/analysis/AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx) | 向量 SVG 估值河流圖引擎（`<polygon>` 漸層色帶 + 通道邊界 + 現價脈衝）、成長率離群值視覺封頂防禦演算法、7 大價值評估子分頁獨立分流渲染。 |
| **股票健診工作台** | [`src/components/health/StockHealthWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/health/StockHealthWorkspace.tsx) | 股票健康度綜合體檢儀、四大維度進度環、杜邦分析因子拆解、ETF 專屬防呆覆蓋層。 |
| **穿透式財報戰情室** | [`src/components/financial/FinancialForensicModal.tsx`](file:///d:/APP/股票紀錄/src/components/financial/FinancialForensicModal.tsx) | 三層漸進式架構（0秒戰報 ➔ 8季獲利三率趨勢 ➔ 深度排雷），全螢幕置中毛玻璃遮罩。 |

---

## 🛠️ 5. 技術債現況追蹤 (Technical Debts Status)

依據專案規範與 [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)，當前已累積 38 篇技術債與架構改進提案，最新重點如下：

- **待進行評估之架構改善 (Backlog / Open)**：
  - `DEBT-0038`：[提取流通股數推導共用輔助函式 (deriveSharesOutstanding) 消除 DRY 異味](file:///d:/APP/股票紀錄/docs/debts/0038-derive-shares-outstanding-helper-refactor.md) (`P3`，待量化估值模型擴充時一併重構)。
  - `DEBT-0037`：全市場個股 7 步深度投研與決策閉環引擎 (`P2`)。
  - `DEBT-0036`：質押借貸 FULL_PAYOFF 全額結清分支統一委託 applyDebtRepayment 引擎重構 (`P2`, Issue #25)。
  - `DEBT-0033`：靜態資源 Content-Security-Policy (CSP) 安全標頭與 XSS 深度防護 (`P1`)。
  - `DEBT-0034`：JSON / CSV 匯入解析的原型鏈污染防禦 (`P2`)。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支與 PR 狀態**：
   - 當前位於分支 `fix/61-stock-analysis-audit`。
   - 關聯 Pull Request：[PR #62](https://github.com/judragon005/stock-note/pull/62)，目前為 `MERGEABLE`，95/95 測試檔 923 測全數綠燈。
   - 待維護者核准後可執行 Squash and Merge 合併回 `main` 並自動關閉 Issue #61。
2. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 95 個測試檔案、923 個測試 100% 綠燈）與 `npm run build`（確認 0 型別錯誤）。
3. **工作流閉環準則**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。
