# 04 — 台股總經衍生品採集 (TAIFEX Big5 期貨 OI / P/C Ratio / 融資維持率) 與逐欄非空合併

**Parent:** #592 (Spec 0239)
**What to build:** 修復 TAIFEX 期貨未平倉採集器以 `TextDecoder('big5')`（含 UTF-8 偵測回退）正確解碼官方中文 CSV，補齊台指選擇權 Put/Call Ratio (`tw_put_call_ratio`) 與全市場信用融資維持率 (`tw_margin_maintenance_ratio`) 之真實計算與入庫；升級 `/api/market/history/:symbol` 總經查詢為近 7 筆逐欄最新非空值合併，確保盤前部分欄位為 `NULL` 時不抹除前一結算日之有效衍生品數據。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用
**Status:** ready-for-agent

- [ ] TAIFEX Big5 編碼 CSV 可正確解析「臺股期貨」外資與投信未平倉淨口數並寫入 `macro_sentiment_daily`。
- [ ] `tw_put_call_ratio` 與 `tw_margin_maintenance_ratio` 具備真實官方來源解析與入庫驗證（不再寫死 `null` 或讀取不存在的 `maintenanceRatio` 欄位）。
- [ ] 當 `macro_sentiment_daily` 最新一列（如今日盤前）之 `tw_foreign_futures_oi` / `tw_put_call_ratio` 為 `NULL`，而前一日有值時，`/api/market/history/:symbol` 回傳之 `macro` 物件正確合併前一結算日之有效非空值並附帶基準日。
