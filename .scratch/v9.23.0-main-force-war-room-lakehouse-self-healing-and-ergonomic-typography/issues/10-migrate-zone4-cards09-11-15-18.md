# 10 — Migrate Batch 4：Zone 4 資券健康度與主力總評判卡片重構（Card 09, 11, 15~18）

**Parent:** #590 (Spec 0238)
**What to build:** 將 Zone 4 所有卡片（`DayTradeRiskCard`、`HealthSummaryCard`、`ChipsSummaryCard`、`ForceDistributionCard`、`BullBearStrengthCard`、`MainForceVerdictCard` 及其 Quant Deep-Dive 彈窗）內所有 `9px ~ 11.84px` 微字與 `#64748b` 低對比文字全面升級至 `>= 12px` 與 `#94a3b8` 以上，並將 `MainForceVerdictCard` 非活躍光譜階段不透明度從 `0.45` 提升至 `>= 0.75`。
**Blocked by:** 05 — Card 19 單週集保幾何防禦與 Card 09/15 資券當沖回退閉環, 06 — Expand：戰情室人體工學字級契約、Layer 6 雙欄矩陣與頂部 Bar 升級
**Status:** ready-for-agent

- [ ] `MainForceVerdictCard` 及其 Quant Deep-Dive 彈窗表格內 `9px ~ 11.5px` 全部升級至 `>= 12px`，非活躍光譜 `opacity >= 0.75`。
- [ ] Card 09、11、15、16、17 圓環標籤與底部說明全部升級至 `>= 0.75rem (12px)`，且 `0` 處 `#64748b` 文字。
