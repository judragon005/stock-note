# Ticket 02: 專案內所有本機硬碟 CSV 硬編碼路徑盤點與徹底除役 (Spec 0170)

## 1. 任務核心 (Core Objective)
徹底拔除專案中對本地硬碟磁碟路徑（如 `D:\APP\諮詢\私人\股市\...`）的依賴，將系統解耦為「可在任意機器或無本地 CSV 環境中運行的自給自足管線」。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/backfill-local-csv.cjs`
- `scripts/market-sync/sqlite-db-core.cjs`
- `scripts/market-sync/backfill-full-market-history.cjs`

## 3. 具體重構內容 (Refactoring Details)
1. 盤點全專案所有 `D:\` 開頭或 `HISTORICAL_BASE_DIR` 硬編碼路徑。
2. 重構 `scripts/market-sync/backfill-local-csv.cjs`：
   - 增加環境探測：若目標路徑不存在，優雅告警並跳過，嚴禁拋出未捕獲錯誤或中斷服務。
   - 標記該檔案為非核心/本機調研專用，從正式服務調度清單中解約。
3. 確保 `sqlite-db-core.cjs` 中資料庫預設路徑為專案根目錄相對路徑（`.scratch/market-cache/market_history.db`），跨平台（Windows / Linux / macOS）皆可正確解析。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 全域搜尋 `HISTORICAL_BASE_DIR` 與硬編碼磁碟字串，確認已完全隔離或移出日常執行鏈。
- [ ] 在不存在 `D:\` 槽的測試環境中執行伺服器與中介層，不引發模組加載崩潰。
