# 04-lakehouse-api-extension-and-frontend-loader

## Description
在 `scripts/market-sync/vite-market-middleware.cjs` 擴展 `/api/market/history/:symbol` 端點，回傳欄位新增 `tdcc` 與 `revenue`；在 `src/engine/marketCacheLoader.ts` 擴展 `loadSymbolFullLakehouseData` 結構，支援前端接收與緩存集保大戶與月營收數據。

## Acceptance Criteria
- [ ] `/api/market/history/:symbol` 回傳結構包含 `tdcc` 與 `revenue` 陣列。
- [ ] `marketCacheLoader.ts` 介面擴充並相容無 TDCC/營收之降級場景。
- [ ] 撰寫單元測試覆蓋中介層路由查詢與前端 loader 解析。

## Status
- [x] done
