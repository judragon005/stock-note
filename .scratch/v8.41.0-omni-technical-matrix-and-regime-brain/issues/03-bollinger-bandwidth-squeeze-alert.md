# 03 — Bollinger Bandwidth Squeeze & Volatility Breakout Alert

**What to build:** 
實作布林通道極致壓縮偵測。當前布林帶寬（Bandwidth）< 8% 或創近 20 日新低時，標記 `isSqueezed: true`，並在指標結果中輸出 `ALERT_BB_SQUEEZE`（布林極致壓縮 / 變盤在即警報），並附帶「方向未決，靜待放量突破」之文字說明。

**Blocked by:** 01 — Market Regime Evaluator & Pure State Machine

**Status:** ready-for-agent

- [x] 擴充 `BollingerBandResult` 型別，包含 `isSqueezed: boolean`
- [x] 實作布林通道帶寬壓縮檢測邏輯
- [x] 單元測試驗證帶寬 6.75% 時正確觸發 `isSqueezed` 與 `ALERT_BB_SQUEEZE`
