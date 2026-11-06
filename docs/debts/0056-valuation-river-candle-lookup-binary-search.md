# 技術債 0056: 估值河流圖歷史收盤價匹配二元搜尋優化 (Valuation River Candle Lookup Binary Search)

## 1. 摘要與背景
在 Spec 0219（PR [#461](https://github.com/judragon005/stock-note/pull/461)）中，我們成功在 [`AnalysisMetricView.tsx`](../../src/components/analysis/AnalysisMetricView.tsx) 中的 P/E 與 P/B 估值河流圖中注入了真實日 K 線的歷史收盤價軌跡紅線。

在當前實作中：
- 針對歷史 8 季、12 季或 20 季的每個結算日 `r.periodDate`，透過反向搜尋比對最近交易日之收盤價：
  ```typescript
  const match = [...historicalCandles].reverse().find((c) => c.date <= r.periodDate);
  ```
- 雖然在歷史 20 季與 250 天日 K 線的情境下，運算量僅 $20 \times 250 = 5,000$ 次操作（在瀏覽器端執行時間 $< 1\text{ms}$，完全不影響流暢度），但在日 K 歷史擴展至 3~5 年（約 1,250 根 K 線）或標的切換頻繁時，每次渲染執行重複的陣列拷貝與反向線性搜尋有進一步優化空間。

---

## 2. 改善方案與架構設計
在未來針對個股分析圖表進行大規模技術重構或效能調校時，可進行以下算法優化：
1. **迴圈外預先排序與二元搜尋 (Binary Search)**：
   日 K 線本身已依日期自然遞增排序，可在河流圖外層定義二元搜尋輔助函式 `findLatestCloseBeforeDate(candles, targetDate)`，將單次匹配時間複雜度由 $\mathcal{O}(N)$ 降為 $\mathcal{O}(\log N)$。
2. **記憶體快取 (Map Memoization)**：
   在標的與日 K 線不變的前提下，透過 `useMemo` 將各季度結算日對應的收盤價一次性快取，徹底消除河流圖重繪時的冗餘計算。

---

## 3. 優先級與觸發時機
- **優先級**: `P3 (Low)`
- **狀態**: `OPEN`
- **收錄來源**: Code Review (Spec 0219 / PR #461 / Issue #462)
- **標籤**: `Performance` · `Algorithm` · `StockAnalysis` · `ValuationRiver` · `BinarySearch`
- **觸發時機**: 待日 K 線快取範圍擴充超過 500 天或進行前端圖表虛擬化渲染時實作。
