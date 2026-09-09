# 交接報告: v8.30.0 修復 Yahoo Finance 報價誤用圖表昨收導致漲跌幅與今日損益失真

- **版本**: `v8.30.0`
- **日期**: 2026-09-09
- **分支**: `fix/0111-yahoo-quote-previous-close-and-daily-change-fix`
- **關聯規格**: `docs/specs/0111-yahoo-quote-previous-close-and-daily-change-spec.md`
- **關聯決策**: `docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md`

---

## 1. 任務核心目標 (Core Objective)
使用者出示券商 APP 截圖（00636 國泰中國A50 今日收盤 27.27，跌幅 ▼ 0.11 / -0.40%），對比本專案持股畫面顯示 27.27、今日跌幅卻顯示 -0.86 (-3.06%)、今日損益高達 -8,600 元。經排查為 Yahoo Finance API 回傳之 `chartPreviousClose` 為圖表查詢區間（3 個月前）開始前一日的歷史價格（28.13），舊程式碼誤將其當作「昨日收盤價」，導致今日價差與今日損益被嚴重放大失真。

---

## 2. 異動模組與檔案清單 (Changed Modules)
1. `src/engine/priceFetcher.ts`:
   - 重構 `parseYahooQuoteResponse` 與 `parseYahooExchangeRateResponse`。
   - 優先提取真實今日價差 `meta.regularMarketChange ?? meta.fulldayChange`。
   - 優先提取真實今日漲跌幅 `meta.regularMarketChangePercent ?? meta.fulldayChangePercent`。
   - 昨收價優先取 `meta.regularMarketPreviousClose ?? meta.previousClose`，若無則精準以 `price - change` 倒推，徹底拔除 `meta.chartPreviousClose`。
2. `src/engine/priceFetcher.test.ts`:
   - 新增 00636 實盤驗證測試：模擬 `regularMarketPrice: 27.27, fulldayChange: -0.11, chartPreviousClose: 28.13`。
   - 斷言驗收：`price = 27.27`、`change = -0.11`、`previousClose = 27.38`、`changePercent = -0.402%`。
3. `docs/specs/0111-yahoo-quote-previous-close-and-daily-change-spec.md`:
   - 完整記錄規格與驗收條件。
4. `.scratch/v8.30.0-yahoo-quote-previous-close-and-daily-change/issues/`:
   - 01~03 號票券全數驗收關閉 (`CLOSED`)。
5. `docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md`:
   - 架構決策記錄。

---

## 3. 驗證結果 (Verification)
- **Vitest 單元測試**: 57 個測試套件、655 個單元測試全數通過（100% 綠燈）。
- **TypeScript 構建**: `npm run build` 0 型別錯誤，Vite 打包成功。

---

## 4. 後續維護指引 (Maintenance Guide)
- 任何報價 API 資料來源若包含圖表週期（如 `1mo`, `3mo`, `1y`），其 `chartPreviousClose` 為區間起算點前一日價格，切勿直接作為「昨日收盤價」。
- 今日損益與漲跌幅之計算一律優先信賴交易所/官方發布之 `regularMarketChange` 或以即時成交價扣除價差倒推昨收。
