# 01 — 0050 標的查詢連動與自適應行情回退引擎 (Symbol Pipeline Sync & Resilient Fallback)

**What to build:**
使用者在頂部輸入 `0050`（或任意上市櫃/美股標的）並點擊「分析」時，系統正確觸發查詢管線，不再停留在硬編碼的 2,290.00 致茂舊資料。
若歷史 K 線回補異常或資料不足，具備基於即時報價的動態數值注入與明確的載入中/異常提示，確保資料連動真實可靠。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 檢查並優化 `loadDataForSymbol`：確保輸入 `0050` 時傳入正確的 cleanSymbol 與 TW 市場推斷
- [x] 重構 `createDefaultAiForceReport`：若回退發生，根據傳入的即時報價或標的代號自適應基礎價格，杜絕致茂 2,290 殘留
- [x] 確保頂部即時行情欄之「分析」按鈕具備明確的載入中狀態反饋
- [x] 單元測試：驗證切換至 `0050` 時，產生之報告價格與 `0050` 一致，不再為 2,290
