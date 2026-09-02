# Ticket #014: [P1] 現金減資退還股款之每股成本 0 元保底防禦（避免損益率顛倒）

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
消除低成本持股經現金減資退還股款後，若每股成本變成負數，未實現損益率公式除以負數產生「明明賺錢卻顯示負報酬率」的符號反轉問題。

## 任務清單 (Tasks)
- [x] 在 `src/engine/calculator.ts` 中：
  - 現金減資退款後，若總成本基準 $\le 0$，強制設定 `totalCostBasis = 0` 或以每股 0.0001 元保底防禦。
  - 未實現損益率公式加入除零與負數成本防禦：若成本為 0，損益率顯示為 $\infty$ 或以 100% 絕對值呈現。
- [x] 撰寫測試驗證減資超額退款時的損益率符號與數值正確性。

## 驗收條件 (Acceptance Criteria)
- [x] 現金減資持股損益率永不發生正負號反轉。
