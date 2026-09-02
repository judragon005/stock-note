# Subtask 04: P2-05 跨 Lot 沖銷、手續費分攤、MOVING_AVG 歸因與 TaxOptimizer 測試全量補齊

- **父任務**：[issue-0036.md](issue-0036.md)
- **狀態**：`READY_FOR_DEV`
- **分流標籤**：`ready-for-agent`
- **優先級**：`P2`

## 任務目標
1. 於 `src/engine/lotEngine.test.ts` 中擴充：
   - 跨多 Lot 部分賣出（例如買 100+100 賣 150）測試案例。
   - 買賣雙向非零手續費與證交稅按比例精確平攤測試。
   - 移動平均法加權平均持有天數與長短期判定測試。
   - 浮點差額法扣減守恆與零碎股殘留測試。
2. 建立 `src/engine/taxOptimizer.test.ts`：
   - 測試 `scanTaxLossHarvestingOpportunities` 依虧損幅度排序、未實現虧損門檻篩選及長短期建議生成。
