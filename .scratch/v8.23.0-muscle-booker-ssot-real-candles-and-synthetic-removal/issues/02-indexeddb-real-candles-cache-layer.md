# Issue 02: 工作區真實日 K 快取層 (SSOT Cache Layer) 與 IndexedDB 對接

## 狀態與分流

- 狀態：`CLOSED` (已建立 cachedCandlesMap 並與 IndexedDB 異步加載對接)
- 負責人：Agent
- 標籤：`ready-for-agent`, `component`, `indexeddb`, `cache`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.tsx` 導入：
   - 本地真實日 K 快取狀態 `cachedCandlesMap: Record<string, DailyCandle[]>`。
   - 掛載時與切換市場時，呼叫 `getSymbolOhlcv` 批次載入當前目標池中已快取的真實日 K。
2. 當執行 `handleRunAdHocScan` 取得遠端日 K 線時：
   - 將取得的 `res.candles` 即時寫入 `cachedCandlesMap[raw]`。
   - 保證無論點擊連線診斷前或後，工作區池子計算所取用的日 K 均為同一份真實數列。
