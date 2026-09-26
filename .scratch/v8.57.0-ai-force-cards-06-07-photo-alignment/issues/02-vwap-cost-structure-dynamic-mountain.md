# 02 — 卡片 07 主力成本結構分佈圖動態 60 日多時段堆疊山峰面積圖與圖例統一

**What to build:**  
升級 `vwapCostEngine.ts` 與 `VwapCostStructureCard.tsx`：淘汰寫死的 4 條靜態假 SVG `<path>`。基於近 60 日歷史 K 線採樣 4 個時點（如 06/25, 07/10, 08/10, 08/31），計算各時點相對 VWAP 之「倉儲區 (>5%)、套牢區 (-2~-5%)、主力成本區 (±2%)、大量成交區 (±2~5%)」成交量高度（0~60k），動態繪製流暢的 4 層堆疊平滑山峰面積圖（橙黃 ➔ 翠綠 ➔ 天藍 ➔ 深藍）。右上方圖例與名詞嚴格對齊照片；標題校正為繁體「07 主力成本結構分佈圖」；強弱指標文字色彩對齊天藍色。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 在 `vwapCostEngine.ts` 新增 `CostBandNode` 結構與採樣演算法，輸出 4 個時間點的各層成交量高度。
- [x] 在 `VwapCostStructureCard.tsx` 中建立真實平滑堆疊面積路徑計算，取代寫死的貝茲曲線。
- [x] 圖例名詞與色塊統一對齊：`倉儲區(>5%)`、`套牢區(-2~-5%)`、`主力成本區(±2%)`、`大量成交區(±2~5%)`。
- [x] 卡片標題校正為「07 主力成本結構分佈圖」，強弱指標文字色彩對齊天藍色。
- [x] 擴充 `vwapCostEngine.test.ts` 與 `VwapCostStructureCard.test.ts` 驗證動態多峰與圖例正確性。
