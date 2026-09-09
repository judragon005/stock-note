# Issue 01: 在庫持股限定賣出計算與過濾邏輯 (Holding-Gated Sell Computation)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `logic`

## 任務說明

1. 在 `MuscleBookerWorkspace.tsx` 建立 `holdingGatedSellItems` 計算：
   - 篩選條件：必須是 `activeHoldings`（`shares > 0`）且技術判定為 `SELL`。
   - 包含對象：若當前目標池不為 HOLDINGS 時，可交叉比對在庫持股狀態，或從在庫持股中篩選出跌破箱底標的。
   - 排序：按跌破幅度排序。
2. 建立 `top3BuyItems` 計算：
   - 取 `buyItems` 前 3 檔（已依風益比降序排序）。
