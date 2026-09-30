# 03 — 03 多維度判讀六角雷達圖與維度文字視覺放大 (Card 03 Radar Magnification)

**What to build:**
放大 Card 03 六角雷達圖本體與標籤文字，將最大半徑由 88px 擴展至約 100px。
六大維度標籤文字（法人、趨勢、籌碼、流動、波動、動能）放大至 13px（加粗高對比），數值分數提升至 12px（科技藍高亮），中心綜合評分圓環與字體等比放大，達到一眼看清各維度的視覺體驗。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 調整 `MultiDimensionRadarCard` 內 SVG viewBox 與中心配置，擴大 `maxRadius` 至 98~102px
- [x] 提升 6 大軸端維度標籤至 13px (粗體、高對比色彩)
- [x] 提升維度分數文字至 12px (高亮藍色)
- [x] 等比放大中心綜合評級字體 (評級字級 16px、分數 10px)
- [x] 單元測試：驗證雷達頂點幾何計算與放大尺寸樣式正確性
