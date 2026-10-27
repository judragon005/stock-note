# Ticket 04: EightQuarterStatementTable 樣式常數與展示儲存格抽取

* **關聯技術債：** [0053](../../docs/debts/0053-eight-quarter-statement-table-style-constants-extraction.md)
* **目標檔案：** `src/components/analysis/EightQuarterStatementTable.tsx`
* **狀態：** `DONE`

## 工作項目
1. 抽取 `TABLE_CELL_STYLES` 樣式常數物件。
2. 封裝純展示型子儲存格輔助，精簡主表格 JSX 體積。
3. 確保 8 季三表所有對比、百分比徽章與顏色完全不變。
