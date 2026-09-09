# Issue 03: 市場智能推斷引擎 (inferMarketFromSymbol) 與官方字典校正

## 狀態

- 狀態：`CLOSED` (已實作 inferMarketFromSymbol 並校正 6204 艾華字典)
- 負責人：Agent
- 標籤：`ready-for-agent`, `market`, `dictionary`

## 需求說明

1. 在 `src/engine/priceFetcher.ts` 實作並匯出 `inferMarketFromSymbol(rawInput: string): MarketType`：
   - 包含台股主動型 ETF（如 `00403A`、`00981A`）之規則。
   - 包含輸入結尾帶 `.TW` 或 `.TWO` 的台股判定。
   - 包含輸入結尾帶 `.US` 的美股判定。
   - 字典存在台股標的優先歸為 `TW`。
2. 在 `MuscleBookerWorkspace.tsx` 引用此函式替換原本簡化的 `/^\d+$/` 判斷。
3. 在 `src/data/stockDictionary.ts` 將 `6204O` 校準為 `6204`，確保名稱「艾華」能被 `resolveOfficialSecurityName` 正確解析。
