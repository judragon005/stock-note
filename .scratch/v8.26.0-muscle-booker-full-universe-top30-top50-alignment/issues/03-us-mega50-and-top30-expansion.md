# Issue 03: 美股巨頭 Top 50 與焦點 Top 30 滿編擴充 (US Mega 50 & Top 30 Expansion)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `constants`, `us-stock`

## 任務說明

1. 在 `src/engine/muscleBookerEngine.ts` 中將 `US_MEGA_50_CORE_SYMBOLS` 擴充至滿編 50 檔（S&P 50 巨頭全名單）。
2. 將 `US_TOP_30_FOCUS_SYMBOLS` 擴充至滿編 30 檔（納斯達克與熱門動能飆股全名單）。
3. 確保 `US_MEGA_50_CORE_SYMBOLS.length === 50` 且 `US_TOP_30_FOCUS_SYMBOLS.length === 30`。
