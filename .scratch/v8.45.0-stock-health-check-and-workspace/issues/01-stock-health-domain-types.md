# 01 — 股票健診核心領域型別與 7 大插槽契約定義 (Stock Health Domain Types & Slot Architecture)

**What to build:**
於 `src/types/stockHealth.ts` 定義股票健診模組之核心資料契約，包含 4 大核心類別枚舉、未來 3 大擴充插槽 (`SOLVENCY`, `PROFITABILITY`, `FREE_CASH_FLOW`)、21 項指標檢驗結果 (`HealthCheckItemResult`)、健診分類結果 (`HealthCheckCategoryResult`) 與個股全量診斷摘要 (`StockHealthDiagnosis`)。

**Blocked by:** None — can start immediately

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #55

- [x] 定義 `HealthCheckCategory`（包含 4 大當前類別與 3 大 Phase 2 擴充類別）
- [x] 定義 `HealthCheckItemResult`（包含 `id`, `name`, `passed`, `actualValue`, `thresholdDesc`, `exempted` 等欄位）
- [x] 定義 `HealthCheckCategoryResult`（包含 `totalItems`, `passedItems`, `passRatio`, `summaryText`）
- [x] 定義 `StockHealthDiagnosis`（包含可用歷史年限 `dataSufficientYears`、`isDataSufficient` 等防呆標記）
- [x] 匯出至 `src/types/index.ts`（若有統一匯出點）
