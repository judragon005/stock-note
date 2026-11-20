# 03 — TDCC 官方免費歷史集保 15 級距解析與增量寫庫

**What to build:** 廢棄免費 400 的 FinMind 端點，改接 TDCC 官方 qryStock 免費補齊 12~51 週歷史集保。

**Blocked by:** 01 — LAKEHOUSE_DB_PATH 環境變數持久化契約

**Status:** done

- [x] 正確解析 SYNCHRONIZER_TOKEN 與 51 週清單
- [x] 15 級距聚合口徑與 OpenData 100% 一致
