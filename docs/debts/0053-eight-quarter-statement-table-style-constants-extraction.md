# 技術債 0053: EightQuarterStatementTable 樣式常數與子儲存格抽取 (Style Constants & Sub-cell Extraction)

## 1. 摘要與背景
在 Spec 0202（PR #326）中，我們成功實作了 [`EightQuarterStatementTable.tsx`](../../src/components/analysis/EightQuarterStatementTable.tsx)，為個股深度財報提供了 8 季財務三表（資產負債表、損益表、現金流量表）的橫向對比全貌展開與成長率視圖。

在當前實作中：
- 表格標題行與各資料欄位之排版採用內聯樣式（如 `padding: '8px 12px'`, `fontSize: '13px'`, `fontWeight: 800` 等）。
- 雖然內聯樣式全面對齊 CSS 變數系統（如 `var(--bg-secondary)`, `var(--border-color)`）且執行效能卓越，但在 JSX 結構中重複出現相同的樣式物件宣告。

---

## 2. 改善方案與架構設計
在未來針對個股分析工作區進行介面細化或自訂欄位重構時，可進行以下代碼簡化：
1. **抽取靜態樣式常數物件**：
   ```typescript
   const TABLE_CELL_STYLES = {
     header: { padding: '8px 12px', fontWeight: 800, fontSize: '13px' },
     dataCell: { textAlign: 'right' as const, padding: '7px 10px', fontSize: '12px' },
   } as const;
   ```
2. **抽取專用子儲存格元件**：
   將正負數百分比徽章與數值儲存格進一步封裝為輕量純展示元件（如 `<StatementDataCell value={...} />`），使主表格程式碼行數由 290 行收斂至 180 行左右，進一步提升可讀性與測試縫隙。

---

## 3. 優先級與觸發時機
- **優先級**: `P3 (Low)`
- **狀態**: `OPEN`
- **收錄來源**: Code Review (Spec 0202 / PR #326 / Issue #322)
- **標籤**: `Refactor` · `UI` · `CleanCode` · `StockAnalysis` · `EightQuarterStatementTable`
- **觸發時機**: 待下次財務三表欄位擴充（如自訂季別比對或匯出 Excel）或個股分析工作區 UI 重構時一併引入。
