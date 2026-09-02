# Ticket #016: [P2] 跨幣別歷史淨值匯率平滑與即時淨值一致性對齊

## 關聯規格
- PRD: [docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0051-cross-module-ledger-dividend-portfolio-audit-and-reconciliation-spec.md)

## 目標 (Goal)
消除美股持股在匯率劇烈波動時，歷史淨值每日歷史匯率與即時儀表板現時匯率換算之間的跳空斷層。

## 任務清單 (Tasks)
- [x] 在 `src/engine/historicalNav.ts` 中：
  - 歷史每日淨值使用當日歷史匯率（`forwardFillPrices` 補全）。
  - 確保今日快照使用即時即期匯率與即時報價，與首頁總資產無縫對齊。
- [x] 撰寫測試驗證跨幣別淨值計算的連續性。

## 驗收條件 (Acceptance Criteria)
- [x] 歷史 NAV 曲線與即時 NAV 完美接軌，無跨幣別跳空雜訊。
