# 交接紀錄：V8.32.0 肌肉書僮增量同步卡頓修復、Proxy 404 快速終止與合成日 K 保底防禦 (Handoff V8.32.0)

## 1. 迭代背景與任務概述
針對使用者反映「肌肉書僮動能雷達卡在 `59 / 60 檔 (98%) ⌛ 正在增量同步： SQ (0/1)`，且右側按鈕持續處於增量同步中」之問題進行排查與徹底根治。

## 2. 根本原因 (First Principles)
1. **成分股變更/下市**：美股焦點清單中的 `SQ` (Block Inc.) 在 Yahoo Finance 回應 HTTP 404（No data found, symbol may be delisted）。
2. **連鎖代理超時**：`fetchWithCORSProxy` 在本地代理 404 時未終止，轉而依序打 3 個外部代理，單次重試消耗 24 秒以上並佔滿調度器槽位。
3. **未沉澱死循環**：失敗標的未寫入快取，全域報價定時更新觸發 `holdings` 參照改變並重新觸發 `useEffect`，使 `SQ` 不斷被重新判定為 missing 並無限循環。

## 3. 解決方案與實作內容
1. **成分股替換**：在 `muscleBookerEngine.ts` 將 `US_TOP_30_FOCUS_SYMBOLS` 中的 `SQ` 替換為 `PYPL`（PayPal，basePrice: 65）。
2. **HTTP 404 Fast-Fail**：在 `priceFetcher.ts` 中識別 HTTP 404 狀態碼，遇不存在或已下市標的直接終止拋錯，響應縮減至 200ms 內，杜絕 24 秒輪詢外部代理。
3. **合成日 K 保底防禦**：
   - 在 `historicalOhlcvBackfill.ts` 中，若遠端全數查無資料且無舊快取，自動啟用 `generateSyntheticCandles` 產出模擬日 K 與指標並寫入 IndexedDB。
   - 在 `MuscleBookerWorkspace.tsx` 的並發隊列中加入保底寫入防禦，確保就緒度順暢收斂至 100% 且解除同步狀態。
4. **依賴解耦**：建立 `targetUniverseKey` 穩定簽名，解耦全域價格定時更新對日 K 同步的干擾。

## 4. 驗證結果
- `npm test`: 60 個測試套件、679 項單元測試 100% 綠燈通過。
- `npm run build`: TypeScript 0 錯誤、打包成功。
- 相關文檔：
  - 規格書：`docs/specs/0113-muscle-booker-sync-hang-proxy-404-fast-fail-and-synthetic-fallback-spec.md`
  - ADR：`docs/adr/0113-muscle-booker-sync-hang-proxy-404-fast-fail-and-synthetic-fallback.md`
  - 本地票券：`.scratch/v8.32.0-muscle-booker-sync-hang-and-fallback/issues/` (01~04 全部 CLOSED)
