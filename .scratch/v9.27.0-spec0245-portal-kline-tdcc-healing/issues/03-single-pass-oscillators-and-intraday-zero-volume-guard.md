# 03 — 單趟 O(N) KDJ(含 J) / MACD / RSI(6·14) 序列引擎與盤中零量定錨隔離

**Parent:** #605 (Spec 0245)

**What to build:** 建立單趟 $O(N)$ 技術指標序列計算純函式，一次產出完整 K 棒數列之 `K(9)`、`D(9)`、`J = 3K - 2D`、`DIF(12,26)`、`DEA(9)`、`OSC`、`RSI(14)` 與 `RSI(6)`，取代既有週／月 K 切換時之 $O(N^2)$ 重複切片重算；同時建立盤中零量定錨守衛，當最新 K 棒為未結算盤中參考價且成交量為 0 時，量能指標自動退回前一已結算且有量之交易日（Anchor Trading Date）並回傳顯式定錨資訊。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 單趟 $O(N)$ 序列演算法正確產出每根 K 棒之 `K`、`D`、`J`（$J = 3K - 2D$）、`DIF`、`MACD(DEA)`、`MACD Hist`、`RSI(14)` 與 `RSI(6)`
- [ ] 當輸入數列不足特定指標所需期數（如月 K 不滿 26 期之 MACD 或不滿 14 期之 RSI）時誠實回傳 `undefined`，嚴格遵循 Zero-Mock 原則
- [ ] 當末筆 K 棒標記為盤中未結算且 `volume <= 0` 時，量能分析基準自動退回前一有效已結算交易日並標記 `isVolumeAnchoredToPrevClose = true`
- [ ] 當市場已結算或盤中具有效正成交量時，量能分析正常採用最新交易日且不誤觸定錨降級
- [ ] 核心計量引擎測試覆蓋 $O(N)$ 精度、J 值公式、短天期邊界與盤中零量隔離並 100% 通過
