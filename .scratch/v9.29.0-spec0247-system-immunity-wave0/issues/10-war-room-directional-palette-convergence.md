# 10 — 收斂戰情室方向極性卡片硬編碼色票至 Directional Palette SSOT

**Parent:** #609 (Spec 0247)

**What to build:** 將 7 張具漲跌方向極性之戰情卡片（`BullBearEnergyCard`、`BullBearStrengthCard`、`AiDecisionCoreCard`、`EnergySentimentTwinCard`、`MonthlyRevenueCard`、`TdccDistributionCard`、`ForceDistributionCard`）全面收斂至統一方向色票解析契約 `resolveDirectionalPalette`，消除三元色票繞過與台股撞色。（註：`AiConfidenceCard` 為模型品質信心分級卡片，非漲跌方向極性，刻意維持綠高／紅低品質分級語意。）

**Blocked by:** None — can start immediately

**Status:** done

- [x] 7 張方向極性戰情卡片均透過統一方向色票解析函式取得漲跌色系
- [x] 切換台股（紅漲綠跌）與國際（綠漲紅跌）主題及美股推斷模式時視覺極性 100% 正確
