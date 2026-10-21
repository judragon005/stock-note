# 0197 Spec: 主力戰情室次秒級漸進式秒開、官方估值與月營收管線校準規格書

- **規格編號**：Spec 0197
- **標題**：主力戰情室次秒級漸進式秒開、官方估值與月營收管線校準
- **關聯 Issue**：#297 (https://github.com/judragon005/stock-note/issues/297)
- **關聯 ADR**：ADR 0197 (待對齊)
- **前置依賴**：Spec 0196 (受控聯網協議與 TPEx 估值管線)
- **建立日期**：2026-10-21
- **版本**：V1.1 (依據真實 Prompt 現場審查全面增強)
- **狀態**：`READY_FOR_AGENT`

---

## 1. 問題陳述 (Problem Statement)

使用者在主力戰情室實戰操作與一鍵複製外聯提示詞給外部 AI CRO 進行壓力測試時，面臨以下直接損害投資決策精度與系統可用性的重大缺陷：

1. **切換代碼載入阻塞（等待 > 90 秒）**：
   - 使用者在戰情室輸入新代碼（如 4979 華星光），頁面轉圈圈等待超過一分半鐘（90 秒以上）仍無畫面。
   - **根本原因**：本地 SQLite 湖倉載入 250 根日 K 與籌碼僅需 0.29 秒（295ms），但主流程使用同步 `await loadOrFetchFinancialReport(...)` 試圖並行抓取外部 FinMind 三大財報，且外部 API 缺乏超時保護（Timeout Guard），導致首屏渲染被無端卡死。
2. **月營收時空倒退一年（陣列排序取倒 Bug）**：
   - 提示詞輸出 `<monthly_revenue_period>2025-10</monthly_revenue_period>`，整整倒退一年。
   - **根本原因**：在 `aiForceDashboardEngine.ts` 中，月營收陣列由舊到新排序，但在 `aiForcePromptAdapter.ts` 卻以 `rev.history[0]` 取到了最舊的一筆，而非最新的 `rev.history[rev.history.length - 1]`。
3. **度量衡換算失真（張 vs 股混除歸零 Bug）**：
   - 提示詞輸出 `foreign_net_shares_1d` 為 `355 (佔 20 日均量 0%)`，量增比為 `0倍`。
   - **根本原因**：台股日 K 原始成交量為「股數」，籌碼與當日成交量為「張數」，轉接器未統一度量衡直接相除，導致比率四捨五入後直接歸零。
4. **官方每日估值斷層與自相矛盾的「幽靈估值標籤」**：
   - SQLite 湖倉已有 4979 官方 PE (`78.56`)、PB (`15.39`) 與殖利率 (`0.45%`)，但後端中介層 `/api/market/history/:symbol` 漏查 `tw_valuation_daily` 表，前端輸出為 `N/A`。
   - 更甚者，在 PE/PB 均為 `N/A` 時，`<valuation_tier>` 卻自動標註為 `合理估值區間`，引發外部 AI 強烈質疑「無數據卻標註合理」。
5. **產業屬性漏列（景氣循環股被判為非循環）**：
   - 華星光（4979）為光通訊/資料中心光收發模組，獲利與營收高度跟隨雲端巨頭資本支出與擴產週期，是典型的景氣循環股。但在 `industryGate.ts` 中漏列，導致提示詞輸出 `<is_cyclical_stock is_cyclical="false">一般非循環股</is_cyclical_stock>`，無法啟動週期頂部殺估值的紅隊風控審查。
6. **宏觀指標在台股標的輸出時中斷**：
   - 10 年美債殖利率、VIX 與恐慌指數在台股標的輸出時未連通既有快取，全數輸出 `N/A`。

---

## 2. 解決方案 (Solution)

恪守 **KISS 原則** 與 **第一性原理**，不進行任何過度工程化翻修，在既有模組與轉換層內以極簡代碼徹底治本：

1. **兩階段次秒級漸進式秒開 (Subsecond Progressive Rendering)**：
   - 只要本地 SQLite 湖倉讀取歷史日 K 與籌碼成功（約 300ms），立即執行首次渲染 (`setReport` 並關閉 `isLoading`)，使用者在 0.3 ~ 0.5 秒內瞬間看到 18 張卡片與走勢圖。
   - 即時行情 (Quote) 與單季財報 (EPS/毛利) 改為背景非同步更新（Background Promise），成功後動態補齊。
   - 外部 FinMind 財報請求增設 3 秒超時熔斷 (`AbortSignal.timeout(3000)`)，逾時自動優雅降級，杜絕瀏覽器長掛起。
2. **月營收最新月份校準**：
   - 將 `aiForcePromptAdapter.ts` 內的營收索引修正為取陣列最新一筆 (`rev.history[rev.history.length - 1]`)，精確輸出 `2026-09`。
3. **度量衡單位標準化**：
   - 計算 20 日均量時，台股日 K 成交量統一除以 1000 換算為「張數」（美股維持「股數」）。
   - 外資買超 355 張佔均量真實比例恢復為 `+23.7%`，量增比恢復為 `0.92 倍`。
4. **官方每日估值中介層連通與幽靈標籤根除**：
   - 後端 `/api/market/history/:symbol` 補查 `tw_valuation_daily` 最新一筆，回傳真實 PE (`78.56`)、PB (`15.39`) 與殖利率 (`0.45%`)。
   - 當 PE 與 PB 皆為空時，`<valuation_tier>` 誠實輸出 `待同步`，杜絕打腫臉充胖子。
5. **景氣循環股清單補齊**：
   - 在 `industryGate.ts` 的 `CYCLICAL_SYMBOLS` 補入 `'4979'`（華星光）。
6. **宏觀全域快取連通**：
   - 台股標的組裝 `macro` 時，連通既有全域宏觀快取，注入最新美債 10Y 與 VIX 數值。

---

## 3. 使用者故事 (User Stories)

1. 作為一名專業投資者，當我在主力戰情室輸入「4979」時，我希望在 0.5 秒內立即看到完整戰情室卡片與 K 線圖，不再需要面對超過一分半鐘的白畫面等待。
2. 作為一名量化交易員，當外部財報網路連線延遲或掛起時，我希望系統在 3 秒內自動熔斷並優雅降級，優先保障戰情室的即時響應與操作流暢度。
3. 作為一名投資分析師，當我複製 4979 華星光的提示詞給外部 AI CRO 時，我希望看到真實的官方本益比（78.56）與股價淨值比（15.39），不再出現「估值資料缺漏」的誤判。
4. 作為一名風控審查員，當我檢視最新月營收時，我希望看到最新月份「2026-09」及其真實 YoY，不再被倒退一年的「2025-10」誤導時空因果。
5. 作為一名籌碼分析師，當我檢視外資與投信買賣超時，我希望 20 日均量佔比能以「張數」正確換算（如外資佔 23.7%），不再因為張除以股而出現荒謬的「0%」。
6. 作為一名產業研究員，當我分析華星光時，我希望系統正確標註其為「景氣循環週期股」，以便外部 AI 啟動週期頂部殺估值的風控審查。
7. 作為一名總經投資人，當我檢視台股標的提示詞時，我希望同時看到美債 10 年期殖利率與 VIX 恐慌指標，具備完整的跨市場風險視角。

---

## 4. 實作決策 (Implementation Decisions)

1. **後端 API 估值整合** (`scripts/market-sync/vite-market-middleware.cjs`)：
   - 在 `/api/market/history/:symbol` 中加入：
     ```javascript
     const valRow = db
       .prepare('SELECT pe, pb, dividend_yield FROM tw_valuation_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
       .get(symbol, aliasSym);
     ```
   - 掛載至回傳 JSON：`valuation: valRow || null`。
2. **前端 Loader 與 View 映射** (`src/engine/marketCacheLoader.ts` & `src/components/aiForceDashboard/AiForceDashboardView.tsx`)：
   - `loadSymbolFullLakehouseData` 接收 `valuation`。
   - `AiForceDashboardView.tsx` 將 `lakehouseData.valuation` 映射至 `valuationData`。
3. **兩階段漸進式秒開** (`AiForceDashboardView.tsx`)：
   - 湖倉資料載入（`candles.length >= 1`）後，立即建構完整報表並執行 `setReport(fullReport)` 與 `setIsLoading(false)`。
   - 即時行情與單季財報改由背景 Promise 執行，完成後以函數式更新 Patch 入報表。
4. **外部網路 3 秒超時防禦** (`src/engine/taiwanFinancialPipeline.ts`)：
   - `fetchDataset` 增加 `AbortSignal.timeout(3000)`，超時自動返回空陣列降級。
5. **月營收最新月份校準** (`src/engine/aiForcePromptAdapter.ts`)：
   - 改為：`const latestRevItem = rev?.history && rev.history.length > 0 ? rev.history[rev.history.length - 1] : undefined;`
6. **度量衡單位標準化** (`src/engine/aiForcePromptAdapter.ts`)：
   - 台股均量統一換算為張數：`const avgVol20Shares = !isUS ? (sumVol20 / 20) / 1000 : (sumVol20 / 20);`
7. **景氣循環股補齊** (`src/engine/industryGate.ts`)：
   - 在 `CYCLICAL_SYMBOLS` Set 中補入 `'4979'`。
8. **幽靈估值標籤修正** (`src/engine/aiForcePromptAdapter.ts`)：
   - 當 `val.pe === undefined && val.pb === undefined` 時，`tier` 輸出為 `'待同步'`。

---

## 5. 測試決策 (Testing Decisions)

- **測試原則**：遵循測試驅動開發 (TDD) 紅-綠-重構循環，只在公開介面縫隙 (Test Seams) 驗證外部行為。
- **測試縫隙 1 (後端 API 估值縫隙)**：
  - 在 `src/engine/viteMarketMiddleware.test.ts` 驗證 `/api/market/history/4979` 回傳之 JSON 包含 `valuation: { pe, pb, dividend_yield }`。
- **測試縫隙 2 (轉接器度量衡與營收縫隙)**：
  - 在 `src/engine/aiForcePromptAdapter.test.ts` 驗證：
    - `monthlyRevenueYearMonth` 為歷史陣列最後一筆（最新月份）。
    - 傳入 1,376,000 股與 355 張籌碼時，`foreignRatio20D` 正確輸出約 23.7%，不為 0.0%。
    - 傳入 4979 時，`isCyclical` 判定為 `true`。
- **測試縫隙 3 (端到端 Master Prompt 驗收)**：
  - 在 `src/engine/warRoomPromptE2E.test.ts` 驗證華星光 4979 提示詞：包含真實 PE/PB、最新 2026-09 營收、循環股宣告，且無 0 倍或 0% 矛盾。

---

## 6. 排除範圍 (Out of Scope / Anti-Over-Engineering)

- ❌ 不建置 WebSocket 串流伺服器，維持 HTTP 湖倉秒讀與背景 Promise 增量補齊。
- ❌ 不重構 IndexedDB 全量財報結構，維持既有單季財報按需快取。
- ❌ 不建立全市場董監質押爬蟲（維持技術債標記，待後續專案處理）。

---

## 7. 驗收標準 (Acceptance Criteria)

1. **秒開驗收**：在戰情室切換或搜尋「4979」，畫面在 **0.5 秒內完成首屏渲染**，不再出現超過 90 秒的白畫面阻塞。
2. **估值驗收**：複製出的 Prompt 包含華星光官方真實估值 `<pe_ratio>78.56</pe_ratio>` 與 `<pb_ratio>15.39</pb_ratio>`。
3. **營收驗收**：Prompt 中月營收週期顯示為 `<monthly_revenue_period>2026-09</monthly_revenue_period>`。
4. **度量衡驗收**：外資 1 日籌碼顯示為 `355 (佔 20 日均量 23.7%)`，徹底消滅 `0%` 荒謬標籤。
5. **循環股驗收**：華星光正確標記為 `<is_cyclical_stock is_cyclical="true">景氣循環週期股...</is_cyclical_stock>`。
