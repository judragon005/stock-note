# 07 — Migrate Batch 1：Zone 1 & 2 SVG 視口校正與字高解放（Card 01~05）

**Parent:** #590 (Spec 0238)
**What to build:** 消除 `KLineChartCard`（Card 01）因 `preserveAspectRatio="none"` 造成的 2x 文字橫向拉伸失真；收緊 `MultiDimensionRadarCard`（Card 03）與 `RiskSpiderCard`（Card 05）的 `viewBox` 冗餘留白並調升內部字級，確保容器縮放後所有標籤物理渲染高度 `>= 12px`；並將 Card 01~05 全部 `< 12px` 微字與 `#64748b` 低對比文字升級至人體工學標準。
**Blocked by:** 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級
**Status:** ready-for-agent

- [ ] `KLineChartCard` 含文字圖表不再發生 `preserveAspectRatio="none"` 字體拉伸變形，且所有刻度與指標字級換算物理高度 `>= 12px`。
- [ ] `MultiDimensionRadarCard` 與 `RiskSpiderCard` 經 `minHeight` 容器縮放後，軸標籤與分數物理高度 `>= 12px`。
- [ ] Card 01~05（含 `AiDecisionCoreCard`、`VolumeProfileCard`）`0` 處 `< 12px` 字級與 `0` 處 `#64748b` 文字。
