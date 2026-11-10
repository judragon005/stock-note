# Ticket 02: 大類資產分類器與 etf_daily_nav 折溢價守門員

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 擴充 `src/types/allocation.ts` 與 `src/types/stock.ts`：新增 `AssetClassCategory`、`ZavyAssetBucket` 與 `TargetAllocationType` 之 `'ASSET_CLASS'` 支援。
2. 擴充 `src/engine/rebalancingEngine.ts`：
   - 實作 `classifyZavyAssetClass` 純函式，精準區分市值型核心、高股息、波段衛星、長/中/短天期純公債、投資級公司債、黃金、REITs 與高危剔除池。
   - 實作 `validateEtfNavPremium` 折溢價守門員，溢價 `>0.5%` 提示、`>1.0%` 攔截並推薦同類平價替代標的。

## Acceptance criteria
- [x] 單元測試涵蓋台美主流 ETF（`0050`、`VT`、`00878`、`00919`、`00679B`、`00865B`、`00720B`、`00712`、`00680L`、`00635U`）。
- [x] 折溢價防買貴邏輯在 `etf_daily_nav` 溢價 `>1.0%` 時回傳 `blocked = true` 與同類平價替代清單。
