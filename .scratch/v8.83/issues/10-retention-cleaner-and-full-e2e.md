# Ticket 10: 數據湖倉體積瘦身 (Retention Cleaner) 與全鏈路 E2E 端到端驗收 (Spec 0170)

## 1. 任務核心 (Core Objective)
建立 SQLite 資料庫清理淘汰機制（Retention Cleaner），將每個標的日 K 保留期收斂至最近 260 個交易日，安全封存多餘舊資料，將目前 217 MB 的資料庫瘦身至 45 MB 左右；編寫全鏈路端到端驗收測試，確保全工程 100% 綠燈與編譯 0 錯誤。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/retention-cleaner.cjs`
- `src/components/aiForceDashboard/ZeroCsvAutonomousE2E.test.ts` (新建)
- `docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md`
- `CONTEXT.md`

## 3. 具體內容 (Implementation Details)
1. `retention-cleaner.cjs`：
   - 保留各標的最近 260 根日 K，執行 `VACUUM` 釋放磁碟空間。
   - 驗證資料庫瘦身後，查詢效率顯著提升。
2. 端到端測試 `ZeroCsvAutonomousE2E.test.ts`：
   - 模擬使用者在主力戰情室隨意輸入上市（2330, 0050）、上櫃（3293）、債券 ETF（00679B）與美股。
   - 驗證日 K 線圖與任務五「原始資料表」均顯示包含昨天（10/07）與今天（10/08 盤中）的最新資料，零短缺、零斷層。
3. 驗證 `npm test` 100% 通過（600+ 測試綠燈）。
4. 驗證 `npm run build` TypeScript 0 錯誤。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 數據庫體積有效瘦身，核心查詢延遲在 5ms 以內。
- [ ] 全鏈路 E2E 測試驗收通過，確認 00679B 與 3293 日 K 包含昨天與今天。
- [ ] `npm test` 與 `npm run build` 全部綠燈。
- [ ] 同步更新技術債 0043 狀態為 `RESOLVED` 並更新 `CONTEXT.md`。
