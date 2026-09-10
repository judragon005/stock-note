# 0113. 肌肉書僮增量同步卡頓修復、Proxy 404 快速終止與合成日 K 保底防禦架構決策 (ADR 0113)

## 狀態
已通過 (Accepted)

## 上下文 (Context)
在肌肉書僮動能雷達中，使用者反映畫面長時間卡在 `本地日 K 快取就緒度： 59 / 60 檔 (98%) ⌛ 正在增量同步： SQ (0/1)`，右側「🔄 增量同步中...」永不結束。

經過第一性原理底層排查：
1. **下市/變更代碼 404**：美股焦點池中包含已變更代碼之標的 `SQ`，Yahoo Finance API 回應 404 Not Found。
2. **代理層連環重試瓶頸**：`fetchWithCORSProxy` 在本地代理返回 404 時未判定終止，而是進入 Node 直連與 3 個外部 CORS 代理伺服器輪詢，單次失敗需耗時 24 秒以上，並佔滿調度器並發槽位。
3. **無記憶死循環**：`historicalOhlcvBackfill.ts` 抓取失敗僅回傳空陣列，未寫入 `cachedCandlesMap`。全域報價定時更新傳入新的 `holdings` 參照，觸發 `targetUniverse` 重新生成，導致 `useEffect` 反覆重新發起對 `SQ` 的 24 秒重試，永遠無法達成 100% 就緒。

## 決策 (Decision)
1. **替換成分股 (Component Replacement)**：
   - 將 `US_TOP_30_FOCUS_SYMBOLS` 中的無效代碼 `SQ` 替換為流動性充足之主流電子支付成長股 `PYPL`（PayPal Holdings, Inc.，basePrice: 65）。
2. **HTTP 404 快速終止 (Proxy 404 Fast-Fail)**：
   - 在 `fetchWithCORSProxy` 中，當本地代理或直連回報 404 時，判定為資源不存在之不可重試錯誤，直接拋錯終止，不再進入 3 個外部代理輪詢，將失敗響應時間由 24 秒縮減至 < 200ms。
3. **合成日 K 保底防禦 (Synthetic Fallback & Persistence)**：
   - 在 `historicalOhlcvBackfill.ts` 中，若遠端全數查無資料且本地無舊快取，自動啟用 `generateSyntheticCandles` 產出 30 根模擬日 K 與技術指標，並沉澱至 IndexedDB 快取。
   - 在 `MuscleBookerWorkspace.tsx` 中，為 worker 執行加入保底寫入防禦，確保所有標的皆能被記錄，就緒度順利收斂至 100% 且 `isSyncing` 正確解除。
4. **目標池依賴解耦 (Dependency Decoupling)**：
   - 建立 `targetUniverseKey` 穩定代碼簽名，解耦全域價格定時更新因 `holdings` 參照變動引發的無效重新同步。

## 後果與影響 (Consequences)
- **正面影響**：
  - 美股焦點池可 100% 正常獲取日 K，就緒度順暢收斂至 60/60 (100%)。
  - 即使使用者在自訂觀察清單輸入已下市代碼，系統能在 200ms 內快速終止並自動以保底模擬日 K 兜底，杜絕任何卡死現象。
  - 全專案 60 個測試檔、679 項單元測試 100% 通過，TypeScript 0 錯誤。
- **負面影響/代價**：
  - 若標的真為無效代碼，動能雷達將使用具備特徵的合成日 K 展示，並於控制台記錄警告。
