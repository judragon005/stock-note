# 05 — 動態流通股數推導與 FCF Yield / DCF 估值修正 (Dynamic Shares, FCF Yield & DCF)

**What to build:**
根除因發行股數寫死 1000 萬股導致自由現金流報酬率 (FCF Yield) 飆至 9135% 及現金流折現 (DCF) 每股內在價值膨脹至 28.5 萬元的嚴重算力缺陷。改由第一性原理從資本額動態推導真實股數（如台泥 75.3 億股），並以近 4 季 TTM FCF 計算合理報酬率，DCF 輸出正確的每股實質公允價值。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 在 `keyMetricsEngine.ts` 實作兩階段動態股數推導：優先採用 `capitalStock / 10`，備援採用 `netIncome / eps`
- [x] 修正 `calculateFcfYield`，支援陣列計算滾動 4 季 TTM FCF，使台泥 FCF Yield 回歸合理百分比區間
- [x] 修正 `calculateDcfValuation`，折現企業整體企業價值後除以動態推導總股數，產出合理每股內在價值（如台泥 25~55 元）
- [x] 單元測試通過 70 億以上股本大型股之動態股數解析與財務數值邊界查驗
