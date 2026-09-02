# Issue #1: 核心型別與多批次沖銷演算法引擎 (Lot Engine Core & TDD)

## 任務目標
1. 建立 `src/types/lot.ts`，定義 `TaxLot`, `LotDisposal`, `AccountingMethod`, `TaxComparisonResult` 型別與繁中名詞常數。
2. 建立 `src/engine/lotEngine.ts`，實作五大會計沖銷演算法 (`MOVING_AVERAGE`, `FIFO`, `LIFO`, `HIFO`, `SPECIFIC_LOT`)。
3. 建立 `src/engine/__tests__/lotEngine.test.ts`，編寫 100% 覆蓋之 TDD 單元測試。

## 驗收標準
- `npm test` 通過所有基本買賣沖銷測試案例。
- 驗證出清全部持股時，所有模式之累計已實現損益完全相等。
