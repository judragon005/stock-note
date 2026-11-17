# 02 — 雙軌安全匯出互動視窗與頂部導航列整合

**What to build:** 建立 `ExportDatabaseModal` 互動元件並與頂部導航列 (`Header.tsx`) 整合。匯出時提供使用者兩大路徑選擇：「預設：安全脫敏備份 (抹除 API Key)」與「家用：私有雲/NAS 完整遷移 (保留 API Key，高對比警告標註)」，並即時盤點六大實體筆數。

**Blocked by:** 01-unified-envelope-v2-schema-and-export-engine

**Status:** completed

- [x] 建立 `ExportDatabaseModal` 元件，展示實體筆數預覽（交易 696 筆、現金 729 筆、借貸合約等）
- [x] 提供「安全脫敏匯出」與「私有雲完整遷移」單選 Radio / Switch 按鈕，並針對完整遷移標記琥珀色高風險醒目標註
- [x] 在 `Header.tsx` 整合彈窗觸發，支援單鍵開啟或原快速匯出導流
- [x] 撰寫元件測試，驗證雙軌點擊後產出的 JSON 內容與安全性旗標符合預期
