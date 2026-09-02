# ADR-0025: 現金收支全量類別擴充、美股 30% 股息預扣稅對齊與歷史交易單筆手動編輯

## 狀態 (Status)
已採納 (Accepted)

## 上下文 (Context)
在多券商架構下，使用者在記錄現金收支時缺少現金股利、股票買賣交割扣款、減資退款、稅費等 7 種常用類別。此外，海外券商（嘉信理財）發放美股股息時會自動扣除 30% 預扣稅（DRIP 再投資亦為淨額買進），自動對齊交割款時若未折算稅額會導致現金帳本與 App 不一致。最後，歷史交易帳本缺乏單筆手動編輯，造成修正歷史資料必須先刪後加。

## 決策 (Decision)
1. **現金收支彈窗擴展 13 種收支類別**：
   - 在 `CashTransactionModal.tsx` 擴展包含 `DIVIDEND_PAYOUT`, `STOCK_BUY`, `STOCK_SELL`, `CAPITAL_RETURN`, `TAX`, `LOAN_DISBURSEMENT`, `LOAN_REPAYMENT` 等類別。
   - `handleSubmit` 自動對流出項目轉為負數。
2. **交割款與美股股息自動淨額對齊**：
   - `syncTradesWithCashTransactions` 偵測美股 `DIVIDEND` 交易且未手動指定 `tax` 時，自動依 30% 預扣稅折算淨額入帳。
3. **歷史交易明細單筆手動編輯**：
   - `TradeHistoryTable.tsx` 操作欄新增「✏️ 編輯」按鈕。
   - `TradeModal.tsx` 支援 `editingTrade` 屬性完整回填所有既有資料。
   - `App.tsx` 就地更新既有交易 ID 並即時連動刷新現金帳本與 NAV。

## 後果 (Consequences)
- **正面效益**：
  - 現金記帳分類完整，正負流向防呆。
  - 嘉信現金餘額與 DRIP 買進金額 100% 精準吻合。
  - 使用者能秒級修改歷史交易紀錄並即時看到全域連動報表。
- **維護責任**：
  - 維護 13 類現金流水與股票交易之間的雙向關聯一致性。
