# Ticket #2: [UI/UX] 歷史交易帳本總筆數透明展示與一鍵重置篩選

- **狀態**: Completed
- **規格書**: [SPEC-0014](../../../docs/specs/0014-tabbed-workspace-and-broker-fee-consolidation.md)
- **架構決策**: [ADR-0014](../../../docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)

---

## 任務目標 (Objective)
在歷史交易帳本 (`TradeHistoryTable.tsx`) 表頭明確呈現當前篩選筆數與全量總筆數，並提供一鍵重置篩選按鈕，徹底解決「交易資料看似縮減/遺失」的認知困擾。

---

## 實作範圍 (Scope)
1. **TradeHistoryTable 表頭升級 (`src/components/TradeHistoryTable.tsx`)**：
   - 接受 `totalTradesCount` 與 `onResetFilters`（可選）props。
   - 當 `trades.length < totalTradesCount` 時，顯示：`歷史交易明細（已篩選顯示 ${trades.length} 筆 / 全量共 ${totalTradesCount} 筆）`。
   - 顯示醒目的濾鏡狀態 Badge，並提供 `[顯示全部 ${totalTradesCount} 筆交易]` 重置按鈕。
2. **App 串接 (`src/App.tsx`)**：
   - 傳遞 `trades.length` 作為 `totalTradesCount`，並提供重置回市場 `ALL` 與帳戶 `ALL` 的處理函式。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 無篩選時顯示 `(共 N 筆)`。
- [ ] 有篩選時清楚顯示 `(已篩選顯示 M 筆 / 全量共 N 筆)`。
- [ ] 點擊重置按鈕能立即還原為顯示全量交易。
