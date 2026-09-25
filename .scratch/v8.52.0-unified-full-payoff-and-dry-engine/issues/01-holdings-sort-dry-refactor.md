# 子任務 01: 持倉雙階自然排序 DRY 集中化重構 (Debt #0001)

- **狀態**：`CLOSED` (已完成)
- **所屬 Epic**：[Ticket #0139](0139.md)
- **關聯技術債**：[Debt #0001](../../../docs/debts/0001-holdings-sort-dry-refactor.md)

## 任務細項
1. 建立 `src/utils/holdingsSort.ts`，封裝並導出 `compareHoldingsOrder(a, b)`。
2. 建立 `src/utils/holdingsSort.test.ts`，測試台股置前、美股置底、字典序升冪與同標的保護。
3. 重構 `src/engine/calculator.ts` (L919) 與 `src/components/HoldingsTable.tsx` (L233) 統一引用 `compareHoldingsOrder`。
4. 驗證既有計算與 UI 排序行為完全一致。
