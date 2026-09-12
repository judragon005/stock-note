# 01 — Market Regime Evaluator & Pure State Machine

**What to build:** 
定義市場狀態枚舉與純狀態判定函式 `evaluateMarketRegime`。綜合 ADX(14)、布林帶寬 Bandwidth、EMA 與均線斜率，精確輸出 `CHOPPY_RANGE`、`VOLATILITY_SQUEEZE`、`TREND_BULL`、`TREND_BEAR` 四大狀態及中文註釋。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 在 `src/types/omniIndicator.ts` 新增 `MarketRegime` 型別與介面
- [x] 於 `src/engine/omniIndicatorEngine.ts` 實作 `evaluateMarketRegime` 純函式
- [x] 單元測試驗證 ADX < 20 判為 `CHOPPY_RANGE`，Bandwidth < 8% 判為 `VOLATILITY_SQUEEZE`
