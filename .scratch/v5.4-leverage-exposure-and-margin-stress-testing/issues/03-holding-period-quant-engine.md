# Issue #3: 加權持股天數與資金週轉量化引擎 (Holding Period Engine & TDD)

## 任務目標
1. 在 `src/types/` 定義持有天數與週期標籤型別（`HoldingPeriodCategory`, `HoldingPeriodMetrics` 等）。
2. 建立 `src/engine/holdingPeriodEngine.ts`，實作：
   - 結合 `TaxLot[]` 或買進交易紀錄，依買進成本加權計算加權平均持有天數（Weighted Average Holding Days）。
   - 實作五大策略週期標籤分類（超短線、短線波段、中期波段、長線存股、稅務長期）。
3. 建立 `src/engine/__tests__/holdingPeriodEngine.test.ts`，編寫 100% 覆蓋之單元測試。

## 驗收標準
- `npm test` 通過單筆、多筆買進、等比分攤與零持股邊界測試。
