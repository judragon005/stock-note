# 04 — 歷史明細表待核實專區與一鍵確認入帳閉環 (Due Reconciliation Banner & Instant Settle Pipeline)

**What to build:**
解除歷史明細表父層 `payDate > todayStr` 之硬編碼截斷，讓已除息款項（具備 `isFuture` 標籤）與發放日已過之待核銷款項（`DUE_FOR_RECONCILIATION`）完整呈現在視圖中。在歷史明細表頂部建立醒目的「⚡ 官方已發放·待核對入帳專區」，完整列出 0056 的除息日、發放日、除息持股數、應發毛額與實領淨額，並提供「一鍵確認入帳」按鈕。點擊後自動生成標準 `DIVIDEND` 交易記錄寫入儲存庫，完成端到端自癒結轉。

**Blocked by:**
02 — 根除時序黑洞：發放日已過待核對狀態機結轉 (Due-for-Reconciliation State Machine Transition)
03 — 卡片 3 筆數與金額數學閉環對齊 (Card 3 Mathematical Closure & Section Sync)

**Status:** done

- [x] 於 `src/components/DividendLogView.tsx` 移除 `payDate > todayStr` 之強制過濾，讓歷史表格能接收未結算或待核對之應收款項。
- [x] 於 `src/components/dividend/DividendHistoryTable.tsx` 頂部新增「⚡ 官方已發放·待核對入帳專區」，清楚呈現發放日已屆但尚未核銷的款項（如 0056），展示正確除息在席股數與實領金額。
- [x] 實作「一鍵確認入帳」處理函式：將待對帳項目轉換為標準 `TradeRecord`，自動寫入本地帳本並觸發全域重新計算。
- [x] 撰寫單元測試驗證一鍵入帳操作後，該筆款項自待核對專區移除，並正確轉化為歷史入帳流水。
