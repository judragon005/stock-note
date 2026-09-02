# Ticket #1: [Engine/TDD] 已平倉標的判定、勝率統計與全週期總報酬純函式與單元測試

- **狀態**: Completed
- **規格書**: [SPEC-0019](../../../docs/specs/0019-closed-positions-and-portfolio-overview-views.md)
- **架構決策**: [ADR-0019](../../../docs/adr/0019-closed-positions-and-portfolio-overview-views.md)

## 任務清單
- [x] 在 `src/types/stock.ts` 中擴充 `PositionFilter` (`'ACTIVE' | 'CLOSED' | 'ALL'`) 與 `ClosedPositionsSummary` 型別定義（包含勝率、贏家/輸家統計、最大獲利/虧損標的）。
- [x] 在 `src/engine/calculator.ts` 中實作已平倉指標統計純函式 `calculateClosedPositionsSummary(holdings: HoldingPosition[], usdRate: number): ClosedPositionsSummary`。
- [x] 確保 `HoldingPosition` 包含最後清倉出場均價 (`exitPrice`)、最後交易日期 (`lastTradeDate`) 與清倉狀態判定。
- [x] 撰寫單元測試 `src/engine/calculator.test.ts` 驗證：
  - 各種交易場景下的持倉中 (`shares > 0`) 與已平倉 (`shares === 0`) 正確分類。
  - 勝率、獲利/虧損標的筆數與最大贏家/輸家金額計算之精準度。
