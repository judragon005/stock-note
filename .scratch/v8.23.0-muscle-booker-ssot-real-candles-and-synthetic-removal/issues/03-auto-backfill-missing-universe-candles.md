# Issue 03: 自訂觀察清單標的真實日 K 自動回補與反應式重算

## 狀態與分流

- 狀態：`CLOSED` (已實作缺損標的背景平滑自動回補與反應式重算，並徹底移除假 K 殘留)
- 負責人：Agent
- 標籤：`ready-for-agent`, `component`, `backfill`

## 任務說明

1. 在 `MuscleBookerWorkspace.tsx` 中：
   - 當使用者新增標的至 `watchlistSymbols`，或當前選定池子存在尚未有日 K 的標的時：
   - 啟動受控非同步回補 `backfillSymbolOhlcvAndIndicators(sym, market, false)`。
   - 回補完成時更新 `cachedCandlesMap`，觸發 `scannedItems` 依據最新真實日 K 自動重算。
2. 徹底移除原先用 `c * 1.01` 與 `c * 0.99` 拼裝假 K 線之殘留代碼。
