# Ticket 04: 主 K 線圖重疊雙灰線消除與券商法人色譜重構 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/aiForceDashboard/cards/KLineChartCard.tsx`
* **測試檔案**：`src/components/aiForceDashboard/cards/KLineChartCard.test.ts`

## 2. 需求描述 (Description)
1. 消除平行灰色重疊雙線：
   * 移除主 K 線圖 Y=220 處之 `<line y1={klineHeight} y2={klineHeight} />`。
   * 保留 Y=230 (`subchartTop`) 副圖頂部分界線，呈現單一微光分割。
2. 導出 `KLINE_MA_COLORS` 標準色譜常數：
   * `ma5`: `#eab308` (亮黃)
   * `ma10`: `#06b6d4` (青藍)
   * `ma20`: `#ec4899` (洋紅/桃紅)
   * `ma60`: `#f97316` (亮橘實線，粗度 1.5，廢除灰色虛線)
   * `ma250`: `#a855f7` (尊爵紫)
3. 色彩同步與實線化：
   * 頂部圖例、查價狀態列 Tooltip 與 SVG Polyline 折線顏色全面對齊。
   * MA60 折線取消虛線與淡化透明度，升級為波段高辨識實線。

## 3. 測試縫隙 (Test Seams)
* 驗證導出常數之顏色色相互斥性（5 個唯一值），以及價格/均線計算與繪製無退化。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0177 之 **AC 5, AC 6**。
* [ ] `src/components/aiForceDashboard/cards/KLineChartCard.test.ts` 測試 100% 綠燈。
