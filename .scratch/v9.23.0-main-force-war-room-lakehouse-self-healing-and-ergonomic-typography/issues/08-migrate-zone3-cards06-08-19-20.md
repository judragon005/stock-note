# 08 — Migrate Batch 2：Zone 3 籌碼與基本面卡片人體工學重構（Card 06~08, 19, 20）

**Parent:** #590 (Spec 0238)
**What to build:** 消除 `ForecastConeCard`（Card 06）與 `VwapCostStructureCard`（Card 07）`preserveAspectRatio="none"` 造成的文字拉伸壓扁；調升 `TdccDistributionCard`（Card 19）雙軸 SVG 與 `MonthlyRevenueCard`（Card 20，拔除 `scale(0.9)` 縮小）之文字至物理 `>= 12px`；全面清零 `InstitutionalFlowCard`（Card 08）及上述卡片中的所有微字級與 `#64748b` 低對比文字。
**Blocked by:** 05 — Card 19 單週集保幾何防禦與 Card 09/15 資券當沖回退閉環, 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級
**Status:** ready-for-agent

- [ ] Card 06 與 Card 07 解除文字隨 `preserveAspectRatio="none"` 的變形並達到物理字高 `>= 12px`。
- [ ] Card 20 移除 `transform: scale(0.9)`，所有月份標籤、KPI 與徽章字級 `>= 0.75rem (12px)`。
- [ ] Card 06、07、08、19、20 全數達到 `0` 處 `< 12px` 字級與 `0` 處 `#64748b` 文字。
