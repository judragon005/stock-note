# 規格文件 0185：台股歷史回補 ETF 快取查驗納入與透視化可觀測性規格 (Spec 0185)

## 1. 概述與背景 (Context & Problem Statement)

在版本 v8.97.0 (Spec 0184) 引入的「SQLite 雙指標智慧快取秒級略過 (Smart Cache Skip)」機制中，後端快取健全度查驗 SQL 原設定為：
```sql
SELECT count(*) AS n FROM daily_candles WHERE date = ? AND symbol GLOB '[1-9][0-9][0-9][0-9]';
```
此規則在終端機輸出：
```text
✔ 快取命中已在庫 ⚡ 略過 (4碼股票: 1979 檔, 籌碼: 2271 筆)
```
然而當當日無快取命中發起連網爬蟲時，官方爬蟲解析輸出為：
```text
✔ 成功 [上市: 1361 檔 | 上櫃: 1117 檔] [籌碼: 2253 檔] (合計 2,478 檔)
```
此數據落差引發以下問題：
1. **ETF 標的在快取統計中完全隱形**：全台 00 開頭之指數股票型基金 (ETF，含 0050、0056、00878、00929、00679B 等股票與債券型 ETF，約 300~360 檔) 皆以 `00` 開頭，被 `[1-9]` 開頭之 GLOB 條件嚴格過濾，導致使用者誤以為 ETF 未被回補或未入庫。
2. **法人口徑與籌碼表對齊落差**：三大法人買賣超 (T86) 官方報表天生排除權證，實體筆數穩定在 2,230 ~ 2,280 筆之間。原本 1,979 檔的純普通股與 2,271 筆籌碼在數量上產生語意不一致，未能反映法人核心現貨池（普通股 + ETF = ~2,330 檔）的真實樣貌。
3. **創新板（TIB）之邊界透明度**：創新板代碼皆為標準 4 碼純數字（如 6854、6902），原先即在庫存中，但需在領域文檔與規格中明確定義，避免混淆。

---

## 2. 業務價值與核心原則 (Business Value & Core Principles)

1. **券商與法人級核心現貨池定義 (Core Universe Invariant)**：
   - 核心交易現貨池嚴格鎖定為：**4 碼普通股（含上市、上櫃、創新板） + 00 開頭之全量 ETF（含股票型、債券型、槓反型）**。
   - 嚴格隔離：權證（03~08 六碼、7 開頭六碼）、可轉債 (CB) 等高波動且短期生滅之衍生商品，杜絕干擾快取健康基準。
2. **單次掃描極限效能 (Single-Pass B-Tree Scan)**：
   - 不增加多次 SQL 往返，透過 SQLite 條件聚合（Conditional Aggregation）於單次索引查詢中同時解析有效總標的數、普通股數與 ETF 數，延遲控制在 1ms 內。
3. **向後相容防禦性門檻 (Backward Compatibility & Defense-in-Depth)**：
   - 門檻判定以普通股 ≥ 1,800 與籌碼 ≥ 2,000 為安全防線，防止歷史回補至 10~20 年前早期台股市場（當時 ETF 檔數極少）時，發生快取誤判失效而重複對證交所發動高頻爬取。
4. **極致透明可觀測性 (Extreme Observability Transparency)**：
   - 終端機與回補日誌明確提供分層透視資訊，讓使用者對資料庫在庫狀況具備 100% 信心。

---

## 3. 系統不變性定理 (System Invariants)

1. **代碼涵蓋完整性定理 (Symbol Coverage Invariant)**：
   - 快取驗證之標的集必須為 `(symbol GLOB '[1-9][0-9][0-9][0-9]' OR symbol GLOB '00*')`。
   - 該聯集完整覆蓋所有台股普通股（含創新板）與全量 ETF，同時自動排除所有權證。
2. **快取秒級略過恆等定理 (Cache Skip Invariant)**：
   - 當單日滿足 `stockCount >= 1800 && chipCount >= 2000` 且未指定 `force: true` 時，必定略過網路請求與 3 秒冷卻延遲，直接由本地資料庫提供當日指標。
3. **數據透明度定理 (Transparency Invariant)**：
   - 快取略過回報物件必須暴露 `totalCount`、`stockCount`、`etfCount` 及 `chipsCount`，供後續 UI 儀表板與日誌即時消費。

---

## 4. 詳細功能與技術規格 (Technical Specifications)

### 模組 1：Prepared Statement 與單次掃描 SQL 重構
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **函數**：`getVerificationStmts(db)`
- **SQL 改造**：
  ```sql
  SELECT 
    count(*) AS totalCount,
    count(CASE WHEN symbol GLOB '[1-9][0-9][0-9][0-9]' THEN 1 END) AS stockCount,
    count(CASE WHEN symbol GLOB '00*' THEN 1 END) AS etfCount
  FROM daily_candles 
  WHERE date = ? AND (symbol GLOB '[1-9][0-9][0-9][0-9]' OR symbol GLOB '00*');
  ```
  籌碼表語句保持不變：
  ```sql
  SELECT count(*) AS n FROM tw_institutional_chips WHERE date = ?;
  ```

### 模組 2：快取健康雙重閘門與回傳結構升級
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **函數**：`fetchAndIngestTwDailyData(dateStr, options)`
- **判定邏輯**：
  ```javascript
  const stockRow = stockStmt.get(dateStr);
  const chipRow = chipStmt.get(dateStr);
  const totalCount = stockRow ? Number(stockRow.totalCount) : 0;
  const stockCount = stockRow ? Number(stockRow.stockCount) : 0;
  const etfCount = stockRow ? Number(stockRow.etfCount) : 0;
  const chipCount = chipRow ? Number(chipRow.n) : 0;

  // 雙指標安全快取判定：普通股 >= 1800 且 籌碼 >= 2000
  if (stockCount >= 1800 && chipCount >= 2000) {
    return {
      date: dateStr,
      isTradingDay: true,
      cached: true,
      quotesCount: totalCount,
      stockCount,
      etfCount,
      chipsCount: chipCount,
    };
  }
  ```

### 模組 3：終端機與可觀測性日誌升級
- **檔案**：`scripts/market-sync/backfill-tw-history-web.cjs`
- **輸出格式**：
  當快取命中時：
  ```text
  ✔ 快取命中已在庫 ⚡ 略過 (有效標的: ${totalCount} 檔 [股票: ${stockCount}, ETF: ${etfCount}], 籌碼: ${chipCount} 筆)
  ```
  大幅提升透明度，徹底消除「為什麼只有 1979 檔，ETF 是否漏抓」的疑慮。

---

## 5. 驗證標準與測試案例 (Validation & TDD Test Cases)

1. **單元測試 (`scripts/market-sync/backfill-tw-history-web.test.cjs`)**：
   - 建立暫態 SQLite in-memory 資料庫，注入 1,900 筆 4 碼普通股、300 筆 00 開頭 ETF（包含帶英文字尾之 00679B）、50 筆 6 碼權證、以及 2,100 筆籌碼。
   - 驗證 `stockStmt` 正確識別 `totalCount = 2200`, `stockCount = 1900`, `etfCount = 300`，且未納入 50 筆權證。
   - 驗證 `fetchAndIngestTwDailyData` 觸發 `cached: true`，回傳之 `quotesCount` 為 2200。
2. **完整回歸測試**：
   - 執行 `npm test` 確保 100% 測試綠燈。
   - 執行 `npm run build` 確保 TypeScript 編譯零錯誤。

---

## 6. 領域文檔同步 (Domain Docs Sync)

於本次迭代同步更新：
1. `CONTEXT.md`：更新 SQLite 雙指標快取略過判定說明，明確標註包含 ETF 與代碼規則。
2. 本次 PR 完成後輸出對應之 Handoff 交接紀錄。
