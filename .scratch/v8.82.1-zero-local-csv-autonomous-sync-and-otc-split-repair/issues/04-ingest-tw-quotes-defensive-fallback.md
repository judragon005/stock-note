# Ticket 04: SQLite 入庫層防禦性強化與防呆回退 (Spec 0170)

## 1. 任務核心 (Core Objective)
加固 `ingest-tw-quotes.cjs` 之 `saveTwQuotesToSqlite`，建立雙重防呆驗證機制：若行情物件自身缺漏 `symbol`，自動從鍵名補齊；遇到停牌、無成交量（成交量 0 或 `--`）標的自動平滑處理，確保入庫率恢復 100%。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/ingest-tw-quotes.cjs`
- `scripts/market-sync/ingest-tw-quotes.test.cjs` (新建/擴展)

## 3. 具體修復內容 (Refactoring Details)
1. `saveTwQuotesToSqlite(quotesMap, customDbPath)`：
   - 遍歷 `Object.entries(quotesMap)` 而非單純 `Object.values`：
     ```javascript
     for (const [keySymbol, item] of Object.entries(quotesMap)) {
       if (!item || !item.date || !item.close) continue;
       const resolvedSymbol = String(item.symbol || keySymbol).trim().toUpperCase();
       // 執行 stmt.run ...
     }
     ```
   - 若 `item.open <= 0`，以 `item.close` 填補；若 `item.high < item.close`，以 `Math.max(item.open, item.close)` 平滑；若 `item.low > item.close`，以 `Math.min(item.open, item.close)` 平滑。
2. 事務安全性：
   - 保留 `BEGIN TRANSACTION` / `COMMIT`，發生異常時自動 `ROLLBACK`。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 即使傳入未帶 `symbol` 的舊格式行情物件，入庫函式亦能從 Map Key 完美補齊，入庫成功數 100%。
- [ ] 傳入 2,400+ 檔行情資料時，成功寫入數大於 2,400，日誌不再顯示 `已寫入 0 檔`。
