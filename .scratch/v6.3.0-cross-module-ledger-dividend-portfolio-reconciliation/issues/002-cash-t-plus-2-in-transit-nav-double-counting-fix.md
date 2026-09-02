# Ticket #002: [P1] T~T+2 交易在途款全週期淨值守恆與雙重膨脹消除

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
消除股票買進日 $T$ 已計入股票市值，但現金在 $T+2$ 才扣款導致 $T\sim T+1$ 期間總淨值假性虛高膨脹的矛盾。

## 任務清單 (Tasks)
- [x] 在 `src/engine/cashLedgerEngine.ts` 與 `src/engine/historicalNav.ts` 中：
  - 確保淨值計算公式納入在途淨額與融資負債：$\text{NAV} = \text{市值} + \text{已交割現金} + \text{在途應收} - \text{在途應付} - \text{借貸負債}$。
- [x] 撰寫單元測試驗證 $T$ 日買進後，在 $T$ 日、$T+1$ 日與 $T+2$ 日三個時間點的總淨值保持連續守恆。

## 驗收條件 (Acceptance Criteria)
- [x] $T$ 日買進股票後，跨期淨值絕不因交割時間差而暴漲暴跌。
