# 02 — 動態無風險利率接軌 (USD 4.5% / TWD 1.8%) 與新增 CAGR 複利指標

**What to build:**
終結 `PortfolioGrowthChart.tsx` 中將無風險利率寫死為 `1.5%` 的問題，改為調用 `resolveDynamicRiskFreeRate(null, baseCurrency)`，在 USD 計價下使用真實 4.5%，TWD 計價下使用 1.8%，消滅美股投資人之超額報酬假象。在量化指標計算中擴充 `calculatePerformanceMetrics` 加入年化複合成長率（CAGR %）計算，並於走勢圖頂部「累積總損益」卡片新增 CAGR 數值標籤，為長期投資人提供戰勝市場複利標竿。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 在 `src/engine/quantMetrics.ts` 的 `calculatePerformanceMetrics` 新增 `cagrPercent` 計算：`((endingNAV / beginningCost) ** (365.25 / totalDays) - 1) * 100`
- [x] 在 `src/components/PortfolioGrowthChart.tsx` 將硬編碼 `1.5` 替換為 `resolveDynamicRiskFreeRate(null, baseCurrency)`
- [x] 在 `src/components/PortfolioGrowthChart.tsx` 的累積損益卡片中渲染 CAGR 百分比
- [x] 撰寫單元測試驗證 CAGR 公式邊界條件（天數不足或總成本為 0）與動態無風險利率適配性
