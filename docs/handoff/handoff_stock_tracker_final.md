# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-03 14:30 (UTC+8)  
> **當前最新里程碑**：
> - **V7.5.2 歷史已結清借貸規費明細計算校正與結清還款日手動維護**（三大規費明細單一事實來源 SSOT 判定，設質費為 0 絕對強制為 0，杜絕舊 pledgeFee 與未拆分流水污染翻倍；LoanModal 支援已結清借貸 handoff 手動編輯校正結清還款日 closedDate）。
> - **V7.5.1 歷史已結清借貸利息與官方規費明細拆解、借款天數與結清還款日追蹤**（closedDate 時態補完；結清還款日與歷時借款天數自動推算；雙軌聚合已付利息、設質登記費、集保撥券費、開辦手續費；總借貸支出成本醒目展示；官方標準術語統一膠囊）。
> - **V7.5.0 股票質押借款撥款金流同步、零本金斷頭誤判防禦與已結清歷史歸檔**（借款自動連動撥款入帳 LOAN_DISBURSEMENT；2026-07-28 缺漏金流一鍵平帳；進行中 vs 已結清看板分流；維持率零本金防禦與規費清零；已結清歷史折疊面板）。
> - **V7.4.0 樹狀圖納入借款與負債槓桿視覺化架構**（正數幾何資本來源模型注入 `DEBT_TWD`；專屬高對比琥珀警示色與邊框；多層次借貸合約透視 Tooltip；權重清單同步納入負債長條項；頂部比例 HUD 注入獨立 `負債比 LTV` 膠囊；純現貨零借款 100% 自動隱藏防禦）。
> - **V7.3.3 對稱色彩模式切換器與動態情境式懸浮提示**（雙色球標籤、即時 Tooltip 提示、跨主題紅綠同步）。
> - **V7.2.1 持股技術指標結構化卡片防截斷與 20MA/60MA 均線乖離率**。
> - **V7.1.0 樹狀圖納入現金部位與總資產權重統一架構**。
> - **V7.0.0 資產配置目標偏離 (Drift) 試算與再平衡推薦器**。
> **品質狀態**：全量單元測試 **489/489 通過 (100% Passed)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **測試套件狀態**：**491/491 通過** (45 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V7.6.0**
- **隱私安全**：所有本機交易資料與 API 金鑰均受 IndexedDB / LocalStorage 本地隔離與 `.gitignore` 保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V7.6.0 核心術語**：
     - `Ex-Date vs Pay-Date Temporal Separation`（除息日與入帳發放日時序徹底分離：除息基準日平滑假性虧損，發放日落袋結算）
     - `Primary-Secondary Dual Display`（主次並列展示架構：主視覺醒目呈現入帳發放日，副視覺標註除息基準日）
     - `Effective Pay-Date Descending Sort`（有效入帳日倒序排列，最新入帳資金始終置頂）

2. **架構決策紀錄 (最新)**：
   - [`ADR-0076`](file:///d:/APP/股票紀錄/docs/adr/0076-dividend-log-view-pay-date-temporal-separation-and-sorting.md)：V7.6.0 歷史現金股利入帳明細入帳日與除息日時序徹底分離與主次排版架構。
   - [`ADR-0075`](file:///d:/APP/股票紀錄/docs/adr/0075-settled-loan-fee-breakdown-bugfix-and-payoff-date-editor.md)：V7.5.2 歷史已結清借貸規費明細計算校正與結清還款日維護架構。
   - [`ADR-0074`](file:///d:/APP/股票紀錄/docs/adr/0074-settled-loan-cost-breakdown-and-payoff-date.md)：V7.5.1 歷史已結清借貸成本透視與結清還款日追蹤架構。

3. **需求規格說明書 (最新)**：
   - [SPEC-0076](file:///d:/APP/股票紀錄/docs/specs/0076-dividend-log-view-pay-date-temporal-separation-and-sorting-spec.md)：歷史現金股利入帳明細入帳日與除息日時序徹底分離、官方發放日校正與主次層級排版系統 PRD (4 大驗收條件全數通過)。

4. **單一版本交付紀錄存檔 (`docs/handoff/`)**：
   - [V7.6.0: 歷史現金股利入帳明細時序分離與主次排版系統](2026-09-07-v7.6.0-dividend-log-view-pay-date-temporal-separation.md)
   - [V7.5.2: 歷史已結清借貸規費校正與結清日維護](2026-09-03-v7.5.2-settled-loan-fee-breakdown-bugfix-and-payoff-date-editor.md)
   - [V7.4.0: 樹狀圖納入借款與負債槓桿視覺化架構](2026-09-03-v7.4.0-treemap-debt-and-leverage-visualization.md)

5. **本地票券鏡像區 (`.scratch/`)**：
   - `.scratch/v7.6.0-dividend-log-view-pay-date-temporal-separation/issues/` (4/4 Completed)


---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **原生 IndexedDB 儲存引擎** | [`src/utils/db.ts`](file:///d:/APP/股票紀錄/src/utils/db.ts) | 0 依賴原生 Promise 封裝 `StockTrackerDB`（9 大 Stores），支援 CRUD、`batchPut`、事務、10 份快照輪替淘汰、無損遷移與全庫 JSON 匯入匯出。 |
| **IndexedDB 引擎單元測試** | [`src/utils/db.test.ts`](file:///d:/APP/股票紀錄/src/utils/db.test.ts) | 9 個深度單元測試案例 (100% 綠燈通過)。 |
| **設定與時光機看板** | [`src/components/SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx) | 券商費率、摩擦看板、API Key 管理與「時光機快照管理面板」（指標、自訂快照、鎖定切換、一鍵還原二次確認、JSON 備份）。 |
| **現金、在途與購買力引擎** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | 三層可用性核算 (`calculateAccountBalances`)、交易購買力風控 (`calculateTradingBuyingPower`)、在途時序分組 (`groupPendingSettlementsByTimeline`)、日曆解析 (`getSettlementDate`)、DRY 工廠與判定函式。 |
| **現金與在途引擎測試** | [`src/engine/cashLedgerEngine.test.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.test.ts) | 29 個單元測試案例 (100% 綠燈通過)。 |
| **現金工作台面板** | [`src/components/CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) | 頂部四核心可用性發光看板、在途交割時序排程面板、交割戶資金狀態網格、質押風控、流水表格三態過濾列與單筆點擊切換。 |
| **在途時序卡片子元件** | [`src/components/PendingSettlementCard.tsx`](file:///d:/APP/股票紀錄/src/components/PendingSettlementCard.tsx) | 專職渲染在途排程卡片、幣別處理與一鍵核銷互動。 |
| **收支換匯與交割彈窗** | [`src/components/CashTransactionModal.tsx`](file:///d:/APP/股票紀錄/src/components/CashTransactionModal.tsx) | 單筆收支、換匯調撥、預計交割日即時自動預填與手動狀態覆寫。 |
| **質押借貸彈窗** | [`src/components/LoanModal.tsx`](file:///d:/APP/股票紀錄/src/components/LoanModal.tsx) | 質押本金、利率、擔保品明細與三大規費（撥券費/設質費/手續費）設定。 |
| **歷史 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | 歷史日 K 增量同步、遇假日 Forward-Fill、排除 relatedTradeId 避免雙重扣款 (9 tests)。 |
| **XIRR 數值求解與金流聚合引擎** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | 0 依賴 Newton-Raphson + Bisection 混合求解器、30 天平滑防護、整戶/個股/週期三層級現金流聚合 (11 tests)。 |
| **XIRR 引擎單元測試** | [`src/engine/xirrCalculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.test.ts) | 11 個深度單元測試案例 (100% 綠燈通過)。 |
| **XIRR 現金流透視診斷彈窗** | [`src/components/XirrDetailModal.tsx`](file:///d:/APP/股票紀錄/src/components/XirrDetailModal.tsx) | 4 格關鍵指標卡片、折現公式說明條、現金流時序明細表（含折現年數與現值 PV）。 |

---

## ⚡ 4. 常用驗證與維護指令 (Quick Verification)

```bash
# 1. 執行全量單元測試 (應 355/355 100% 通過)
npm test

# 2. 執行 TypeScript 型別嚴格檢查 (應 0 錯誤)
npx tsc --noEmit

# 3. 執行 Vite 生產環境建置 (應 0 錯誤成功打包)
npm run build
```

