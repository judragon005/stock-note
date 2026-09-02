# 02 — 虛擬時序動態扣減減資股數與官方6位精準減資比率對齊

**What to build:** 
修正 `scanCorporateActions` 的時序持股回溯池與減資比率小數精度：
1. **虛擬時序扣減減資股數**：在 `scanCorporateActions` 內部，對於未入帳之 `CAPITAL_REDUCTION` 事件，自動生成 `{ type: 'CAPITAL_REDUCTION', shares: estimatedShares }` 推入 `virtualTrades`，確保後續配息回溯計算基準日持股時（如 9927 泰銘）動態扣減減資股數，徹底杜絕配息股數被誤算為未減資前股數（如 12,829 股）。
2. **官方 6 位精準減資比率升級**：官方備援庫全面對齊台灣集保 6 位精準減資比率（如 9927 泰銘 `0.2828051`），依集保換發新股無條件捨去規則，確保 10,000 股減資精準換發 7,171 股、銷除 2,829 股，消除 1 股浮點截斷誤差。

**Blocked by:** 01 — 多來源減資區間合併去重與重複入帳防護

**Status:** completed

- [x] 在 `corporateActionScanner.ts` 中將 `CAPITAL_REDUCTION` 納入 `virtualTrades` 虛擬時序交易池
- [x] 在 `corporateActionScanner.ts` 中升級 9927 泰銘官方減資比率為 `0.2828051`，每股退款 $2.828051$ 元
- [x] 驗證 10,000 股減資換發 7,171 股、買回 2,829 股後次年配息基準日持股精準回歸 10,000 股
