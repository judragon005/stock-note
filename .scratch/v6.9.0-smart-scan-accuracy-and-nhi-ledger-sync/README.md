# v6.9.0: 智慧掃描公司行動精準度、二代健保合併扣繳與現金帳本實收連動

## 規格與票券清單 (Tickets & Issues)
- [x] [01 — 解除 2890 永豐金硬編碼過濾與除權股票股利精準捕獲](issues/01-unrestricted-stock-dividend-and-2890-scanning.md)
- [x] [02 — 智慧補登二代健保補充保費合併扣繳試算與交易欄位映射](issues/02-smart-scan-nhi-consolidation-and-tax-mapping.md)
- [x] [03 — 現金帳本實收金額優先入帳與減資後在庫股數時序前置扣減](issues/03-cash-ledger-net-payout-priority-and-reduction-accuracy.md)

## 驗收矩陣 (Acceptance Matrix)
- [x] 2890 永豐金 2026 年度配股 0.02 正常列入待補登清單（配股 620 股，8/24 發放）。
- [x] 2890 永豐金股息 34,100 元合併配股扣除二代健保 850 元，實收金額為 33,250 元。
- [x] 現金與質押借貸頁面中股息流水精確顯示為 `+NT$ 33,250`。
- [x] 9927 泰銘在庫 10,000 股除息基準日持股精確為 10,000 股，預計 2026-10-29 發放 50,000 元。
- [x] 單元測試 379/379 綠燈通過，TypeScript 0 錯誤，Vite Production Build 成功。
