# Ticket #006: [P1] 除息日至發放日全域 NAV 納入待入帳應收股利（消除淨值斷層）

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
消除除息日 $T_{ex}$ 股價除息跳空造成持股市值蒸發，而現金尚未入帳期間（約 3~4 週）所導致的全組合歷史淨值鋸齒狀暴跌 (NAV Cliff)。

## 任務清單 (Tasks)
- [x] 在 `src/engine/historicalNav.ts` 的每日快照生成邏輯中：
  - 納入當日處於 $exDate \le date < payDate$ 區間之 `receivableDividendTWD` 總額作為資產增項。
- [x] 撰寫單元測試 `historicalNav.test.ts`：
  - 驗證除息日前一日與除息當日，總資產 NAV 曲線平滑連續，無人為假性虧損斷層。

## 驗收條件 (Acceptance Criteria)
- [x] 7~8 月除權息旺季，歷史淨值曲線不再出現假性鋸齒狀暴跌。
