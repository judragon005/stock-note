# 12 — 雷達圖半徑擴大 (maxRadius 76 ➔ 96)

**What to build:**
修改 `RiskSpiderCard.tsx`，將 SVG 五角蛛網圖的最大半徑 `maxRadius` 由原本寫死的 76 擴大至 96（半徑擴大約 26%），並依比例重新計算同心多邊形網格（Grid Polygons）與資料多邊形頂點坐標，使雷達圖充滿繪圖區域。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `maxRadius` 調整為 96。
- [ ] 同心五角網格與風險多邊形飽滿放大，不超出 SVG viewBox。
