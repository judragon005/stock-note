# 05 — 質押借貸利息帳戶過濾水密隔離 (Scoped Pledge Loans Interest Closure)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `DividendLogView` 頂層建立 `scopedLoans`，將質押借貸與融資利息負擔按 `selectedAccountId` 與 `market` 嚴格過濾。杜絕美股看板或特定獨立子帳戶中依然計算全域質押借貸利息的數據洩漏，確保槓桿利差與淨現金流僅計算當前選取帳戶之真實負擔。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `DividendLogView` 建立 `scopedLoans`，依據 `selectedAccountId` 與 `market` 進行隔離
- [ ] 驗證切換為特定子帳戶時，不屬於該帳戶的質押借貸利息完全歸零
- [ ] 驗證切換為美股市場時，台股質押借貸利息支出 100% 被排除
- [ ] 更新相關元件與整合測試，驗證帳戶利息水密隔離
