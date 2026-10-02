# ADR-0160: 市場數據過期自動追趕同步與主 K 線單一真實來源對齊

## 狀態 (Status)
已通過 (Accepted)

## 背景 (Context)
在主力戰情室的實盤使用中，發現兩項嚴重的架構與數據同步缺陷：
1. **排程錯過無追趕機制**：每日 16:00 (TW) 與 08:00 (US) 的 Windows 排程，在電腦休眠、關機或未連網時被錯過。開機或系統啟動時，缺乏自動檢查與追趕（Catch-up）同步機制，導致歷史數據庫形成斷層黑洞。
2. **湖倉資料陳舊與跨日期拼裝假數據**：
   - 本機 CSV 歷史庫已推進至 2026-10-02，但 SQLite 湖倉 (`market_history.db`) 仍停留在 2026-09-15 舊快照。
   - 致茂 (2360) 主 K 線圖從湖倉讀取，停留在 2026-09-15（收盤 2,110，成交量 410,783）。
   - 頂部看板透過即時 API 取得 2026-10-02 的收盤價（2,190.00），但因即時 API 缺開高低量，引擎竟私自取用 9/15 的日 K 開高低量進行填補，造就「今日收盤 2,190，但開高低量全是 9/15」的拼裝割裂數據，單一真實來源 (SSOT) 徹底破裂。

## 決策 (Decision)

### 1. Vite 中介層啟動過期巡檢與自動追趕 (Startup Catch-up Engine)
- 在 `scripts/market-sync/vite-market-middleware.cjs` 啟動時，非同步檢查 SQLite 湖倉 `daily_candles` 中各市場最新日期。
- 若 `MAX(date) < anchorTradingDate`，背景非同步啟動追趕 Worker，自動從本機 CSV 數據庫讀取最新數據匯入 SQLite（或呼叫盤後同步 API 補齊）。
- 新增 `GET /api/market/sync-status` 端點，回傳當前台美股資料最新日期與同步狀態。

### 2. 前端分頁甦醒與在線重新檢驗 (Online & Visibility Recheck)
- 於前端全域掛載 `visibilitychange` 與 `online` 監聽器。
- 電腦喚醒或切回頁面時，若伺服器已追趕完成新資料，自動觸發戰情室靜默刷新。

### 3. 主 K 線圖與頂部看板單一真實來源對齊 (Kline SSOT Auto-Stitch)
- **杜絕假數據拼裝**：若即時報價缺乏開高低量，且日 K 最後一根日期落後即時報價超過 1 個工作天，嚴禁將舊日 K 的開高低量填入今日欄位，開高低量設為 `undefined`。
- **日 K 自適應縫合**：當市場已結算且即時報價已有今日收盤資料時，若湖倉日 K 尚未推進至今日，引擎自動將今日真實收盤數據縫合為最後一根日 K 注入 `klineSystem.candles`，確保上下視圖 100% 同步。

### 4. 全市場歷史數據庫全量灌入 SQLite 湖倉
- 執行 `backfill-local-csv.cjs`，將 2,360 檔台股最新歷史 CSV（包含 2026-10-02 最新日 K）全量寫入本機 SQLite `daily_candles` 與 `tw_institutional_chips`。

### 5. 主力戰情室預載標的切換為 0050 (元大台灣50)
- 依據使用者指引，將戰情室進入時的預載標的常數由個股 `2360` 統一更換為台股市場標竿指數 ETF `0050`，包含 `App.tsx`、`AiForceDashboardView.tsx`、`HeaderMarketBar.tsx` 與 `aiForceDashboardEngine.ts` 預設值，消除預設載入偏狹個股之突兀感。

## 影響 (Consequences)

### 正向影響 (Positive)
- 徹底終結「關機開機後資料中斷落後」的痛點，系統隨開隨自動追趕。
- 徹底終結「頂部 10/2、主 K 線 9/15」的日期割裂與數字打架現象。
- 嚴格守護單一真實來源 (SSOT)，杜絕任何跨日期拼裝假數據。

### 負向影響與權衡 (Trade-offs)
- Vite 伺服器啟動時會有背景輕量檢查（採用非同步處理，不阻塞 HTTP 服務首屏響應）。
