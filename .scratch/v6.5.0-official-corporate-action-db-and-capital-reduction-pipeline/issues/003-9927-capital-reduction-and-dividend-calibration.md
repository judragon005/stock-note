# 003 — 9927-capital-reduction-and-dividend-calibration

**What to build:**
校準泰銘 (9927) 2025-09-15 減資與 2026-10-01 除息事件（在籍 10,000 股、未稅 50,000 元、稅後 48,945 元、發放日 2026-10-29），連動現金帳本待交割流水校正，並通過全量 TDD 與 TypeScript 編譯檢驗。

**Blocked by:** 002-twse-openapi-and-finmind-backfill-pipeline

**Status:** closed

- [x] 官方行動庫補齊 9927 於 2025-09-15 之現金減資（28.28%，退款 2.828 元）
- [x] 校正 9927 於 2026-10-01 除息之發放日為 2026-10-29
- [x] 驗證減資與交易時序回溯後，2026-09-30 在席股數為 10,000 股，未稅股息 50,000 元，稅後 48,945 元
- [x] 現金帳本自動連動流水同步校正為 `+NT$ 48,945` 且狀態為 `PENDING`
- [x] 全量執行 `npm test`（100% 通過）與 `npm run build`（TypeScript 0 錯誤）

