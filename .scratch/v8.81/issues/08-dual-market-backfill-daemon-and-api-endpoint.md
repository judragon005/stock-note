# 08-dual-market-backfill-daemon-and-api-endpoint

## Description
在 `scripts/market-sync/` 中建立台美雙軌背景全回補總控腳本 `backfill-full-market-history.cjs`，串接台股日期驅動回補與美股分級隊列回補。同時在 Vite 中介層 `vite-market-middleware.cjs` 中註冊 `POST /api/market/backfill-all` 與 `GET /api/market/backfill-status`，支援在背景守護運行且中斷可隨時透過 `sync_checkpoints` 續傳。

## Target Files
- `scripts/market-sync/backfill-full-market-history.cjs`
- `scripts/market-sync/vite-market-middleware.cjs`
- `package.json`

## Acceptance Criteria
- [x] 在 `package.json` 新增 NPM 快捷指令 `"market:backfill-all": "node scripts/market-sync/backfill-full-market-history.cjs"`。
- [x] 總控腳本支援參數 `--market=ALL|TW|US`、`--days=250`。
- [x] 支援在 SQLite `sync_checkpoints` 記錄完成日期，重啟時自動續傳不重抓。
- [x] 中介層提供 `POST /api/market/backfill-all` 啟動非同步背景長程任務，並提供 `GET /api/market/backfill-status` 供前端輪詢進度與當前狀態。
- [x] 撰寫測試驗證中介層路由與狀態查詢正確。

## Status
- [x] done
