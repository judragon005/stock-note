# Ticket 03: 盤後同步日 K 行情解析層補齊 symbol 屬性 (Spec 0170)

## 1. 任務核心 (Core Objective)
修復 `market-sync-core.cjs` 中 TWSE 與 TPEx 全市場收盤行情解析函式漏賦 `symbol` 屬性的致命 Bug，終結日常同步產出之物件無法通過驗證之根本問題。

## 2. 目標檔案 (Target Files)
- `scripts/market-sync/market-sync-core.cjs`
- `scripts/market-sync/market-sync-core.test.cjs` (新建/擴展)

## 3. 具體修復內容 (Bug Fix Details)
1. 在 `parseTwseDailyQuotesBulk(rawData, dateStr)` 中：
   - 走訪 `rawData.tables` 或 `rawData.data` 時，建構之物件必須包含 `symbol` 屬性：
     ```javascript
     result[symbol] = {
       symbol, // 顯式賦值標準代碼
       date: dateStr,
       open: open > 0 ? open : close,
       high: high > 0 ? high : close,
       low: low > 0 ? low : close,
       close,
       volume,
     };
     ```
2. 在 `parseTpexDailyQuotesBulk(rawData, dateStr)` 中：
   - 同步補齊 `symbol` 屬性，並強制清洗可能的結尾空白。

## 4. 驗收標準 (Acceptance Criteria)
- [ ] 單元測試驗證傳入 TWSE 與 TPEx 模擬回傳值時，回傳之所有行情物件 `item.symbol` 均為非空字串，且與鍵名一致。
- [ ] 測試涵蓋股票（如 2330）、ETF（如 0050）、債券 ETF（如 00679B）與上櫃股票（如 3293）。
