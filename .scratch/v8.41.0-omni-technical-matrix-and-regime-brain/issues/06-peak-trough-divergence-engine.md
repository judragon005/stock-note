# 06 — Peak-Trough Divergence Engine (RSI & MACD)

**What to build:** 
實作頂背離與底背離偵測純函式 `detectDivergence`。搜尋最近 20 根 K 線的局部波峰 (Swing Highs) 與波谷 (Swing Lows)；當價格創波段新高但 RSI 或 MACD 柱狀體頭部走低時，觸發頂背離警報 `ALERT_BEARISH_DIVERGENCE`；當價格破底但指標抬高時觸發底背離警報 `ALERT_BULLISH_DIVERGENCE`。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 型別定義新增 `DivergenceResult` (含 `hasBearishDivergence`、`hasBullishDivergence`、`indicatorSource`)
- [x] 實作局部極值比對與背離偵測演算法
- [x] 單元測試驗證股價二度創高但 RSI 頭頭低時精確觸發頂背離
