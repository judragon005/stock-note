# 03 — 台股專屬籌碼金絲雀指標 (外資期貨淨空單 & 130% 斷頭維持率)

**Parent:** #283

**What to build:**
擴充台股專屬風控與多空籌碼金絲雀，納入外資台指期淨未平倉口數（Net Open Interest）與全市場融資維持率（130% 斷頭追繳警界線），精準解讀台股流動性與潛在多殺多/軋空風險。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 擴充 `MacroIndicatorSnapshot`，新增台股專屬欄位：
  - `twFuturesNetOi?: number` (外資台指期淨未平倉口數，負數為淨空單，如 -35000)
  - `twMarginMaintenance?: number` (全市場融資維持率 %，如 165.2)
  - `twFuturesRiskLevel?: 'BULLISH' | 'NEUTRAL' | 'HIGH_ALERT' | 'EXTREME_SHORT'`
  - `twMarginRiskLevel?: 'SAFE' | 'WARNING' | 'LIQUIDATION_RISK'`
- [ ] `src/engine/macroAdvisorEngine.ts` 實作台股籌碼風控評估函數 `evaluateTwMarketRisk(netOi?: number, marginRatio?: number)`。
- [ ] 當外資淨空單超過 3 萬口時標記為 `HIGH_ALERT`，超過 4.5 萬口為 `EXTREME_SHORT`；融資維持率低於 140% 為 `WARNING`，低於 130% 為 `LIQUIDATION_RISK`。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證數值邊界與空值防禦。
