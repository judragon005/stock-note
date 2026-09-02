# 02 — 待入帳配股擴充與持倉未實現損益平滑 (Receivable Stock & Ex-Dividend Smoothing)

**What to build:** 
擴充應收股利與損益平滑模型，納入「待入帳配股 (Receivable Stock Shares)」與「新股上市發放日 (Stock Pay Date)」。在除權息日至發放日之間，持倉未實現損益自動加計應收現金淨額與待配股市值（`待配股數 × 即時股價`），消除除權空窗期之損益假摔，並在持股清單中清晰標註待入帳股數。

**Blocked by:** 01 — 二代健保配股配息合併試算與代扣引擎

**Status:** RESOLVED

- [x] 應收模型擴充欄位 `receivableStockShares`、`stockPayDate` 與 `isStockDelivered`。
- [x] 平滑計算公式更新為：`平滑損益 = 在庫市值 + 應收現金 + (待配股數 × 即時現價) - 原始成本`。
- [x] 永豐金案例驗收：除權當日即使股價向下扣除息值權值，平滑報酬率與總資產損益保持穩定無缺口。
- [x] 支援質押借貸維持率試算納入在途待入帳配股。
- [x] 單元測試 100% 通過。
