# Issue 03: 回補引擎保底合成與工作區就緒度收斂防禦

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `ui-ux`
- 關聯 Issue：#3

## 任務說明
1. 修改 `src/engine/historicalOhlcvBackfill.ts`：
   - 當所有候選代碼均抓不到日 K 且本地無舊快取時，自動調用 `generateSyntheticCandles` 產出 30 根合成日 K 與指標。
   - 沉澱寫入本地 IndexedDB 並回傳可用資料，標記保底防禦。
2. 修改 `src/components/MuscleBookerWorkspace.tsx`：
   - 無論抓取結果為即時日 K 或保底日 K，完成後均寫入 `cachedCandlesMap`。
   - 解耦 `targetUniverse` 對全域報價定時更新的無效干擾。
   - 確保就緒度推進至 100% 且 `isSyncing` 順利解除。
