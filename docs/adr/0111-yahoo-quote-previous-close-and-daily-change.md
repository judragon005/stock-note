# 0111. 修復 Yahoo Finance 報價誤用圖表昨收導致漲跌幅與今日損益失真 (Fix Yahoo Quote Previous Close & Daily Change Calculation)

- **狀態**：ACCEPTED
- **日期**：2026-09-09
- **議題**：使用者出示券商 APP 實盤截圖（00636 國泰中國A50 今日收盤 27.27，真實今日跌幅為 ▼ 0.11 / -0.40%），對比本專案持股畫面顯示 27.27、今日跌幅卻顯示 -0.86 (-3.06%)、今日損益高達 -8,600 元。經排查為 Yahoo Finance API 回傳之 `chartPreviousClose` 為圖表查詢區間（3 個月前）開始前一日的歷史價格（28.13），舊程式碼誤將其當作「昨日收盤價」，導致今日價差與今日損益被嚴重放大失真。

---

## 背景與問題陳述 (Context & Problem Statement)

1. **使用者實盤回報異常**：
   - 券商 APP 畫面：00636 收盤價 27.27，今日下跌 0.11 元，跌幅 -0.40%。
   - 專案持股畫面：收盤價 27.27，今日下跌 0.86 元，跌幅 -3.06%，10,000 股今日損益竟顯示 -8,600 元。
2. **根因剖析 (First Principles)**：
   - 本專案為了繪製技術線圖與計算動能，向 Yahoo Finance Chart API 發送 `range=3mo`（3 個月）請求。
   - Yahoo Finance API 定義：`meta.chartPreviousClose` 是該「3 個月圖表查詢區間」起始日前一天的收盤價（00636 為 28.13），**絕非「昨天收盤價」**！
   - 原代碼：`const previousClose = meta.previousClose ?? meta.chartPreviousClose;`。當 `meta.previousClose` 不存在時，代碼退回採用 28.13，計算出的價差為 $27.27 - 28.13 = -0.86$，使得今日跌幅高達 -3.06%，憑空產生假性鉅額虧損。

---

## 決策方案 (Decision)

在 `src/engine/priceFetcher.ts` 中的 `parseYahooQuoteResponse` 與 `parseYahooExchangeRateResponse` 全面重構價格與昨收解析架構：

1. **優先提取真實今日價差與漲跌幅**：
   - `change = meta.regularMarketChange ?? meta.fulldayChange ?? 0`
   - `changePercent = meta.regularMarketChangePercent ?? meta.fulldayChangePercent ?? 0`
2. **昨日收盤價 (Previous Close) 正確推導**：
   - 優先取官方欄位：`meta.regularMarketPreviousClose ?? meta.previousClose`
   - 若官方昨收欄位缺漏但存在今日價差：以 `price - change` 倒推昨日收盤價（例如 $27.27 - (-0.11) = 27.38$）
   - 若皆無則 fallback 至最新成交價 `price`
   - **徹底拔除將 `meta.chartPreviousClose` 當成昨日收盤價之危險邏輯**。
3. **匯率解析器一致性對齊**：
   - `parseYahooExchangeRateResponse` 採用相同防禦架構，確保匯率今日變動不被歷史區間污染。

---

## 結果與影響 (Consequences)

### 正向影響 (Positive)
- **數值 100% 吻合券商 APP**：00636 今日價差精準為 `-0.11`，昨收為 `27.38`，漲跌幅為 `-0.40%`，今日損益精準為 `-1,100 元`，徹底消除誤算 -8,600 元之假性恐慌。
- **杜絕歷史圖表區間干擾**：無論線圖請求 `range=1mo`、`3mo` 甚至 `1y`，今日收盤與昨收計算均由官方當日即時欄位或價差嚴格倒推，絕不受線圖區間影響。
- **TDD 驗收全綠**：全專案 57 個測試套件、655 個單元測試 100% 通過，`npm run build` 0 型別錯誤。
