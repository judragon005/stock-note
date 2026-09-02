# ADR 0027: 現金流水帳自然排序、股息紀錄持久化與單一市場 NAV 精確過濾

## 狀態
已採納 (Accepted)

## 背景與問題
1. 現金流水帳在未提供時間戳時以 `new Date("YYYY-MM-DD")` 解析易受時區偏差導致排序紊亂或 `NaN`。
2. 畫面重新整理後，若有部分舊資料缺失 `symbol` 或 `accountId`，先前 Schema 驗證會將整庫交易清空。
3. 台股資產成長 (NAV) 折線圖先前未依市場嚴格過濾，導致美股入金與交割款外溢至台股圖表。

## 決策內容
1. **自然字串排序**：於 `cashLedgerEngine.ts` 實作 `sortCashTransactions`，使用 `(a.tradeDate || a.date).localeCompare(b.tradeDate || b.date)` 自然字串排序，並依金流權重（流入 ➔ 稅費 ➔ 流出）排列。
2. **Schema 逐筆容錯升級**：在 `storage.ts` 將 `validateTradesSchema` 改為逐筆檢驗容錯修復，並於 `App.tsx` 初始化時自動執行 `syncTradesWithCashTransactions`。
3. **單一市場 NAV 精確隔離**：在 `App.tsx` 依 `currentMarket` 嚴格過濾 `scopedTrades`、`scopedCash` 與 `scopedLoans`。

## 後續影響
- 流水帳自然排序穩定無時區誤差。
- 美股股息補登後重整不消失。
- 台股 NAV 折線圖淨資產與台股投資組合 100% 精確對齊。
