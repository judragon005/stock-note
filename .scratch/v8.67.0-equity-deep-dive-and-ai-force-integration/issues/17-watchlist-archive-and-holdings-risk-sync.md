# 17 — 觀察名單自動歸檔與持倉目標價/停損價雙向回填

**What to build:** 
在 `src/utils/investmentMemoStorage.ts` 實作持倉聯動邏輯：
1. `isSymbolInHoldings(symbol: string, holdings: HoldingItem[]): boolean`。
2. 若標的未在庫，自動將筆記打上 `isWatchlist: true`。
3. `syncMemoToHoldingsRiskLine(symbol, memo, updateHoldingCallback)`：若標的已在庫且使用者確認同步，將筆記之 `targetPrice` 與 `stopLossPrice` 安全寫回持倉記錄，驗證正數與精度。

**Blocked by:** 16 — 投資筆記本地 CRUD 存儲層

**Status:** ready-for-agent

- [ ] 支援未在庫標的之觀察清單歸檔
- [ ] 支援在庫持倉之目標價與停損價雙向回填
- [ ] 防禦性邊界檢查（拒絕負數、NaN 與超出安全範圍之價格）
- [ ] 單元測試 100% 覆蓋
