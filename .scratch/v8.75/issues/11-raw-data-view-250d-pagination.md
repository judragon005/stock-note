# 11 — 任務五：原始量化數據總表 250 筆日 K 降序分頁與跳頁升級

**What to build:** `RawDataView` 升級支援完整 250 筆真實日 K、MA20、KD、MACD、RSI，每頁 10 筆，共 25 頁，支援快速翻頁與頁碼跳轉。

**Blocked by:** 06 — 報表引擎徹底拔除 5 根 Mock 日 K 與硬編碼假數值

**Status:** closed

- [x] 升級 `paginateCandles` 支援 250 筆數列
- [x] 升級 `TaskPanels.tsx` 中的 `RawDataView` 分頁控制列，支援直接跳頁與快速翻閱
- [x] 撰寫測試驗證 250 筆資料分頁為 25 頁且翻頁功能正確
