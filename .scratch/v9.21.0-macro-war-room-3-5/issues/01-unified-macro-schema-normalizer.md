# 01 — 統一宏觀數據海關正規化器 (Dual-Schema Normalizer)

**Parent:** #584 (Spec 0235)

**What to build:** 擴充 `MacroIndicatorSnapshot` 型別與 `sanitizeMacroRecord` 雙向別名映射，讓 `/api/market/macro` 回傳之 `treasuryYield10y`、`treasuryYield2y`、`riskFreeRate3m`、`yieldSpread10y2y`、`cnnFearGreedScore`、`creditSpreadOas`、`cccSpreadOas`、`igSpreadOas`、`breakeven10y`、`initialClaims`、`usOrdersMinusInvSpread`、`soxClose`、`taiexClose`、`sp500Close`、`nasdaqClose`、`twRevenue` 等 100% 無損流入前端狀態。當遠端欄位缺失時保留本地既有有效值、動態重算 `vixLevel` 與 `fearAndGreedLevel`，並將黃金價格防呆由 `>= 2800` 放寬為 `> 500`。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `sanitizeMacroRecord` 完整映射後端 camelCase / snake_case / 前端舊鍵名，非空真實欄位不被 fallback 常數覆蓋
- [ ] `vixLevel` 與 `fearAndGreedLevel` 隨最新數值動態重算
- [ ] 遠端部分欄位缺漏 (`null`/`undefined`) 時不抹除既有 `soxIndex`、`taiexIndex`、`sp500Index`、`nasdaqIndex`
- [ ] `macroPulseStorage.test.ts` 新增對應黑盒斷言並全數綠燈
