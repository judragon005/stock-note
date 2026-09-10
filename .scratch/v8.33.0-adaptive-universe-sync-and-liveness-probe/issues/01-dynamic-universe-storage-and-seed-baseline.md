# Issue 01: 本地持久層與分級讀取抽象 (Tiered Storage & Baseline)

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `storage`
- 關聯 Issue：#5

## 任務說明
1. 在 `src/utils/storage.ts` 建立動態成分股存儲介面：
   - `getDynamicUniverseStorage(market, pool)`
   - `saveDynamicUniverseStorage(market, pool, data)`
2. 支援存儲版本號、最後校準日期與有效/失效標的狀態清單。
3. 若無快取，自動退回靜態種子清單作為 Baseline 保證 0 延遲秒開。
