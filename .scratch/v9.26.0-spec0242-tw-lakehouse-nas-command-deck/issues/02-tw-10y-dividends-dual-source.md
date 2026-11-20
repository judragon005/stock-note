# 02 — 台股上市櫃 10 年完整歷史除權息雙源建庫

**What to build:** 整合 TWSE TWT49U 與 TPEx exDailyQ 年份批次介面，15 秒內建置 10 年全市場除權息庫，採 ON CONFLICT DO UPDATE 冪等寫入。

**Blocked by:** 01 — LAKEHOUSE_DB_PATH 環境變數持久化契約

**Status:** done

- [x] 支援 TWSE TWT49U 與 TPEx exDailyQ 解析
- [x] 冪等寫入不覆蓋既有發放日
- [x] 提供 npm run backfill:dividends:10y
