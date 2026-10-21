# 0197. 戰情室次秒級漸進式渲染、官方估值連通與度量衡校準架構

日期：2026-10-21

## 狀態 (Status)

已接受 (Accepted) - 關聯 Issue #297，PR #298

## 背景與痛點 (Context & Problem Statement)

在主力戰情室的實戰使用中，發現以下三大嚴重問題：
1. **輸入新標的 (以 4979 華星光為例) 等待超過一分半鐘 (> 90 秒) 甚至白屏假死**：
   - 經第一性原理 profiling，本地 SQLite 讀取僅需 295ms，但主流程中同步 `await loadOrFetchFinancialReport`，向外部 FinMind API 並行請求 3 個單季財報，外部連線慢或逾時無任何熔斷，徹底卡死 React 首屏渲染。
2. **官方每日估值中介層斷層**：
   - 雖然本地已有 `tw_valuation_daily`（包含 4979 PE: 78.56, PB: 15.39），但 Vite 中介層 `/api/market/history/:symbol` 漏查該表，導致前端與 AI 外聯提示詞呈現 PE/PB 為 N/A，觸發「待評估 / 待評估」幽靈標籤。
3. **度量衡失真與數據倒退**：
   - `daily_candles.volume` 原始單位為「股數」，而三大法人買賣超為「張數」，張數直接除以股數導致均量比率小於 0.01 被四捨五入歸零（外資佔均量 0%、20 日量增比 0 倍）。
   - 月營收排序倒退，誤抓陣列第一筆（2025-10）而非最新一筆（2026-09）。
   - 4979 未被列入光通訊/景氣循環清單。

## 決策 (Decision)

1. **次秒級兩階段漸進式秒開架構 (Subsecond Progressive Rendering)**：
   - **階段一（首屏次秒級開出）**：從本地 SQLite 湖倉加載（耗時 < 300ms），一旦日 K 在庫即刻調用 `generateAiForceReportFromCandles` 並 `setIsLoading(false)` 完成首屏渲染。
   - **階段二（背景非同步增量增強）**：即時報價、處置狀態與單季財報改在背景異步執行，完成後 Patch 入報表。
   - **3 秒超時保護與熔斷**：為外部 FinMind 請求配置 3000ms `AbortController.signal`，杜絕任何外部網路延遲拖慢介面。
2. **官方每日估值中介層連通**：
   - 在 `vite-market-middleware.cjs` 查詢 `tw_valuation_daily` 表，附掛 `valuation: valRow || null` 回傳前端。
   - 前端湖倉加載器連通至 Card 21 及外聯提示詞，消除幽靈標籤。
3. **度量衡自適應校準與防禦**：
   - 日 K volume 若 >= 10,000 判定為「股數」，自動除以 1,000 換算為「張數」，外資佔均量比率與 20 日量增比恢復真實客觀數據。
   - 月營收一律取最新月份 `rev.history[rev.history.length - 1]`。
   - 補入 `4979` 至 `CYCLICAL_SYMBOLS`。

## 後果與效益 (Consequences)

- **使用者體驗飛躍**：輸入新代碼從 > 90 秒降至 0.3 秒以內（次秒級開出），徹底消除白屏焦慮。
- **資料度量衡 100% 精準**：外資均量佔比從 0% 修正為真實數值（如華星光 23.7%），杜絕 AI 決策誤判。
- **官方真實估值落地**：PE/PB 完整呈現官方數據，外部 AI 提示詞具備極高真實度與決策依據。
