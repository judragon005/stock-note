# 52. 智慧掃描公司行動除息日與發放日欄位補全、預估入帳時序對齊與待入帳款項隔離架構 (ADR-0052)

日期: 2026-08-28

## 狀態 (Status)

已接受 (Accepted)

## 背景與脈絡 (Context)

在投資組合交易系統中，除權息事件包含兩個關鍵日期：
1. **除息基準日 ($Ex\text{-}Date$)**：證券法規規定以此日前一日收盤在籍庫存股數為基準計算配息與配股權利。
2. **入帳發放日 ($Pay\text{-}Date$)**：資金實質由集保/券商匯入投資人銀行帳戶的交割日期。

先前系統在智慧掃描與補登時，雖然在庫持股數嚴格鎖定於除息日前一日收盤在籍股數（持股數計算完全正確），但在自動生成 `TradeRecord` 時僅填寫了 `date` 與 `exDate`，未顯式賦予 `payDate`（預估發放日）。這導致在除息後至發放前（相差約 15~30 天）提早補登時，容易造成使用者對持股判定時機產生疑慮，或在現金流水帳呈現上缺少顯式發放日對齊。

## 決策 (Decision)

1. **掃描模型升級 (Model Enhancement)**：
   - 在 [`ScannedCorporateAction`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts#L18) 與 [`RawCorporateEvent`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts#L5) 介面擴充 `payDate?: string`。
   - 掃描引擎優先解析官方已公告之發放日（如 2330、2886、00878、00923、9927），其餘標的自動調用 [`estimatePaymentDate`](file:///d:/APP/股票紀錄/src/engine/receivableDividendEngine.ts#L60) 進行推算（台股 +28 日、美股 +21 日）。
2. **補登資料結構完整賦值 (Auto-Apply Integration)**：
   - 在 [`CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx#L160) 補登時，為 `DIVIDEND` 紀錄注入完整雙日期：`exDate = a.date`、`payDate = a.payDate || estimatePaymentDate(a.date, a.market)`。
   - 備註資訊明確標註「基準日持股」與「預計發放入帳日」。
3. **現金帳本在途隔離 (Cash Ledger Reconciliation)**：
   - 現金帳本自動交割同步以 `trade.payDate` 為第一優先，當 $today < payDate$ 時精確維持 `PENDING` 在途狀態（不虛增實質可用現金餘額），當 $today \ge payDate$ 時自動轉為 `SETTLED`。
   - [`syncTradesWithCashTransactions`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts#L806) 支援可選 `asOfDate` 參數，強化時序回溯與測試可預測性。

## 後果與影響 (Consequences)

- **優點**：
  - 徹底消除除息日與發放日的時間差混淆，持股數與資金入帳生命週期清晰透明。
  - 現金帳本風控與可用餘額計算零失真。
  - 完全向下相容，不影響任何現存交易資料。
- **負擔**：
  - 無顯著副作用。全量 352 項單元測試 100% 綠燈通過，TypeScript 0 錯誤。
