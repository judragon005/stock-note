# 03 — 雙軌應收股利與預約交易聯集中樞整合 (Unified Dividend Receivable Reconciliation Hub)

**Parent:** https://github.com/judragon005/stock-note/issues/539

**What to build:**
在 `DividendLogView.tsx` 中建立統一的 `unifiedPendingReceivables` 記憶化選擇器，將外部公告抓取的 `scopedReceivables` 與交易流水線中預約待入之紀錄（`t.type === 'DIVIDEND' && payDate > todayStr`，如 2026-12-16 華邦電）進行聯集去重與合成相容。上方「除息待入帳行事曆」改為直接消費此選擇器，確保下方明細只要有待入帳，上方 100% 同步展示，徹底消滅雙軌矛盾。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `DividendLogView.tsx` 建立 `unifiedPendingReceivables` 選擇器，實現雙軌去重與相容合成
- [ ] 將上方「除息待入帳行事曆」之綁定來源由 `activeReceivables` 升級為 `unifiedPendingReceivables`
- [ ] 驗證「一鍵入帳」與待入帳點擊對帳時，上方行事曆與下方明細狀態雙向連動、計數器精確扣減
- [ ] 編寫/更新 `DividendLogView.test.tsx` 驗證預約交易在行事曆中 100% 可見
