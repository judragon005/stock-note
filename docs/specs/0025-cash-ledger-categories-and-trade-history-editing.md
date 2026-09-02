# 產品需求規格書 (PRD)：現金收支全量類別擴充、交割款一鍵精準對齊與歷史交易單筆手動編輯 (SPEC-0025)

## 📌 問題陳述 (Problem Statement)

隨著系統導入多券商帳戶與「現金與借貸質押管理中心」，使用者在記帳與對帳實務上遭遇以下痛點：
1. **現金收支彈窗類別短缺**：在「記錄現金收支」彈窗中，交易類別僅提供入出金、利息、手續費等 6 個基礎選項，缺少投資人常用的「現金股息 (`DIVIDEND_PAYOUT`)」、「股票買進扣款 (`STOCK_BUY`)」、「股票賣出入帳 (`STOCK_SELL`)」、「減資退款 (`CAPITAL_RETURN`)」、「稅費/帳務扣除 (`TAX`)」、「借貸撥款 (`LOAN_DISBURSEMENT`)」與「借貸還本 (`LOAN_REPAYMENT`)」，導致使用者無法手動完整記錄各類現金收支。
2. **自動對齊交割款美股股息未扣稅**：點擊「🔄 自動對齊交割款 (T+2/T+1)」時，既有邏輯若遇到未拆分稅額的美股股息交易，會直接以毛額入帳，未自動依美股 30% 預扣稅進行淨額折算，造成現金帳本餘額與券商 App 實際可用現金（例如嘉信理財）產生差額。
3. **歷史交易帳本缺乏單筆手動編輯**：在「交易歷史明細帳本」表格的操作欄中，只有「刪除 (🗑️)」按鈕而無「編輯 (✏️)」功能。若使用者發現過去登錄之單價、股數、稅費、標籤或備註有誤，必須先刪除再重新新增，既繁瑣且容易遺失原先的流水記錄。

---

## 🎯 解決方案 (Solution)

1. **現金收支彈窗全量交易類別支援**：
   - 在 `CashTransactionModal.tsx` 中補齊 13 種交易類別按鈕與專屬圖示色彩。
   - 強化表單提交時的資金流向正負號（流入為正、流出為負）自動防呆校正。
   - 在 `cashLedgerEngine.ts` 的 `calculateAccountBalances` 引擎中完整支援 `LOAN_DISBURSEMENT`、`LOAN_REPAYMENT`、`CAPITAL_RETURN`、`TAX` 等全部流水類別。
2. **交割款與美股股息自動淨額對齊**：
   - 強化 `cashLedgerEngine.ts` 中的 `syncTradesWithCashTransactions` 演算法。
   - 當同步美股股息交易且無明確指定稅額時，自動依據 30% 美國海外投資人法定預扣稅率試算淨額，確保現金帳本入帳金額 100% 吻合海外券商實際發放金額（完美支援 DRIP 股息再投資無縫對齊）。
3. **歷史交易明細單筆手動編輯機制**：
   - 在 `TradeHistoryTable.tsx` 每筆紀錄操作欄新增「✏️ 編輯」按鈕。
   - 點擊後開啟 `TradeModal` 並完整回填原交易資料（日期、標的、帳戶、單價、股數、手續費、證交稅、退款金額、標籤、備註等）。
   - 儲存後保持原始 `id` 與 `createdAt` 更新交易清單，並自動觸發 `syncTradesWithCashTransactions` 連動更新現金帳本與資產淨值 (NAV)。

---

## 📋 使用者故事 (User Stories)

1. **手動記帳類別齊全**：身為使用者，當我收到現金股息、被扣除股息稅費或進行借貸還本時，我可以在「記錄現金收支」彈窗中直接選擇對應的「現金股息」、「稅費扣除」或「借貸還本」按鈕快速登錄。
2. **一鍵自動對齊美股真實帳戶**：身為美股投資人，當我點擊「🔄 自動對齊交割款 (T+2/T+1)」時，系統能自動扣除美股 30% 股息預扣稅，使我的現金餘額與嘉信理財 App 顯示之可用現金完全一致。
3. **歷史交易錯誤即時修正**：身為使用者，當我發現過去某筆買進或賣出交易的手續費、標籤或股數有誤時，我可以直接在「交易歷史明細帳本」點擊「✏️ 編輯」按鈕開啟視窗修改，儲存後所有報表與現金流水皆自動同步更新。

---

## 🛠️ 實作決策 (Implementation Decisions)

### 1. 現金收支彈窗擴充 ([src/components/CashTransactionModal.tsx](file:///d:/APP/股票紀錄/src/components/CashTransactionModal.tsx))
- 引入 `CashEntryType`，擴展 `categories` 陣列包含 13 個收支類別（外部入金、外部出金、活存利息、現金股息、買進扣款、賣出入帳、減資退款、電匯/手續費、融資/借貸息、稅費扣除、借貸撥款、借貸還本、其他收支）。
- 於 `handleSubmit` 完善流出判定：`WITHDRAWAL`、`FINANCING_FEE`、`WIRE_FEE`、`STOCK_BUY`、`LOAN_REPAYMENT`、`TAX`、`FEE` 自動轉為負值。

### 2. 現金帳本累計與自動同步引擎 ([src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts))
- `calculateAccountBalances` 支援 `LOAN_DISBURSEMENT`、`LOAN_REPAYMENT`、`CAPITAL_RETURN`、`TAX` 累計。
- `syncTradesWithCashTransactions` 針對 `trade.type === 'DIVIDEND'`：
  - 美股標的若未填入 `trade.tax` 且非指定 `cashAmount`，自動試算 `tax = Math.round(gross * 0.3 * 100) / 100`，使 `amount = gross - tax`。

### 3. 單筆交易編輯流程 ([src/components/TradeHistoryTable.tsx](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx)、[src/components/TradeModal.tsx](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx)、[src/App.tsx](file:///d:/APP/股票紀錄/src/App.tsx))
- `TradeHistoryTableProps` 新增 `onEditTrade?: (trade: TradeRecord) => void;`，操作欄渲染 `Edit2` 按鈕。
- `TradeModalProps` 新增 `editingTrade?: TradeRecord | null`，在 `isOpen` 觸發時將 `editingTrade` 的所有欄位賦值至內部狀態，並在標題顯示 `編輯交易紀錄 (代碼)`。
- `App.tsx` 維護 `editingTrade` 狀態，在 `handleSaveTrade` 中判斷 `existingTradeId` 執行既有交易替換或新交易追加，並更新市價快照與連動現金流水。

---

## ✅ 驗收條件 (Acceptance Criteria)

1. **AC-1 (現金收支類別完整度)**：開啟「記錄現金收支」彈窗，可見包含「現金股息、買進扣款、賣出入帳、減資退款、稅費扣除、借貸撥款、借貸還本」等全部 13 類選項，且點選能正常記錄。
2. **AC-2 (正負金額流向正確)**：手動新增「外部出金」、「買進扣款」、「借貸還本」或「稅費扣除」時，產生的流水金額自動為負數並正確扣減帳戶可用餘額。
3. **AC-3 (交割款自動對齊美股股息淨額)**：點擊「🔄 自動對齊交割款 (T+2/T+1)」，美股 VT 股息流水金額自動依 30% 預扣稅折算為淨額（如 $4.78 ➔ $3.35），現金帳本總額與嘉信理財 $224.79 完美對齊。
4. **AC-4 (歷史交易單筆編輯按鈕)**：進入「交易歷史明細帳本」，每列最右側「操作」欄皆呈現「✏️ 編輯」與「🗑️ 刪除」按鈕。
5. **AC-5 (編輯表單回填與更新)**：點擊任一筆交易的「✏️ 編輯」，彈窗標題為「編輯交易紀錄 (代碼)」，所有數值與標籤完整回填；儲存後該筆交易內容成功更新，且現金帳本自動連動刷新。
6. **AC-6 (測試與編譯綠燈)**：全量單元測試 100% 通過（145 tests passed），`npm run build` 0 錯誤。
