# 需求規格說明書：全市場歷史日 K 本地緊湊快取注入 IndexedDB 與 Yahoo 代理防限流降級規範 (Compact History IndexedDB Hydration & Yahoo Proxy Resilience)

- **規格編號**：`SPEC-0154`
- **狀態**：`READY_FOR_AGENT`
- **領域上下文**：`歷史日 K 回補引擎 (Historical OHLCV Backfill)`、`市場快取載入器 (Market Cache Loader)`、`AI 主力戰情室 (AI Force Decision Dashboard)`、`代理路由 (Vite Proxy)`
- **關聯 PRD / ADR**：[ADR-0134](../adr/0134-full-market-history-backfill-and-reconciliation-pipeline.md)、[ADR-0141](../adr/0141-ai-force-live-pipeline-and-interactive-kline.md)、[ADR-0150](../adr/0150-pending-market-close-pre-close-anchor-and-alert.md)、[ADR-0152](../adr/0152-ai-force-real-data-ssot-and-unsettled-empty-state.md)

---

## Problem Statement

使用者在「AI 主力戰情室」查詢標的（如新掛牌的主動型 ETF `00403A`、權值股 `2330` 或其他股票）時，發現主 K 線圖、各量化卡片均無法正常顯示，且「任務五：原始資料表」中完全無資料。

經排查發現存在以下系統性問題：
1. **外部 Yahoo Finance API 遭遇 `HTTP 429 Too Many Requests` 限流**：前台透過 Vite 本地代理 `/api/yahoo` 向 Yahoo Finance 請求日 K 線時，因缺少標準瀏覽器請求標頭或被邊緣伺服器頻率控管，請求全面回傳 429，導致遠端日 K 線拉取中斷。
2. **本地 17.5 MB 緊湊歷史日 K 數列斷鏈未打通**：系統在 `public/market-cache/tw_market_ohlcv_compact.json` 中已備妥 2,356 檔台股標的（包含 `00403A`）的歷史日 K 數列，但前端完全沒有模組讀取此檔，亦未將其沉澱至瀏覽器 IndexedDB，造成 Yahoo 429 失敗時無本地快取可供降級。
3. **最新單日收盤快取未與歷史數列增量合流**：每日 16:00 定時更新的 `tw_market_summary.json` 包含當日最新收盤價，但因與歷史數列脫節，前端無法自動拼接為最新完整的連續日 K 數列。
4. **V8.64.0 (SPEC-0152) 淘汰假資料後的真實呈現衝擊**：由於日前徹底移除了 150 元與 2,100 元捏造假資料，當上述兩道資料來源皆斷鏈時，系統忠實呈現 Empty State，導致使用者誤以為資料庫損壞。
5. **無效代碼輸入缺乏精確指引**：使用者若誤輸入不存在之代碼（如筆誤之 `004EA`），系統僅顯示通用的無數據狀態，未明確指出「查無此標的代碼」，缺乏友善防呆反饋。

---

## Solution

1. **本地緊湊歷史日 K 按需加載與 IndexedDB 沉澱 (On-Demand Compact History Hydration)**：
   - 擴充 `marketCacheLoader`，提供按需加載 `tw_market_ohlcv_compact.json` 歷史日 K 的能力。
   - 在 `backfillSymbolOhlcvAndIndicators` 中建立「雙重本地守護」：若 IndexedDB 無資料或外部 Yahoo API 回傳 429 / 失敗，立即從本機 `tw_market_ohlcv_compact.json` 提取該標的歷史日 K，計算技術指標並自動沉澱寫入 IndexedDB。
2. **歷史數列與每日盤後總表增量無縫合流 (History + Daily Summary Fusion)**：
   - 自動將 `tw_market_summary.json` 內的當日最新收盤價（如 2026-09-30）與 `compact` 歷史日 K 數列透過日期去重升冪合併，確保即使 Yahoo 429，標的依然擁有截止至最新營業日的完整日 K 與技術指標。
3. **Vite 代理層防護與 429 Fast-Fail 機制 (Vite Proxy Header Hardening & Fast-Fail)**：
   - 在 `vite.config.ts` 中為 `/api/yahoo` 配置合規之 `User-Agent` 與 `Referer`。
   - 在 `priceFetcher` 與 `historicalOhlcvBackfill` 中對 429 狀態碼實現 Fast-Fail，不再反覆等待重試導致介面卡頓，迅速切換至本地備援快取。
4. **無效代碼診斷與精確 Empty State 提示 (Invalid Symbol Diagnosis & Adaptive Guidance)**：
   - 於 `HeaderMarketBar` 與 Empty State 面板增加標的有效性核對：
     - 若代碼在全市場總表中查無資料且遠端 404（如 `004EA`），明確標示「⚠️ 查無此台股標的代碼，請確認代碼是否正確（例如 00403A、2330）」。
     - 若代碼有效但外部連線受限，明確標示「⚠️ 外部即時報價連線受限·已啟用本地盤後歷史資料庫」。

---

## User Stories

1. 作為投資人，當我查詢新掛牌的主動型 ETF（如 `00403A`）時，我希望戰情室能立即顯示該標的歷史日 K 與 18 張量化卡片，即使外部 Yahoo Finance 暫時無即時報價，系統也能透過本機歷史資料庫完成分析。
2. 作為技術分析者，當外部 Yahoo API 出現 429 限流或網路波動時，我希望系統能自動且無感地回退至本機 17.5 MB 的緊湊歷史資料庫與當日盤後收盤價，絕不出現圖表全空破圖現象。
3. 作為一般使用者，當我切換到「任務五：原始資料表」時，我希望能瀏覽完整的歷史日 K 分頁數據（開高低收量與均線），以驗證量化分析的真實依據。
4. 作為日常看盤者，當每日 16:00 盤後同步完成後，我希望查詢標的能自動包含當天最新收盤數據，日 K 數列與頂部行情列日期完美同步。
5. 作為打字筆誤的使用者，當我不小心輸入不存在的代碼（如 `004EA`）時，我希望系統能明確告訴我「查無此標的代碼」，並給予相近代碼建議，而不是讓我誤以為系統當機或資料庫壞掉。
6. 作為重視系統效能的使用者，我希望歷史日 K 採用按需隨選提取與背景 IndexedDB 沉澱，不要在應用程式一打開時強行載入 17.5 MB 導致網頁卡死。

---

## Implementation Decisions

### 1. 本地緊湊快取載入器模組 (`marketCacheLoader.ts`)
- 新增 `loadSymbolCompactHistory(symbol: string): Promise<DailyCandle[] | null>` 函式：
  - 內部維護一個記憶體單例 Promise 快取，避免多次重複發送 HTTP 請求取得 `tw_market_ohlcv_compact.json`。
  - 支援將 compact 格式物件 `{ d, o, h, l, c, v }` 轉換為標準 `DailyCandle` 格式 `{ date, open, high, low, close, volume }`。
- 新增 `getLatestSummaryQuote(symbol: string): Promise<DailyCandle | null>`：
  - 快速從 `tw_market_summary.json` 取得當日最新單筆收盤行情。

### 2. 歷史回補引擎降級防禦升級 (`historicalOhlcvBackfill.ts`)
- 修改 `backfillSymbolOhlcvAndIndicators` 流程：
  - 步驟 1：檢查 IndexedDB，若快取存在且根數 >= 5 且新鮮，直接使用。
  - 步驟 2：嘗試 Yahoo Finance 增量拉取。若遭遇 429、404 或逾時，捕捉錯誤並不拋出致命異常。
  - 步驟 3：若 Yahoo 抓取失敗或回傳 0 根，且本地 IndexedDB 根數 < 5，啟動本機緊湊資料庫回補：
    - 調用 `loadSymbolCompactHistory(cleanSymbol)` 取得歷史日 K。
    - 調用 `getLatestSummaryQuote(cleanSymbol)` 取得當日盤後行情，並以 `mergeDailyCandles` 合併。
    - 若合併後日 K 數列有效（>= 1 根），重新計算技術指標並寫入 IndexedDB。
  - 步驟 4：若連本地 compact 資料庫亦查無此標的（如無效代碼 `004EA`），回傳空數列，觸發無效標的提示。

### 3. 開發代理強化 (`vite.config.ts`)
- 於 `/api/yahoo` 代理選項中補齊：
  - `headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...', 'Referer': 'https://finance.yahoo.com/' }`。

### 4. 戰情室視圖與 Empty State 優化 (`AiForceDashboardView.tsx` & `HeaderMarketBar.tsx`)
- 當 `candles.length === 0` 時，透過全市場快取總表判斷標的代碼是否在市場字典中：
  - 若不在字典中，將提示文案設為「⚠️ 查無此台股標的代碼，請確認代碼是否正確」。
  - 若在字典中但無資料，維持「📊 數據串接中」。

---

## Testing Decisions

- **良好測試原則**：只檢驗公開對外介面與整合行為，不測試內部私有變數。
- **測試切片 (Seams)**：
  1. `src/engine/marketCacheLoader.test.ts`：
     - 測試 `loadSymbolCompactHistory` 能正確從 compact JSON 解析特定標的並轉為 `DailyCandle[]`。
     - 測試標的不存在時安全回傳 `null`。
     - 測試單例請求快取，確保多次調用不會重複 fetch。
  2. `src/engine/historicalOhlcvBackfill.test.ts`：
     - 測試當 Yahoo Finance 回傳 429 Too Many Requests 時，能自動從本地 compact 快取與 summary 成功回補日 K 並存入 IndexedDB。
     - 測試真正不存在之代碼能安全回退並標記。
  3. `src/components/aiForceDashboard/HeaderMarketBar.test.ts` / `.test.tsx`：
     - 測試不同狀態下（無效代碼 vs 外部限流）的輔助提示渲染。

---

## Out of Scope

- 本規格不包含付費即時報價 WebSocket 串接服務之導入。
- 本規格不變更美股市場既有之歷史資料回補邏輯。

---

## Further Notes

- 完成此規格後，使用者輸入 `00403A`、`2330` 或 `0050` 時，無論 Yahoo 是否限流，皆能 100% 透過本機 17.5 MB 歷史資料庫正常呈現主 K 線與 18 張卡片。
