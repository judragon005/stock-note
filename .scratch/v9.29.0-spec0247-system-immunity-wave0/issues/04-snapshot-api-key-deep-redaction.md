# 04 — 修補雙軌安全脫敏匯出漏洗歷史快照明文金鑰

**Parent:** #609 (Spec 0247)

**What to build:** 升級全態資料庫安全脫敏匯出與備份脫敏工具，對系統設定與每一筆歷史時光機快照內的明文金鑰執行深度清洗；完整遷移模式 100% 向後相容。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 安全脫敏模式輸出全文 0 處殘留任何歷史快照內之明文 API Key
- [x] 完整遷移模式保留完整快照與設定不退化
- [x] 備份脫敏工具同步覆蓋 snapshots 結構
