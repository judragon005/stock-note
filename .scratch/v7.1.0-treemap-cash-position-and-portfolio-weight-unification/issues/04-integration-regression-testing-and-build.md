# Ticket 04: 全量迴歸測試、極限邊界測試與 TypeScript 編譯驗證

## 任務描述
針對樹狀圖納入現金部位之變更，執行全面的單元測試與迴歸測試，驗證純股票、純現金、股票+現金、零現金等所有極端邊界，並確保 TypeScript 0 錯誤。

## 涉及檔案
- `src/utils/treemap.test.ts`
- `src/components/AllocationChart.test.tsx` (或建立對應測試)

## 驗收標準 (Acceptance Criteria)
1. 執行 `npm test`，確保專案既有所有單元測試（包含再平衡引擎、稅費、公司行動等）與新增測試 100% 通過。
2. 執行 `npm run build`，確保 TypeScript 編譯 0 錯誤、0 警告。
3. 驗證空倉狀態（無股票且無現金）、純現金狀態、大額現金狀態的 UI 渲染健全度。
