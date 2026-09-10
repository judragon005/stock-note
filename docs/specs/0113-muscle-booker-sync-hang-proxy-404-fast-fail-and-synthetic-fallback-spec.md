# 0113. 肌肉書僮增量同步卡頓修復、Proxy 404 快速終止與合成日 K 保底防禦架構規格書 (Muscle Booker Sync Hang Proxy 404 Fast-Fail & Synthetic Fallback Spec)

## 1. 問題意識與背景需求 (Problem Statement)

在肌肉書僮動能雷達（法人焦點 Top 30，包含台股 30 檔 + 美股 30 檔）中，使用者反映畫面長時間卡在：
`本地日 K 快取就緒度： 59 / 60 檔 (98%) ⌛ 正在增量同步： SQ (0/1)`，且右側按鈕持續處於「🔄 增量同步中...」，永不結束。

經過第一性原理與底層網路機制剖析，此卡死現象源自以下三重連鎖缺陷：

1. **成分股代碼失效 (Delisted / Changed Symbol)**：
   - 美股焦點清單（`US_TOP_30_FOCUS_SYMBOLS`）中包含代碼 `SQ`（Block, Inc. 原 Square）。
   - Yahoo Finance API 對 `SQ` 回傳 HTTP 404：`No data found, symbol may be delisted`（Block 於 2026 年已變更代碼）。
2. **代理層 404 缺乏快速失敗，連環重試耗時 24 秒以上 (Proxy Cascade Timeout)**：
   - `fetchWithCORSProxy` 在本地開發代理 `/api/yahoo` 收到 404（`res.ok === false`）時，未判定為「資源不存在」，而是當作連線失敗並啟動降級重試：
   - 先嘗試 Node 直連（在瀏覽器中觸發 CORS 失敗），接著依序向 3 個外部 CORS 代理伺服器發送請求（每個超時設定 8000ms）。
   - 單次查詢失敗需浪費 **24 秒以上**，並長期佔滿 `ClientRequestScheduler` 並發槽位與權杖桶。
3. **失敗無記憶沉澱與全域定時器觸發死循環 (Infinite Missing Re-trigger Loop)**：
   - 在 `historicalOhlcvBackfill.ts` 中，若遠端抓取失敗且本地無舊快取，僅回傳 `{ candles: [], indicators: [] }`。
   - 在 `MuscleBookerWorkspace.tsx` 中，`if (res.candles && res.candles.length >= 5)` 才寫入 `cachedCandlesMap`。失敗的 `SQ` 永遠不會被快取記錄。
   - 同時，頂部 Header 每數秒執行全域報價更新（顯示「🔄 更新中...」），造成傳入的 `holdings` 參照頻繁改變，進而觸發 `targetUniverse` 重新計算與 `useEffect` 重新執行。
   - 每次重新執行，未就緒的 `SQ` 又被加入 `missing` 隊列，再次發起 24 秒連環重試，導致進度條永遠停在 `59 / 60 檔 (98%)`，無法收斂至 100%。

---

## 2. 核心架構與防禦性解決方案 (Proposed Architecture)

### 2.1 成分股替換與同步 (Component Stock Replacement)
- 將 `US_TOP_30_FOCUS_SYMBOLS` 中的無效代碼 `SQ` 替換為流動性充裕的主流電子支付成長股 `PYPL`（PayPal Holdings, Inc.，basePrice: 65）。
- 同步更新測試案例中針對 `US_TOP_30_FOCUS_SYMBOLS` 30 檔長度與成分股之驗證。

### 2.2 404 快速終止機制 (HTTP 404 Fast-Fail)
- 在 `fetchWithCORSProxy` 中，當本地開發代理或請求回應回傳 HTTP 404 時（代表標的不存在或已被 Yahoo 下市），明確識別為非網路暫態錯誤。
- 立即拋出錯誤終止，不再進入後續 3 個外部 CORS 代理伺服器的連環重試，使無效標的在 **< 200ms** 內瞬間返回，杜絕 24 秒請求阻塞。

### 2.3 日 K 抓取保底回退機制 (Synthetic Candles Fallback & Persistence)
- 在 `backfillSymbolOhlcvAndIndicators` 中：
  - 若候選代碼經遠端拉取後仍無任何日 K（`fetchedCandles.length === 0`）且本地無歷史舊快取時：
  - 啟動防禦性降級：自動調用現有之 `generateSyntheticCandles(cleanSymbol, 100)` 生成 30 根模擬日 K 與技術指標。
  - 將合成日 K 與指標持久化至本地 IndexedDB（標記為保底快取）並回傳，確保該標的具備可用之日 K 與箱體指標。
- 在 `MuscleBookerWorkspace.tsx` 中：
  - 無論遠端是即時日 K 還是保底日 K，完成後均能寫入 `cachedCandlesMap`。
  - 快取就緒度能順利推進至 100%，並將 `isSyncing` 解除為 `false`，徹底告別卡頓。

### 2.4 目標池依賴優化 (Target Universe Dependency Decoupling)
- 在 `MuscleBookerWorkspace.tsx` 中，優化 `targetUniverse` 的 `useMemo` 依賴：
  - 當選取資產池為 `TOP30_FOCUS` 或 `TW50_CORE` 時，直接回傳常數宇宙清單，不受 `holdings` 報價變化的無效干擾。
  - 避免全域價格輪詢重新觸發非持股目標池的日 K 同步。

---

## 3. 測試驅動開發驗證清單 (TDD Verification)

1. **404 Fast-Fail 測試 (`priceFetcher.test.ts`)**：
   - 驗證當本地代理回傳 404 時，`fetchWithCORSProxy` 應立即拋出錯誤，且不再呼叫外部 CORS 代理池。
2. **回補引擎保底合成測試 (`historicalOhlcvBackfill.test.ts`)**：
   - 驗證當外部 API 回傳 404 / 空資料時，`backfillSymbolOhlcvAndIndicators` 應自動回退生成合成日 K 與技術指標，並成功寫入 IndexedDB。
3. **成分股清單對齊測試 (`muscleBookerEngine.test.ts` & `MuscleBookerWorkspace.test.ts`)**：
   - 驗證 `US_TOP_30_FOCUS_SYMBOLS` 長度為 30 且包含 `PYPL`，不再包含 `SQ`。
4. **工作區就緒度與同步狀態測試 (`MuscleBookerWorkspace.test.ts`)**：
   - 驗證即使資產池中含有拉取失敗之標的，受控回補隊列仍能順利完成、`isSyncing` 正確轉為 `false`，且就緒檔數達 100%。
5. **全專案回歸測試**：
   - `npm test` 100% 綠燈，`npm run build` TypeScript 0 錯誤。
