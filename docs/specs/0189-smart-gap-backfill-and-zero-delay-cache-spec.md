# 規格書 0189：台美智慧回補增量缺口探測、零延遲快取跳過與自適應排程控制台 (Spec 0189)

## Problem Statement

在先前的回補管線版本 (Spec 0168 / Spec 0184 / Spec 0187 / Spec 0188) 中，系統已具備台美雙軌日 K 與籌碼回補能力，然而在實際日常運作與終端機日誌中暴露出嚴重的效能浪費與使用者體驗瓶頸：

1. **每次啟動均強制回溯 250 交易日 (無智慧缺口探測)**：
   無論是透過終端機執行 `npm run market:backfill-all` 或在設定頁面排程中心點擊「啟動背景全回補」，系統預設皆直接往前產生 250 個法定交易日清單逐日處理。使用者即便昨日才完整同步過，今日想補齊最新數據，依然必須等待系統從 250 天前逐日輪詢，極為沉重繁瑣。
2. **快取命中依舊強制防爬蟲延遲 (偽智慧快取與時間浪費)**：
   在 `backfill-tw-history-web.cjs` 的日循環中，即便當日日 K（普通股 $\ge 1800$）與籌碼（$\ge 2000$ 筆）早已在庫達標並標註為 `cached: true`，但主迴圈第 643 行漏失了 `!res.cached` 守護條件，導致每一筆命中快取的歷史日期依舊強制執行 `await sleep(throttleMs)`（預設 3,000ms）。即使 250 天全部在庫，也必須無意義地空轉暫停 12.5 分鐘以上。
3. **回補選單粒度僵化與日常補漏缺失**：
   目前前端控制台下拉選單僅提供 `60 / 120 / 250` 三種天數，缺少日常最頻繁使用的「智慧自動補缺 (Smart Catch-up)」、「近 5 交易日 (近一週)」與「近 20 交易日 (近一月)」選項，導致使用者在需要修復近期短區間時被迫執行至少 60 天的輪詢。
4. **美股軌道連動過重**：
   在全回補總控腳本中，每次執行雙軌回補時美股軌道均強行調用全量隊列 bootstrap，使得美股也重新遍歷近 1,800 檔標的，無法與台股增量補缺協同達成輕量高效。

---

## Solution

建立端到端「智慧增量水位線缺口探測 (Watermark Gap Backfill)」與「零延遲快取跳過 (Zero-Delay Cache Skip)」機制：

1. **實裝台股湖倉水位線與缺口自動探測器 (`detectTwDateGaps`)**：
   - 總控啟動時，先檢索 SQLite 湖倉中的 `daily_candles` 與 `tw_institutional_chips`。
   - 找出資料庫在庫的最新達標交易日（Watermark Date）。
   - 對齊當前系統法定交易日起始日（考慮 15:30 盤後發布門檻），自動比對出「尚未入庫或未達健康門檻之缺漏交易日 (Gap Dates)」。
   - 若資料庫最新日即為今日（無缺口），0 秒直接結束並回報「湖倉數據已是最新，無需回補」。
   - 若存在缺口（通常為 1~3 天），精準僅對這幾天發起官方抓取與入庫，數秒內俐落完成！
2. **修復並落實真·零延遲快取跳過 (Zero-Delay Cache Skip)**：
   - 修正 `backfill-tw-history-web.cjs` 主迴圈冷卻邏輯，僅在「真正發起外部網路請求 (`!res.cached`)」時才套用防爬蟲延遲；
   - 命中快取的歷史日 0ms 瞬間跳過，250 天若全數在庫，應於 0.5 秒內完成驗證並退出。
   - ETA 時間估算器重構：計算平均剩餘時間時，將已命中快取的日期排除在網路延遲時間權重外，使剩餘分鐘數預估高度精準。
3. **擴充排程中心自適應粒度與智慧補缺為第一預設**：
   - 排程控制台選單調整為：
     - `auto` (⚡ 智慧自動補缺，預設)
     - `5` (📅 近 5 交易日 / 一週快速修復)
     - `20` (📅 近 20 交易日 / 一月覆盤)
     - `60` (📅 近 60 交易日 / 一季短波段)
     - `120` (📅 近 120 交易日 / 半年中天期)
     - `250` (📅 250 交易日 / 完整年線冷啟動)
   - Vite 中介層 `POST /api/market/backfill-all` 支援 `days=auto` 參數。
4. **美股增量日常連動 (Daily Incremental Alignment)**：
   - 當以 `auto` 模式執行全市場回補時，美股軌道自動執行增量模式 (`--mode=daily`)，僅針對今日未完成的少數待同步標的執行採集；僅在使用者明確指定 `days >= 60` 進行冷啟動時才執行全量 bootstrap。

---

## User Stories

1. 作為每日投資人，我希望在盤後點擊「啟動背景全回補」時，系統能自動只抓取「今天（或最新缺漏的一兩天）」的行情與籌碼，不再強迫我等待 250 天的冗長抓取。
2. 作為系統使用者，當我本地資料庫已完整具備過去一年的歷史日 K 時，若手動觸發 250 天回補，我希望系統能在 1 秒內檢測完畢並顯示「全部命中快取，無需重複下載」，而不是強制對每一天沉睡 3 秒。
3. 作為排程中心管理者，我希望控制台預設選中「⚡ 智慧自動補缺」，打開網頁一鍵點擊即可完成昨日或今日數據同步。
4. 作為遭遇偶發斷網的使用者，若本週有兩天數據遺失，我希望「智慧自動補缺」能精準掃描出這兩天缺漏並自動填補，保持資料庫連續無斷層。
5. 作為短期波段操盤手，當我只需要校準近一週的籌碼與 K 線時，我希望能直接在下拉選單中選擇「近 5 交易日」，避免等待多餘歷史。
6. 作為宏觀研究員，當我需要重新拉取近一個月行情時，我希望能選擇「近 20 交易日」，快速完成一整個月的數據校準。
7. 作為硬體節能提倡者，我希望回補引擎不要讓 CPU 與網路連線在已存在的資料上做無意義的等待與輪詢，降低能源消耗與外部交易所伺服器負擔。
8. 作為前端操作者，當回補任務執行時，我希望 ETA 剩餘時間能如實反映「真正需要下載的天數」，而不是將已快取秒過的日期誤算為 3 秒耗時。
9. 作為雙軌投資者，在執行智慧回補時，我希望美股軌道同樣以「今日增量 (Daily)」模式進行輕量對齊，而不是每次都重啟耗時的美股冷啟動。
10. 作為全新設備部署者，當我在空資料庫上選擇「250 交易日」時，系統仍具備完整的年度年線歷史建置能力，兼顧新舊場景。

---

## Implementation Decisions

### 1. 水位線缺口探測核心函數 (`detectTwDateGaps`)
- 模組位置：`scripts/market-sync/backfill-tw-history-web.cjs`
- 演算法職責：
  1. 輸入參數：`maxLookbackDays` (預設 250)、`customDbPath`、`customNow`。
  2. 依據現有交易行事曆引擎 (`generateTradeDateCandidates(maxLookbackDays)`) 取得法定交易日清單（由新至舊排列）。
  3. 查詢 SQLite 湖倉，透過既有雙指標驗證語句 (`stockCount >= 1800 AND chipCount >= 2000`) 批量查驗各日期在庫健全狀態。
  4. 收集所有未達標之日期，回傳缺漏陣列 `gapDates: string[]`。
  5. 若無任何缺口，回傳 `{ hasGaps: false, gapDates: [], latestDate: string }`。

### 2. 迴圈冷卻守護修正 (Zero-Delay Cache Skip)
- 模組位置：`scripts/market-sync/backfill-tw-history-web.cjs` 之 `runTwDateDrivenBackfill`。
- 修改主迴圈結尾之條件判斷：
  ```javascript
  // 僅在非快取命中且非最後一天時才執行網路冷卻延遲
  if (!res.cached && throttleMs > 0 && i < dates.length - 1) {
    await sleep(throttleMs);
  }
  ```
- 當 `res.cached === true` 時，直接進行下一個迭代，0 延遲。

### 3. 中介層端點適配 (`POST /api/market/backfill-all`)
- 模組位置：`scripts/market-sync/vite-market-middleware.cjs` 與 `backfill-full-market-history.cjs`。
- 參數處理：當 `query.days === 'auto'` 或未傳入時，預設啟用智慧自動補缺模式。
- 若為 `auto` 模式：
  - 先調用 `detectTwDateGaps` 取得缺失交易日。
  - 若 `gapDates.length === 0`，直接將狀態設為已完成，日誌記錄「本地資料已是最新，無缺失交易日」。
  - 若有缺失，將 `datesOverride` 指定為 `gapDates` 傳入 `runTwDateDrivenBackfill`。

### 4. 前端排程控制台界面升級 (`MarketScheduleHubSection.tsx`)
- 下拉選單值由單純數字擴充為包含字串 `'auto'`：
  - `<option value="auto">⚡ 智慧自動補缺 (Smart Catch-up - 預設)</option>`
  - `<option value="5">5 交易日 (約一週短天期)</option>`
  - `<option value="20">20 交易日 (約一月月線級)</option>`
  - `<option value="60">60 交易日 (約一季短波段)</option>`
  - `<option value="120">120 交易日 (約半年中天期)</option>`
  - `<option value="250">250 交易日 (約一年完整年線)</option>`
- 預設 state `backfillDays` 設為 `'auto'`。
- 介面文案清晰提示：「預設僅回補最新缺漏天數，數秒內即可完成；初次建庫請選擇 250 交易日」。

### 5. 美股增量連動判定
- 模組位置：`scripts/market-sync/backfill-full-market-history.cjs`。
- 當 `days === 'auto' || days <= 20` 時，美股執行日常增量同步 `runUsMarketSync(['--mode=daily'])`；
- 當 `days >= 60` 且明確指定手動回補時，美股執行冷啟動 `runUsMarketSync(['--bootstrap'])`。

---

## Testing Decisions

### 1. 測試理念與縫隙規範 (Test Seams)
- **以高階公開介面為唯一縫隙**：不測試私有臨時變數，直接在模組匯出函數與 HTTP 端點進行行為驗證。
- **Zero-Network 隔離**：所有官方網路請求均透過 Mock/Stub 隔離，驗證算法在不同資料庫數據存在情境下的行為。

### 2. 測試覆蓋矩陣
- **Unit / Seam 1 (缺口探測器)**：
  - 測試完全無資料時，回傳全部 N 天缺口；
  - 測試全部天數達標時，回傳 0 天缺口；
  - 測試中間隨機缺 2 天時，精準回傳該 2 天。
- **Unit / Seam 2 (零延遲快取跳過)**：
  - 測試當所有日期皆為 `cached: true` 時，執行 10 個日期的回補應在 < 100ms 內完成（證明無 3000ms sleep 阻斷）。
- **Integration / Seam 3 (總控與中介層端點)**：
  - 測試 `POST /api/market/backfill-all?days=auto` 能正確解析並啟動智慧補缺任務。
- **UI Component / Seam 4 (`MarketScheduleHubSectionBackfill.test.tsx`)**：
  - 測試 UI 下拉選單預設選中 `auto`，點擊回補時正確發送 `days=auto` 請求。

---

## Out of Scope

1. 本規格不修改盤後官方 TWSE/TPEx 報表之欄位解析邏輯（成交筆數、開高低收等格式維持不變）。
2. 本規格不修改美股分級隊列底層之 Finnhub / FMP API 抓取邏輯。
3. 本規格不新增除了台美雙軌以外的第三市場。

---

## Further Notes

- 此優化可直接消弭使用者每次被迫等待 250 天的痛點，使日常排程維護成本由數十分鐘降至數秒。
- 透過嚴格遵守 TDD（先紅後綠）、`npm test` 100% 綠燈與 `npm run build` 0 錯誤後發起 PR。
