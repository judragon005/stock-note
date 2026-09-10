# Issue 02: 存活探針與自動遞補引擎 (Liveness Probe & Auto-Healing)

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `network`
- 關聯 Issue：#5

## 任務說明
1. 建立 `src/engine/adaptiveUniverseEngine.ts`：
   - 實作存活探針 `probeSymbolLiveness(symbol, market)`。
   - 遇連續 404/下市/查無報價標的，自動將其標記為 `INACTIVE`。
   - 自動從候補備用庫中挑選最高流動性之同市場標的遞補空缺，維持 Top 30 / Top 50 滿編。
2. 撰寫單元測試覆蓋存活探針識別與自動遞補邏輯。
