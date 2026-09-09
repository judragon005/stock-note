# Issue 03: 美股貨幣別統一標示 US$ (US Stock Currency Formatting)

## 狀態與分流

- 狀態：`CLOSED` (已實作 formatCurrencyPrice 並全面套用)
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `ux`

## 任務說明

1. 在 `src/components/MuscleBookerWorkspace.tsx` 實作 `formatCurrencyPrice(price?: number, market?: 'TW' | 'US')` 函數：
   - 當 `market === 'US'` 時：一律顯示 `US$ {price}`（例如 `US$ 368.16`）。
   - 當 `market === 'TW'` 時：一律顯示 `NT$ {price}` 或 `$ {price}`（例如 `$1,010`）。
2. 全面套用於：
   - 作戰指令看板（買進先鋒與在庫賣出之現價、防守價、目標價）。
   - 三色操盤導航儀（買進、觀望、賣出卡片）。
   - 下方均線扣抵望遠鏡表格（現價、扣抵價、防守價、目標價）。
