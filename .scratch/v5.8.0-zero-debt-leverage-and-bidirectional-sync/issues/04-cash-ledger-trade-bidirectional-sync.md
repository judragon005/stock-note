# 任務票券 #04: 現金流水帳股息編輯與 Trade 雙向同步全域連動實作

- **父層主票券**: [issue-0046.md](issue-0046.md)
- **狀態**: `OPEN`
- **分流標籤**: `ready-for-agent`
- **目標檔案**:
  - `src/components/CashLedgerWorkspace.tsx`
  - `src/components/CashTransactionModal.tsx`
  - `src/App.tsx`

---

## 🎯 任務目標
1. 在現金流水帳點擊自動連動之股息紀錄（`tx-auto-${tradeId}`）的 ✏️ 編輯按鈕時，打開編輯彈窗，允許使用者調整實收金額與備註。
2. 儲存時，透過回調函式雙向回寫同步更新對應的 `Trade` 物件（`trade.totalAmount` 等）。
3. 觸發 React 全域 state 重新計算，使總淨值 NAV、現金水位、被動收益卡片主數字即時重算連動。
4. 確保手動更新後在頁面重整時不被自動重新覆寫。
