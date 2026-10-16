# Issue #264 任務細緻拆解 (Micro-Tickets Breakdown)

本任務集對齊 Issue [#264](https://github.com/judragon005/stock-note/issues/264) 與 [Spec 0185](../../../docs/specs/0185-market-backfill-etf-cache-verification-and-transparency-spec.md)，依據**切片原則（Vertical Slice & KISS）** 將台股歷史回補 ETF 快取查驗納入與透視化可觀測性拆分為 **4 個獨立可驗收的 Micro-Tickets**，落實 TDD 紅-綠-重構循環。

---

## Ticket 清單總覽

| 票券編號 | 類型 | 模組標題 | 影響範圍 | 驗收標的 | 狀態 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Ticket 01** | `Lakehouse/SQL` | 單次掃描 SQL Prepared Statement 重構 | `scripts/market-sync/backfill-tw-history-web.cjs` | 擴充 stockStmt 為單次掃描條件聚合，涵蓋普通股與 `00*` ETF 並排除權證 | ✅ **已完成** |
| **Ticket 02** | `Core/Cache` | 快取健全度判定與回傳結構升級 | `scripts/market-sync/backfill-tw-history-web.cjs` | 暴露 totalCount, stockCount, etfCount，維持普通股 ≥ 1800 與籌碼 ≥ 2000 安全門檻 | ✅ **已完成** |
| **Ticket 03** | `Engine/Obs` | 終端機與回補日誌透視度升級 | `scripts/market-sync/backfill-tw-history-web.cjs` | 輸出 `(有效標的: X 檔 [股票: Y, ETF: Z], 籌碼: W 筆)`，消除認知落差 | ✅ **已完成** |
| **Ticket 04** | `Test/TDD` | 單元測試擴充與全專案回歸驗證 | `scripts/market-sync/backfill-tw-history-web.test.cjs` | 7 項單元測試 100% 綠燈，全專案 `npm test` 通過，`npm run build` 0 錯誤 | ✅ **已完成** |

---

## 各 Ticket 細部規格

### Ticket 01: 單次掃描 SQL Prepared Statement 重構
- **目標**：在 `scripts/market-sync/backfill-tw-history-web.cjs` 中升級 `getVerificationStmts` 的 `stockStmt`。
- **實作規範**：
  ```sql
  SELECT 
    count(*) AS totalCount,
    count(CASE WHEN symbol GLOB '[1-9][0-9][0-9][0-9]' THEN 1 END) AS stockCount,
    count(CASE WHEN symbol GLOB '00*' THEN 1 END) AS etfCount
  FROM daily_candles 
  WHERE date = ? AND (symbol GLOB '[1-9][0-9][0-9][0-9]' OR symbol GLOB '00*');
  ```
- **邊界防禦**：
  - 利用 SQLite 索引完成條件聚合（Single-Pass Scan），延遲保持在 1ms 內。
  - 精準鎖定 4 碼普通股（含創新板）與全量 `00*` 開頭 ETF，嚴格排除 6 碼權證。
- **測試接縫**：`scripts/market-sync/backfill-tw-history-web.test.cjs` 測試案例 6。

---

### Ticket 02: 快取健全度判定與回傳結構升級
- **目標**：在 `scripts/market-sync/backfill-tw-history-web.cjs` 的 `fetchAndIngestTwDailyData` 中整合新快取指標。
- **實作規範**：
  - 提取 `stockRow.totalCount`, `stockRow.stockCount`, `stockRow.etfCount` 與 `chipRow.n`。
  - 門檻判定：`stockCount >= 1800 && chipCount >= 2000` 且未帶 `--force`。
  - 回傳結構暴露：
    ```javascript
    return {
      date: dateStr,
      isTradingDay: true,
      cached: true,
      quotesCount: totalCount,
      stockCount,
      etfCount,
      chipsCount: chipCount,
    };
    ```
- **向後相容防禦**：
  - 判定門檻維持以普通股為基石，防止歷史回補至早年 ETF 檔數較少時造成快取失效誤判。
- **測試接縫**：`scripts/market-sync/backfill-tw-history-web.test.cjs` 測試案例 7。

---

### Ticket 03: 終端機與回補日誌透視度升級
- **目標**：在 `runTwDateDrivenBackfill` 中格式化快取命中日誌。
- **輸出格式**：
  ```javascript
  const stockInfo = res.stockCount !== undefined ? ` [股票: ${res.stockCount}, ETF: ${res.etfCount}]` : '';
  console.log(`✔ 快取命中已在庫 ⚡ 略過 (有效標的: ${res.quotesCount} 檔${stockInfo}, 籌碼: ${res.chipsCount} 筆)`);
  ```
  在進度回呼 `onProgress` 中同步傳遞 `stockCount` 與 `etfCount`。
- **驗收標的**：快取日誌清楚呈現股票與 ETF 筆數，與連網抓取的 2,400+ 檔口徑一致。

---

### Ticket 04: 單元測試擴充與全專案回歸驗證
- **目標**：確保全流程測試覆蓋與零副作用。
- **測試項目**：
  1. `backfill-tw-history-web.test.cjs` 測試 6：驗證 `getVerificationStmts` 精準辨識普通股與 ETF 並排除權證。
  2. `backfill-tw-history-web.test.cjs` 測試 7：驗證 `fetchAndIngestTwDailyData` 快取命中回傳值正確暴露 `stockCount` 與 `etfCount`。
  3. 全專案 `npm test`（1,641 個測試 100% 通過）。
  4. `npm run build` TypeScript 0 錯誤。
