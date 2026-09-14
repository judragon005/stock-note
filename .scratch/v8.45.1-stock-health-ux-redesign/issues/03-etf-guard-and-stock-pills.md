# 03 — ETF 智慧識別防呆橫幅、標的快捷膠囊與工作區重構 (ETF Guard & Stock Pills)

**What to build:**
重構 `src/components/health/StockHealthWorkspace.tsx`：
1. **全面原生化**：
   - 頂部藍色說明 Banner：科技海軍藍漸層、右側心跳醫療箱發光微動畫，折疊按鈕支援 localStorage 狀態記憶。
   - 標的 Header：原生卡片樣式、標的代碼名稱、即時價格與漲跌膠囊、追蹤按鈕、重新整理按鈕。
   - 右側「深入了解」側邊欄：原生毛玻璃卡片、展開/收起問答排版。
2. **ETF 智慧識別防呆橫幅**：
   - 偵測代碼是否為 ETF（以 `00` 開頭、`00403A`、美股知名 ETF `SPY`/`QQQ`/`VOO` 等）。
   - 若為 ETF，於卡片區頂部展示醒目琥珀色毛玻璃防呆橫幅：「⚠️ 本標的為 ETF / 指數型基金，非一般企業個股...」，提供一鍵切換至成分股/個股捷徑按鈕。
   - 預設標的優先選擇庫存普通股，若庫存全為 ETF 則預設熱門個股 `2330`。
3. **熱門/持倉個股快捷膠囊 (Stock Pills)**：
   - 提供在庫個股與熱門權值標的（2330 台積電、2454 聯發科、2317 鴻海、IBM、NVDA、AAPL）之橫向滾動膠囊列，點擊一秒切換。

**Blocked by:** Ticket 01, Ticket 02

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #57

- [x] `StockHealthWorkspace.tsx` 全面遷移至專案原生樣式
- [x] 實作 ETF 智慧檢驗與琥珀色毛玻璃防呆橫幅
- [x] 實作持倉與熱門個股快捷膠囊列 (Stock Pills)
- [x] 預設標的智慧錨定普通股

