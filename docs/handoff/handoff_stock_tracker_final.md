# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-08-24 15:05 (UTC+8)  
> **當前最新里程碑**：
> - **V3.0 多券商帳戶管理體系與交易摩擦成本分析儀**（多券商折讓率與低消設定、4 大摩擦指標發光看板、折讓省下金額試算）。
> - **V3.1 活頁本工作台架構與券商手續費整併**（三大核心活頁標籤欄、出清手續費直接由券商帳戶驅動、交易帳本總筆數透明提示）。
> - **V3.2 公司行動雙軌資料管線、受控限速與本地代理**（Vite Dev Proxy 徹底解決跨域問題、台股 TWSE 官方優先、Concurrency 2 + 150ms 節流延遲、24 小時實體快取）。
> - **V3.3 整合式設定工作台、Header 瘦身與 API Key 配置**（Header 移除冗餘按鈕、第三活頁更名為【⚙️ 設定】、內建券商/摩擦/外部 API 金鑰三大模組與 LocalStorage 隔離保存）。
> **品質狀態**：全量單元測試 **98/98 通過 (100% Passed)**，TypeScript 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **當前開發分支**：`feature/v3.0-multi-broker-and-friction-center`
- **測試套件狀態**：**98/98 通過** (6 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V3.3**
- **隱私安全**：所有本機交易資料與 API 金鑰均受 LocalStorage 本地隔離與 `.gitignore` 保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V3.0 ~ V3.3 核心術語**：
     - `Multi-Broker Accounts`（多券商帳戶管理體系：折讓率、最低手續費、美股模式）
     - `Transaction Friction Analyzer`（交易摩擦成本分析儀：實付費用、折讓節省、未來出清衝擊）
     - `Tabbed Workspace Hub`（活頁本工作台：投資組合、歷史帳本、設定）
     - `Controlled Throttling & 24H Cache`（受控節流佇列與 24 小時實體快取）
     - `Dev Proxy & Fallback Chain`（本地開發代理與多重 CORS 降級鏈）
     - `Isolated API Keys Storage`（外部資料 API 金鑰隔離持久化）

2. **架構決策紀錄 (ADR-0001 ~ ADR-0016)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap。
   - [`ADR-0003`](file:///d:/APP/股票紀錄/docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)：統一事件流模型與股數回放。
   - [`ADR-0004`](file:///d:/APP/股票紀錄/docs/adr/0004-full-market-live-corporate-actions-and-special-events.md)：全市場線上即時公司行動掃描。
   - [`ADR-0005`](file:///d:/APP/股票紀錄/docs/adr/0005-realtime-and-delayed-market-quotes-system.md)：即時與延遲多源報價引擎。
   - [`ADR-0006`](file:///d:/APP/股票紀錄/docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)：USD/TWD 匯率自動更新。
   - [`ADR-0007`](file:///d:/APP/股票紀錄/docs/adr/0007-scanner-progress-and-resume-architecture.md)：掃描進度可視化與中斷接續。
   - [`ADR-0008`](file:///d:/APP/股票紀錄/docs/adr/0008-virtual-holdings-timeline-and-corporate-action-accuracy.md)：虛擬時序動態配股與減資換發。
   - [`ADR-0009`](file:///d:/APP/股票紀錄/docs/adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)：持倉雙階自然排序。
   - [`ADR-0010`](file:///d:/APP/股票紀錄/docs/adr/0010-technical-debt-management-architecture.md)：技術債分級歸檔架構。
   - [`ADR-0011`](file:///d:/APP/股票紀錄/docs/adr/0011-dual-accounting-view-and-official-symbol-alignment.md)：全域雙軌會計口徑切換。
   - [`ADR-0012`](file:///d:/APP/股票紀錄/docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)：券商手續費折讓率自訂。
   - [`ADR-0013`](file:///d:/APP/股票紀錄/docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)：多券商帳戶體系與摩擦成本分析。
   - [`ADR-0014`](file:///d:/APP/股票紀錄/docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)：活頁本工作台與券商手續費整併。
   - [`ADR-0015`](file:///d:/APP/股票紀錄/docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)：公司行動雙軌管線、受控限速與本地代理。
   - [`ADR-0016`](file:///d:/APP/股票紀錄/docs/adr/0016-settings-workspace-and-api-key-configuration.md)：整合式設定工作台與外部 API Key 配置。

3. **需求規格說明書 (SPEC-0001 ~ SPEC-0016)**：
   - 全量 PRD 存放於 [`docs/specs/`](file:///d:/APP/股票紀錄/docs/specs/)，全數標記 `APPROVED` 且驗收條件 (AC) 100% 通過。

4. **技術債管理區 (`docs/debts/`)**：
   - [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)：技術債總覽看板。
   - [`0001-holdings-sort-dry-refactor.md`](file:///d:/APP/股票紀錄/docs/debts/0001-holdings-sort-dry-refactor.md)：持倉雙階自然排序 DRY 重構 (`OPEN / P3`)。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算引擎** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 雙軌會計口徑計算、各部位券商帳戶獨立費率試算、摩擦成本指標匯總。 |
| **計算引擎測試** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 33 個測試案例 (100% 通過)。 |
| **公司行動掃描器** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 雙軌管線 (TWSE 官方優先 + Yahoo 備援)、本地代理優先、24H LocalStorage 快取、Concurrency 2 + 150ms 節流延遲 (14 tests)。 |
| **報價與匯率引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | 即時行情、USD/TWD 匯率自動更新、本地代理優先與多重 CORS 降級 (16 tests)。 |
| **活頁本導覽標籤** | [`src/components/WorkspaceTabs.tsx`](file:///d:/APP/股票紀錄/src/components/WorkspaceTabs.tsx) | 3 大活頁標籤（📊 投資組合、📜 歷史帳本、⚙️ 設定），支援 LocalStorage 頁籤記憶。 |
| **設定中心工作台** | [`src/components/SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx) | 整合券商帳戶 CRUD、4 大發光摩擦看板與 FinMind / FMP / Alpha Vantage 金鑰配置。 |
| **交易歷史帳本** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 總筆數透明提示 (`已篩選 M 筆 / 全量共 N 筆`)、一鍵重置過濾。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 極簡設計，專注於市場切換、帳戶篩選、會計口徑、匯率即時狀態與智慧掃描入口。 |
| **本地開發代理** | [`vite.config.ts`](file:///d:/APP/股票紀錄/vite.config.ts) | 內建 `/api/twse` 與 `/api/yahoo` 本地開發代理路由。 |

---

## 🛠️ 4. 下一位 Agent 開啟新對話時的指引 (Guide for Next Agent)

在開啟新對話時，請下一位 Agent 直接讀取本手冊與 [`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)，並遵循以下原則：
1. **工作流標準**：嚴格依循八步閉環工作流（`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`）。
2. **品質門禁**：任何代碼改動必須確保 `npm test` (98/98 tests 綠燈) 與 `npm run build` (TypeScript 0 錯誤)。
3. **隱私與安全**：所有 API Key 均隔離於 `STOCK_TRACKER_API_KEYS_V1`，個人交易資料隔離於 `STOCK_TRACKER_TRADES_V1`，絕不可外洩。
