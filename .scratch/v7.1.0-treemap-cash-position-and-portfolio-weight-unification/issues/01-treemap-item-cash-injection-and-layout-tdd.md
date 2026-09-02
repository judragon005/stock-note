# Ticket 01: 樹狀圖現金節點動態注入與 Squarified 佈局演算法單元測試 (TDD)

## 任務描述
更新樹狀圖資料結構與佈局計算邏輯，支援動態注入「現金部位 (CASH_TWD)」，並針對 Squarified Treemap 計算進行完整的單元測試覆蓋（包含純股票、股票+現金、純現金、零/負現金邊界）。

## 涉及檔案
- `src/utils/treemap.ts`
- `src/utils/treemap.test.ts`

## 驗收標準 (Acceptance Criteria)
1. 確保 `TreemapItem` 與 `computeTreemapLayout` 能正確處理含有 `market: 'CASH'` 或 `id: 'CASH_TWD'` 的資料節點。
2. 在 `src/utils/treemap.test.ts` 擴充測試案例：
   - 案例 1：股票 + 現金部位混合輸入，驗證現金節點面積符合其權重佔比，且所有節點權重總和為 100%。
   - 案例 2：純現金輸入 (0 持股)，驗證產生單一佔滿 100% 視圖之現金矩形節點。
   - 案例 3：負現金或 0 現金防呆邊界，驗證不產生無效節點或 NaN 座標。
3. 執行 `npm test src/utils/treemap.test.ts` 100% 綠燈通過。
