# Ticket #1: [UI/UX] 投資組合活頁「資產配置 Treemap」與「4 大 KPI 統計卡片」版面動線互換

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0021](../../../docs/specs/0021-layout-swap-and-broker-grade-currency-precision.md)
- **架構決策**: [ADR-0021](../../../docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)

## 任務清單
- [x] 檢視 `src/App.tsx` 在 `activeTab === 'portfolio'` 時的元件佈局結構。
- [x] 將 `AllocationChart` 元件（資產配置與持倉分布 Treemap 樹狀圖 / 權重清單）順序置頂。
- [x] 將 `SummaryCards` 元件（庫存總市值、未實現損益、已實現損益、累計股息收益）移至中段。
- [x] 確保底段 `HoldingsTable` 排版結構完整，視覺邊距與響應式 RWD 無破版。
