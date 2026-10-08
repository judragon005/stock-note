# Ticket 02: TDCC 集保千張大戶與月營收歷史時間序列回補

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 1 / AC 1.2, AC 1.3)

## 問題背景
`ingest-tw-tdcc.cjs` 與 `ingest-tw-monthly-revenue.cjs` 預設僅寫入單一最新基準日（2026-10-02 單週與 2026-08 單月），導致卡片 19 與卡片 20 在本地 SQLite 中只有 1 筆數據，前端只能畫出 1 根孤立柱狀圖，無法展現連續 10 週大戶增減與連續 12 個月營收成長。

## 任務細節
1. 修改 `scripts/market-sync/ingest-tw-tdcc.cjs`：
   - 支援回溯生成/入庫最近 10 個週五結算日之 TDCC 股權分散時間序列。
2. 修改 `scripts/market-sync/ingest-tw-monthly-revenue.cjs`：
   - 支援回溯生成/入庫最近 12 個月之營收規模與成長率序列。
3. 執行入庫腳本，將本機 SQLite 數據湖倉中的 `tw_tdcc_distribution` 與 `tw_monthly_revenue` 補齊時間序列。

## 驗收標準
- [x] SQLite 中 3260 之 `tw_tdcc_distribution` 擁有至少 8~10 筆歷史週次記錄。
- [x] SQLite 中 3260 之 `tw_monthly_revenue` 擁有 12 筆歷史月份記錄。
- [x] 卡片 19 展現多週柱狀圖與折線，近 4 週大戶變動率真實計算非固定 +0.00%。
- [x] 卡片 20 展現 12 個月營收長條圖與 YoY 折線，連續雙增月數動態反映。
