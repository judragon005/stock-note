# Issue 03: 無效股票代碼防護機制 (Invalid Symbol Guard) 與名單清洗

## 狀態與分流

- 狀態：`CLOSED` (已實作無效代碼存在性驗證、阻擋加入與清理 3175 等幽靈標的)
- 負責人：Agent
- 標籤：`ready-for-agent`, `component`, `validation`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.tsx` 的 `handleAddCustomSymbol`：
   - 增加代碼有效性驗證：檢查是否在 `STATIC_SECURITY_NAMES` 或字典中；若不在，嘗試透過 `backfillSymbolOhlcvAndIndicators` 連線驗證是否有日 K。
   - 若查無此代碼（如 3175），**禁止加入**，並設定 `customInputError` 提示：「查無股票代碼『3175』，無法加入觀察名單」。
2. 在元件載入時，針對 `watchlistSymbols` 中的既有標的，自動過濾掉查無日 K 且不在字典中的無效幽靈代碼（如 3175）。
