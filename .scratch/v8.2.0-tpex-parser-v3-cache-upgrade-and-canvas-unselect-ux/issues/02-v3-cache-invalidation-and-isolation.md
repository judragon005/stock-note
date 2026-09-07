# Ticket 02: 三大法人日報 V3 快取前綴升級與污染隔離

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:bugfix`
- **領域**：`area:engine`
- **優先級**：`priority:high`
- **標流標籤**：`ready-for-agent`

## 需求描述
將 `smartMoneyFetcher.ts` 快取前綴 `CACHE_KEY_PREFIX` 升級為 `TWSE_TPEX_CHIPS_V3_`，自動作廢並隔離過去未包含上櫃股票的污染快取，確保瀏覽器再次載入時重新抓取上市櫃雙軌日報。

## 驗收條件
1. 快取寫入與讀取均採用全新 V3 前綴。
2. 既有單元測試均正確模擬與通過。
