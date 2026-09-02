# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-01 16:05 (UTC+8)  
> **當前最新里程碑**：
> - **V6.9.4 減資多源去重、虛擬時序動態扣減與交易帳本股息淨額對齊**（TWSE 與 Yahoo 減資 $\le 90$ 天合併去重；虛擬時序池納入減資扣減；官方 6 位精準減資比率對齊消除 1 股誤差；交易帳本股息淨額對齊）。
> - **V6.9.3 Storage Inspector 快取統計指標解構與字典計數對齊修復**（修復公司行動庫 0 檔 61 筆至真實 61 檔；修復歷史外匯 4529 對 0 點至 1 對 4,529 點；字典庫總數完全對齊 3,350 檔）。
> - **V6.9.2 Local Storage 雙軌檢視器韌性增強與零筆數回退修復**。
> - **V6.9.1 智慧掃描公司行動真實持股對齊、強制重掃狀態重置與精準配息比對**。
> **品質狀態**：全量單元測試 **386/386 通過 (100% Passed)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **測試套件狀態**：**386/386 通過** (33 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V6.9.4**
- **隱私安全**：所有本機交易資料與 API 金鑰均受 IndexedDB / LocalStorage 本地隔離與 `.gitignore` 保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V5.2 核心術語**：
     - `Today's PnL`（盤中當日損益：依 `shares * (currentPrice - previousClose)` 跨市場計算今日動態賺賠）
     - `Breakeven Price`（精確損益平衡保本價：計入賣出證交稅、券商折讓與低消 20 元階梯補償）
     - `Excess Capital Reduction`（減資超額退款：退款大於持倉成本時轉列已實現利得，杜絕成本截斷失真）
     - `Fractional Shares Convergence`（碎股精度萬分位強制收斂）
   - **V5.1 核心術語**：
     - `XIRR / Money-Weighted Rate of Return, MWRR`（內部報酬率 / 資金加權報酬率：非線性折現真實年化複利）
     - `Hybrid Newton-Raphson & Bisection Solver`（牛頓-二分法混合求解引擎：50 次迭代，容差 $10^{-7}$，100% 收斂防崩潰）
     - `30-Day Adaptive Smoothing Guard`（30 天平滑防護：未滿 30 天以絕對累積報酬呈現，避免短線極端外推失真）
   - **V5.0 核心術語**：
     - `StockTrackerDB`（原生 0 依賴 IndexedDB 儲存引擎：9 大 Object Stores，解除 5MB 限制與同步阻塞）
     - `Non-Destructive Dual-Check Migration`（無損平滑雙重保險遷移：搬移 localStorage 並留存冷備份）

2. **架構決策紀錄 (ADR-0001 ~ ADR-0034)**：
   - [`ADR-0034`](file:///d:/APP/股票紀錄/docs/adr/0034-todays-pnl-and-breakeven-price-system.md)：V5.2 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) 體系。
   - [`ADR-0033`](file:///d:/APP/股票紀錄/docs/adr/0033-xirr-performance-engine.md)：V5.1 XIRR 不定期現金流年化報酬率引擎與多維度績效分析體系。
   - [`ADR-0032`](file:///d:/APP/股票紀錄/docs/adr/0032-indexeddb-storage-and-time-machine-snapshots.md)：V5.0 IndexedDB 底層儲存遷移、ACID 事務與時光機快照體系。
   - [`ADR-0031`](file:///d:/APP/股票紀錄/docs/adr/0031-code-review-refactoring-and-settlement-automation.md)：Code Review 全量重構、在途交割日曆全自動化與時序卡片模組化。

3. **需求規格說明書 (SPEC-0001 ~ SPEC-0033)**：
   - 全量 PRD 存放於 [`docs/specs/`](file:///d:/APP/股票紀錄/docs/specs/)，全數標記 `APPROVED` 且驗收條件 (AC) 100% 通過。
   - 最新：[SPEC-0033](file:///d:/APP/股票紀錄/docs/specs/0033-xirr-performance-engine.md)。

4. **單一版本交付紀錄存檔 (`docs/handoff/`)**：
   - [V6.5.0: 本機公司行動資料庫、多源交叉增量同步管線與減資除息時序校準](2026-08-28-v6.5.0-official-corporate-action-db-and-capital-reduction-pipeline.md)
   - [V6.4.0: 智慧掃描除息日與發放日雙欄位注入與現金在途隔離](2026-08-28-v6.4.0-smart-scan-pay-date-alignment-and-pending-ledger.md)
   - [V6.3.0: 跨模組全量交叉核銷、融資/在途 NAV 守恆與自適應 XIRR](2026-08-28-v6.3.0-cross-module-ledger-dividend-portfolio-reconciliation.md)
   - [V6.0.0: 官方股票名稱字典庫與智慧自動補齊](2026-08-28-v6.0.0-official-stock-dictionary-and-smart-autocomplete.md)
   - [V5.0: 原生 IndexedDB 底層儲存與時光機快照](2026-08-27-v5.0-indexeddb-and-time-machine-snapshots.md)
   - [V4.8: Code Review 全量重構與在途日曆全自動化](2026-08-27-v4.8-code-review-refactoring-and-settlement-automation.md)
   - [V4.7: 券商級在途資金與三層可用性購買力帳本](2026-08-27-v4.7-in-transit-funds-and-buying-power-ledger.md)

5. **本地票券鏡像區 (`.scratch/`)**：
   - `.scratch/v6.5.0-official-corporate-action-db-and-capital-reduction-pipeline/issues/` (3/3 Completed)


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

