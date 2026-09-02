# Issue #1: 核心型別與整戶總曝險、淨槓桿率演算法引擎 (Risk Exposure Engine & TDD)

## 任務目標
1. 在 `src/types/` 新增 `exposure.ts` 或擴充相關型別（`PortfolioExposureMetrics`, `LeverageRiskTier` 等）。
2. 建立 `src/engine/riskExposureEngine.ts`，實作：
   - 計算總股票現值 ($V_{\text{stock}}$)、可用現金 ($C$)、總借款負債 ($D$)、淨資產 ($\text{NAV}$)。
   - 計算總曝險額 (Gross Exposure)、總槓桿率 (Gross Leverage)、淨槓桿率 (Net Leverage)。
   - 實作四級風險燈號判定 (`CONSERVATIVE`, `MODERATE`, `ELEVATED`, `HIGH_RISK`) 與防除以零邊界保護。
3. 建立 `src/engine/__tests__/riskExposureEngine.test.ts`，編寫 100% 覆蓋之單元測試。

## 驗收標準
- `npm test` 通過所有槓桿與總曝險邊界計算測試。
- $\text{NAV} \le 0$ 時優雅防禦不拋出 NaN 或 Infinity。
