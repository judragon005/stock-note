# 03 — 本地湖倉處置/注意事件快取讀取器

**What to build:** 
在 `src/engine/marketCacheLoader.ts` 擴充 `loadSymbolDispositionStatus(symbol: string, market: MarketType, referenceDate: Date)`。調用 Vite Lakehouse API `/api/lakehouse/dispositions?symbol=...`，透過 Ticket 01 與 02 判斷該標的最新有效狀態，輸出 `'NORMAL' | 'ATTENTION' | 'DISPOSITION'`。美股標的、離線或 API 失敗時平滑回退為 `'NORMAL'`。

**Blocked by:** 01 — 處置股票起訖日期有效視窗判定純函式, 02 — 注意股票最新交易日有效性判定純函式

**Status:** ready-for-agent

- [ ] 美股 (US) 標的直接回傳 `NORMAL`，不發送無效 API 請求
- [ ] 台股標的向本地湖倉發送查詢，並透過 Ticket 01/02 規則過濾有效狀態
- [ ] 優先級規則：若同標的既有處置又有注意，處置優先回傳 `DISPOSITION`
- [ ] 網路異常或伺服器 500 時，靜默回退 `NORMAL`，杜絕 UI 崩潰
