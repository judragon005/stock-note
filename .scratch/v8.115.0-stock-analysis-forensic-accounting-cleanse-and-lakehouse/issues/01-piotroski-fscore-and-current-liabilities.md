# 01 — Piotroski F-Score 增資稀釋動態評分與流動負債係數剔除

**GitHub Issue:** #323  
**Parent:** #322 (Spec 0202)  
**Status:** ready-for-agent  

## What to build
在 `src/engine/keyMetricsEngine.ts` 中修復 Piotroski F-Score 第 5 項（未增資稀釋），改為依據近 4 季流通股數或股本變動動態評分，嚴禁寫死 `passed: true`。
同時拔除流動負債 `總負債 * 0.5` 臆測係數，無流動負債時誠實標註無法計算。

## Acceptance criteria
- [ ] Piotroski F-Score 第 5 項依據真實股本或流通股數 YoY 增長率是否超過 5% 動態判定，不再寫死 true。
- [ ] 移除 keyMetricsEngine.ts 中的總負債 * 0.5 臆測係數，缺漏資料時誠實標註無法計算。
- [ ] 單元測試覆蓋增資稀釋給分與扣分情境，以及流動負債缺漏邊界情境。
- [ ] `npm test` 100% 通過，`npm run build` 0 錯誤。

## Blocked by
None — can start immediately.
