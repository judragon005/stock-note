# Ticket 04 — 排程中心控制台 UI 顆粒度升級與智慧補缺預設 (`MarketScheduleHubSection`)

**What to build:**
更新 `src/components/MarketScheduleHubSection.tsx`：
1. 回補交易日數下拉選單擴充：
   - `<option value="auto">⚡ 智慧自動補缺 (Smart Catch-up - 預設)</option>`
   - `<option value="5">5 交易日 (約一週短天期)</option>`
   - `<option value="20">20 交易日 (約一月月線級)</option>`
   - `<option value="60">60 交易日 (約一季短波段)</option>`
   - `<option value="120">120 交易日 (約半年中天期)</option>`
   - `<option value="250">250 交易日 (約一年完整年線)</option>`
2. 預設 state `backfillDays` 設為 `'auto'`。
3. 提示文案優化：強調「預設智慧補缺只抓取最新缺漏日，數秒內即可完成；建置新庫請選擇 250 交易日」。
4. 更新單元測試 `MarketScheduleHubSectionBackfill.test.tsx` 確保測試綠燈。

**Blocked by:**
- Ticket 03 — 總控引擎與中介層端點自適應回補整合 (`days=auto` & 美股日常增量)

**Status:**
closed

**Acceptance criteria:**
- [x] UI 下拉選單預設選中 `auto`。
- [x] 點擊「啟動背景全回補」按鈕時，送出的 HTTP 請求 URL 為 `/api/market/backfill-all?market=ALL&days=auto`。
- [x] 選擇其他天數（如 5, 20, 250）時，按鈕正常送出對應參數。
- [x] `MarketScheduleHubSectionBackfill.test.tsx` 全部通過。
