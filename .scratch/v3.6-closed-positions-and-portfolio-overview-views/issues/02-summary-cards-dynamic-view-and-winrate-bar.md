# Ticket #2: [UI/Cards] SummaryCards 動態三態適配與勝率戰績儀表板

- **狀態**: Completed
- **規格書**: [SPEC-0019](../../../docs/specs/0019-closed-positions-and-portfolio-overview-views.md)
- **架構決策**: [ADR-0019](../../../docs/adr/0019-closed-positions-and-portfolio-overview-views.md)

## 任務清單
- [x] 擴充 `SummaryCards.tsx` Props 接收 `positionFilter: PositionFilter` 與 `closedSummary?: ClosedPositionsSummary`。
- [x] 實作三態動態切換渲染邏輯：
  - **`ACTIVE`（持倉中）**：展示現有持倉之總市值、總投入成本、未實現損益與未實現報酬率。
  - **`CLOSED`（已平倉）**：展示已實現總損益、累計落袋股利、勝率 % (獲利筆數/虧損筆數)、最大獲利與最大虧損標的卡片。
  - **`ALL`（全部總覽）**：展示全週期綜合總報酬（未實現 + 已實現 + 股利）與總投入現金流。
- [x] 支援台股／美股／全市場雙幣別切換與匯率換算顯示。
