# Ticket #01: 靜態台美股官方名稱種子資料庫與資料模型建置

## 🎯 任務目標
在 `src/data/stockDictionary.ts` 中建立完整型別定義與靜態種子資料庫，收錄全量台股（TWSE 上市 + TPEx 上櫃/興櫃 2,000+ 檔標的）與美股（S&P 500 / Nasdaq 100 / 主流 ETF 500+ 檔標的）繁體中文名稱。

---

## 🛠️ 實作要點
1. 定義 `StockDictionaryItem` 介面（含 `symbol`, `name`, `market`, `englishName`, `category`, `source`, `updatedAt`）。
2. 匯總並打包全量台股上市/上櫃/興櫃官方代碼與繁體中文簡稱（如 `2330` ➔ `台積電`, `0050` ➔ `元大台灣50`, `6547` ➔ `高端疫苗` 等）。
3. 匯總美股核心 500+ 檔繁體中文簡稱（如 `NVDA` ➔ `輝達`, `AAPL` ➔ `蘋果`, `VOO` ➔ `Vanguard標普500 ETF`, `VT` ➔ `Vanguard全世界股票ETF`, `TLT` ➔ `iShares 20年期以上美國公債ETF` 等）。
4. 提供 `STATIC_STOCK_DICTIONARY` 與快速鍵值 Map 匯出。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] `src/data/stockDictionary.ts` 成功匯出全量台股與美股靜態清單。
- [ ] 涵蓋台股 2,000+ 檔與美股 500+ 檔標的。
- [ ] TypeScript 型別安全，零編譯錯誤。
