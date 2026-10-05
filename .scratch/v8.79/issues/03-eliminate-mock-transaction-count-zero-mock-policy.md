# 03-eliminate-mock-transaction-count-zero-mock-policy

## Description
貫徹專案「零假資料政策 (Zero Mock Policy)」與「誠實無數據 (Honest Empty State)」原則，徹底拔除 `src/engine/aiForceDashboardEngine.ts` 第 1085-1089 行中隨意以 `volume * 2.3` 粗暴偽造成交筆數的違規代碼，並補充金融常識邊界測試。

## Acceptance Criteria
- [x] 徹底刪除 `transactionCount: Math.round(... * 2.3)` 偽造邏輯。
- [x] 當資料來源（歷史日 K CSV 等）未提供成交筆數時，`transactionCount` 嚴格回傳 `undefined`，由前端 `HeaderMarketBar.tsx` 安全格式化為 `-`。
- [x] 僅當真實報價來源（如 TWSE MIS API 明確帶有成交筆數欄位）時才填入實際數值。
- [x] 建立金融常識防線端到端與單元測試：驗證任何個股在無真實筆數資料時絕不產出假筆數；若有筆數資料，單日成交筆數絕不得大於成交股數。
- [x] 確保 `npm test` 100% 通過與 `npm run build` TypeScript 0 錯誤。

## Status
- [x] done
