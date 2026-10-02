# 05 — 湖倉稽核驗證器擴充與端到端測試套件 (Audit Verifier & E2E Testing Suite)

**What to build:**
1. 修改 `scripts/market-sync/audit-verifier.cjs`：
   - 擴充美股稽核指標：總註冊標的數（預期 >= 1,500 檔）、當日成功數、失敗數、Checkpoint 覆蓋率百分比。
   - 檢驗美股最新行情日期間隔是否合規（自動比對美股交易日曆，排除假日假性缺漏）。
2. 撰寫單元與整合測試套件 `src/engine/usMarketIngestionPipeline.test.ts`：
   - 測試優先級隊列排序與持股置頂行為。
   - 測試斷點續傳篩選機制（跳過今日 SUCCESS 標的）。
   - 測試 429 捕獲與退避等待邏輯。
   - 驗證 SQLite 湖倉入庫之數據完整性（包含 open, high, low, close, adj_close, volume, turnover）。
3. 確保全專案 `npm test` 100% 綠燈，建置 0 錯誤。

**Blocked by:** Ticket 04

**Status:** completed

- [x] 擴充 `audit-verifier.cjs` 美股資料庫涵蓋率與健康度檢查。
- [x] 撰寫 `src/engine/usMarketIngestionPipeline.test.ts` 測試套件。
- [x] 執行 `npm test` 確認既有與新增測試 100% 通過。
