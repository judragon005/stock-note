# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-08-21 15:38 (UTC+8)  
> **當前最新里程碑**：
> - **V1.8 持倉雙階自然排序與證交所除權息/減資端點校正**（持倉清單嚴格依「台股優先、代碼字母數字升冪、美股置底」排列，100% 吻合指定照片規則；校正 TWSE OpenAPI `TWT48U_ALL` 端點職責，建立無效減資安全閘門，徹底根絕 9927 泰銘 2026-10-01 假減資問題）。
> - **V1.9 技術債與架構改善意見追蹤管理系統**（建立 `docs/debts/` 集中存放區、動態技術債註冊看板、P1/P2/P3 優先級劃分、四段式標準建檔模板，並將技術債生命週期規範正式整合至 `AGENTS.md`）。
> **品質狀態**：全量單元測試 **83/83 通過 (100% Passed)**，TypeScript 0 錯誤 0 警告，Vite 生產環境打包 (Production Bundle) 順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **當前主幹分支**：`main`（已同步最新 PR #83 與 PR #86）
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml) (GitHub Actions 100% 綠燈通過)
- **測試套件狀態**：**83/83 通過** (6 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V1.9**
- **隱私安全**：所有本機交易 JSON 均受 `.gitignore` 隔離保護，杜絕個人財務資料推播至 GitHub 遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V1.8 / V1.9 新增核心術語**：
     - `Holdings Multi-Tier Sort`（持倉雙階自然排序：台股優先、代碼字典序升冪、美股置底）
     - `Technical Debt Registry`（技術債索引看板：收錄未即時修改之建議，已修復者不建檔）
     - `Virtual Cumulative Holdings Timeline`（虛擬時序動態持股推進器）
     - `Floor New Ratio Capital Reduction`（台股集保整數換發減資算法）
     - `Pre-Ex-Date Resolution`（除權息 T-1 基準日在倉判定）
     - `Zero-Holding Shield`（零持股平倉安全守護）
     - 官方 21 檔在倉標的對照表（`00403A` 至 `VT`）

2. **架構決策紀錄 (ADR-0001 ~ ADR-0010)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：React 18 + TypeScript + Vite + Vanilla CSS，雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap、CSS 變數全域主題切換。
   - [`ADR-0003`](file:///d:/APP/股票紀錄/docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)：統一事件流模型、純函式 `applyTradeToShares` 股數回放、資本返還扣減成本會計模型。
   - [`ADR-0004`](file:///d:/APP/股票紀錄/docs/adr/0004-full-market-live-corporate-actions-and-special-events.md)：全市場純線上多源即時掃描、5 大特殊公司行動會計核心與台股整數股數規則。
   - [`ADR-0005`](file:///d:/APP/股票紀錄/docs/adr/0005-realtime-and-delayed-market-quotes-system.md)：全市場即時與延遲多源報價引擎、交易時段智慧輪詢與自訂價格鎖定防禦架構。
   - [`ADR-0006`](file:///d:/APP/股票紀錄/docs/adr/0006-auto-usd-twd-exchange-rate-and-fallback.md)：美金台幣 (USD/TWD) 匯率自動更新、行情同步輪詢與多層平滑備援架構。
   - [`ADR-0007`](file:///d:/APP/股票紀錄/docs/adr/0007-scanner-progress-and-resume-architecture.md)：智慧掃描公司行動進度可視化、受控並行與斷點接續架構。
   - [`ADR-0008`](file:///d:/APP/股票紀錄/docs/adr/0008-virtual-holdings-timeline-and-corporate-action-accuracy.md)：V1.7 虛擬時序動態配股與台股減資整數換發架構。
   - [`ADR-0009`](file:///d:/APP/股票紀錄/docs/adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)：**V1.8 持倉列表自然排序與證交所除權除息端點校正**。
   - [`ADR-0010`](file:///d:/APP/股票紀錄/docs/adr/0010-technical-debt-management-architecture.md)：**V1.9 技術債與改善建議分級歸檔架構**。

3. **需求規格說明書 (SPEC-0001 ~ SPEC-0010)**：
   - [`0001-stock-tracker-and-analyzer.md`](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0）
   - [`0002-v1-enhancements-and-treemap.md`](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1）
   - [`0003-corporate-actions-and-date-holding-resolution.md`](file:///d:/APP/股票紀錄/docs/specs/0003-corporate-actions-and-date-holding-resolution.md)（V1.2）
   - [`0004-full-market-live-corporate-actions-and-special-events.md`](file:///d:/APP/股票紀錄/docs/specs/0004-full-market-live-corporate-actions-and-special-events.md)（V1.3）
   - [`0005-realtime-and-delayed-market-quotes-system.md`](file:///d:/APP/股票紀錄/docs/specs/0005-realtime-and-delayed-market-quotes-system.md)（V1.4）
   - [`0006-auto-usd-twd-exchange-rate.md`](file:///d:/APP/股票紀錄/docs/specs/0006-auto-usd-twd-exchange-rate.md)（V1.5）
   - [`0007-corporate-action-scanner-progress-and-resume.md`](file:///d:/APP/股票紀錄/docs/specs/0007-corporate-action-scanner-progress-and-resume.md)（V1.6）
   - [`0008-v1.7-corporate-actions-and-trades-cleaning-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0008-v1.7-corporate-actions-and-trades-cleaning-spec.md)（V1.7）
   - [`0009-holdings-natural-sorting-and-twse-scanner-fix.md`](file:///d:/APP/股票紀錄/docs/specs/0009-holdings-natural-sorting-and-twse-scanner-fix.md)（**V1.8：AC-1 至 AC-4 全數通過**）
   - [`0010-technical-debt-tracking-system.md`](file:///d:/APP/股票紀錄/docs/specs/0010-technical-debt-tracking-system.md)（**V1.9：AC-1 至 AC-4 全數通過**）

4. **技術債集中管理區 (`docs/debts/`)**：
   - [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)：技術債總覽看板與生命週期維護模板。
   - [`0001-holdings-sort-dry-refactor.md`](file:///d:/APP/股票紀錄/docs/debts/0001-holdings-sort-dry-refactor.md)：持倉雙階自然排序 DRY 集中化重構備忘 (`OPEN / P3`)。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算引擎** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 支援 12 種交易與特殊公司行動、雙階自然排序（台股優先、代碼字典序升冪、美股置底）、`applyTradeToShares` 純函式計算、`getHoldingsAsOfDate` 歷史基準日持股回溯。 |
| **計算引擎測試** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 26 個測試案例，涵蓋多市場混合排序、減資換發、分批買賣、移動加權平均成本等 (100% 通過)。 |
| **持倉 UI 表格** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | `activeHoldings` 防禦性自然排序、最新市價即時反饋、手動鎖定/解鎖價格、展開標的時間軸與自訂交易入口。 |
| **線上即時掃描器** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 校正 TWSE `TWT48U_ALL` 除權除息預告端點、無效減資安全過濾閘門、虛擬時序推進器、受控並行池與斷點接續。 |
| **掃描模組測試** | [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts) | 14 個測試案例，涵蓋假減資安全過濾、虛擬時序動態累積、台股減資整數換發 (9927)、進度回呼與中斷快取 (100% 通過)。 |
| **報價與匯率引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | 多源即時與延遲報價、`USDTWD=X` 自動匯率、TWSE 備援降級與 CORS 代理池 (16 tests)。 |
| **Agent 協作指引** | [`AGENTS.md`](file:///d:/APP/股票紀錄/AGENTS.md) | 定義 Issue-First、TDD、文檔同步、PR 流程與技術債自動歸檔規範。 |

---

## 🎯 4. 歷史交付票券閉環摘要 (Ticket Summary)

### V1.8 迭代：持倉自然排序與證交所端點校正
| 票券編號 | 標題 | 本地 Ticket | GitHub 遠端 Issue | 狀態 |
| :--- | :--- | :---: | :---: | :---: |
| **Ticket #1** | `[Engine/UI] 實作當前持倉庫存多維度自然排序（台股優先、代碼升冪、美股置底）` | [01-holdings-natural-sorting.md](.scratch/v1.8-holdings-sort-and-scanner-fix/issues/01-holdings-natural-sorting.md) | [#80](https://github.com/judragon003/-/issues/80) | ✅ Merged (PR #83) |
| **Ticket #2** | `[Scanner] 校正台灣證交所 OpenAPI 端點職責並建立無效減資安全閘門` | [02-twse-corporate-actions-endpoint-fix.md](.scratch/v1.8-holdings-sort-and-scanner-fix/issues/02-twse-corporate-actions-endpoint-fix.md) | [#81](https://github.com/judragon003/-/issues/81) | ✅ Merged (PR #83) |
| **Ticket #3** | `[Verification] 驗證歷史歷程錯誤紀錄清理、端到端測試與回歸測試 100% 綠燈` | [03-trades-history-cleaning-and-e2e-verification.md](.scratch/v1.8-holdings-sort-and-scanner-fix/issues/03-trades-history-cleaning-and-e2e-verification.md) | [#82](https://github.com/judragon003/-/issues/82) | ✅ Merged (PR #83) |

### V1.9 迭代：技術債追蹤管理系統
| 票券編號 | 標題 | 本地 Ticket | GitHub 遠端 Issue | 狀態 |
| :--- | :--- | :---: | :---: | :---: |
| **Ticket #1** | `[Docs/Arch] 建立 docs/debts/ 目錄、README.md 索引看板與首筆技術債文檔` | [01-create-debts-dir-and-initial-record.md](.scratch/v1.9-tech-debt-management-system/issues/01-create-debts-dir-and-initial-record.md) | [#84](https://github.com/judragon003/-/issues/84) | ✅ Merged (PR #86) |
| **Ticket #2** | `[Workflow/Sync] 整合 AGENTS.md 協作規範並同步領域文檔索引` | [02-update-agents-rules-and-sync-docs.md](.scratch/v1.9-tech-debt-management-system/issues/02-update-agents-rules-and-sync-docs.md) | [#85](https://github.com/judragon003/-/issues/85) | ✅ Merged (PR #86) |

---

## 🔮 5. 技術債與下一階段建議主題 (Tech Debt & Next Session)

### 當前 OPEN 技術債
- **[Debt #0001: 持倉雙階自然排序 DRY 集中化重構](file:///d:/APP/股票紀錄/docs/debts/0001-holdings-sort-dry-refactor.md)**：
  - 優先級：`P3 (Low)`
  - 觸發時機：引進第三交易市場（港股 HK、日股 JP 等）或使用者要求自訂持倉自選排序/置頂功能時啟動重構。

### 下一階段候選演進方向 (V2.0)
1. **多投資組合 / 分帳戶管理 (Multi-Portfolio Support)**：支援「長期存股倉」、「短線波段倉」、「退休帳戶」多帳號獨立記帳與切換。
2. **歷程淨值走勢與績效圖表 (Historical NAV & Performance Chart)**：繪製時間序列的總資產淨值曲線與大盤指數（如 S&P 500、加權指數）對比基準。
3. **自動股息預估與現金流行事曆 (Dividend Forecast & Calendar)**：基於在倉持股與已公告除息日程，預估未來 12 個月現金流。

---

## 🛠️ 6. 建議接續使用的 Agent 技能 (Suggested Skills for Next Agent)

下一位 Agent 接手時，請依據以下工作流規範執行：
1. **`brief-builder`** 或 **`/grill-with-docs`**：進行新需求的深入拷問與規格對齊。
2. **`/to-spec` & `/to-tickets`**：產出具備驗收標準的 PRD 與可測試微小票券。
3. **`/tdd & /implement`**：嚴格遵循紅-綠-重構循環實作程式碼，確保全量測試通過與 TypeScript 0 錯誤。
4. **`/code-review`**：執行標準軸與規格軸雙軸驗收；若有非阻擋性改善建議，自動建檔至 `docs/debts/`。
5. **`/handoff`**：自動檢查 `docs/specs/`、`docs/adr/`、`docs/debts/`、`.scratch/`、`README.md` 與 `CONTEXT.md` 進行全量交接閉環。
