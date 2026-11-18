# Issue 01: TDCC 集保與月營收回補腳本去假 (De-Mocking) 與既有合成假數據清洗

- **層級**: 後端資料管線 / 資料湖倉
- **關聯規格**: Spec 0237 Ticket 1 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 移除 `scripts/market-sync/ingest-tw-tdcc.cjs` 中以代號 seed 配合 `Math.sin/cos` 生成 10 週假集保大戶數據之邏輯，改接 TDCC 開放資料 CSV (`1-5` 股權分散表) 與 FinMind API。
2. 移除 `scripts/market-sync/ingest-tw-monthly-revenue.cjs` 中以 `Math.sin/cos` 生成 12 個月假營收 YoY/MoM 之邏輯，改接 TWSE/TPEx 官方月營收 OpenAPI (`t187ap05_L`)。
3. 實作 `purgeSyntheticRecords` 清除既有入庫之合成假紀錄，並標註真實資料來源。
