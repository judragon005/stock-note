# 05 — 質押借貸卡片還款履歷摘要與美股跨市場相容性 (Loan History Summary & US Margin Alignment)

**What to build:**
優化 `CashLedgerWorkspace.tsx` 借貸卡片之履歷展示與美股保證金融資跨市場相容性：
1. **部分還本與繳息履歷標籤**：在借貸卡片之「起日」旁，若合約曾發生過部分還款或利息繳清，顯示清晰摘要註記（如 `前次還款: 2026-09-10 (已還本 NT$ 1,011,836 · 結息 NT$ 224)`），讓使用者一眼看懂為何利息天數由 9/10 重新起算，消除資訊不對稱。
2. **美股市場融資借貸相容性強化**：
   - 當市場切換為美股（US）或 `currency === 'USD'` 時，卡片隱藏台股特有的「設質三大規費」區塊，預設零規費。
   - 支援美股券商常見的負現金自動沖抵還款邏輯，確保美股還本不清除累積利息。
3. **全域 NAV 負債校準**：確保借貸合約在部分還本後，`riskExposureEngine.ts` 與頂部資產負債看板即時同步最新的本利和與 NAV 淨值。

**Blocked by:** Ticket 03, Ticket 04

**Status:** complete

- [x] 在借貸卡片加入還款/繳息履歷摘要標籤，清楚交代起日與前次繳息日
- [x] 適配美股（USD）卡片介面，隱藏台股專屬設質三大規費
- [x] 驗證借貸合約在還本後，`calculateOverallLeverageMetrics` 與 `calculatePortfolioExposure` 實時反映正確本利和與 NAV
- [x] 執行全域 `npm test` 與 `npm run build`，確保 100% 綠燈且 TypeScript 0 錯誤
