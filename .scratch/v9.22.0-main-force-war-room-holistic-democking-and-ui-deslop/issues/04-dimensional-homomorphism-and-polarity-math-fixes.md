# Issue 04: 台股「股 vs 張」1000 倍量綱除錯與正負極性算術校驗

- **層級**: 計算引擎 / 量綱同態
- **關聯規格**: Spec 0237 Ticket 4 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 在健康度評估、五維風險蛛網、AI 信心度、六維雷達與市場情緒 `institutionalNetRatio` 計算中，台股日 K `volume`（若為股數則除以 1000 換算為張數）進行標準化後再與張數門檻及法人張數運算。
2. 修正 Card 11 健康度總評將負向 `liquidityRisk` 混加問題，轉換為正向安全度 `100 - liquidityRisk` 參與加權平均。
3. 修正 Card 07 VWAP 成本帶正負乖離標籤顛倒問題；動態傳入現價（消滅寫死 1240）。
