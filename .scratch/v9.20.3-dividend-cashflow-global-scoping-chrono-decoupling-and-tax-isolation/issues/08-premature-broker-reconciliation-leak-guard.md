# 08 — 未到期預約款項券商對帳單防漏門禁 (Pre-mature Broker Reconciliation Leak Guard)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `DividendLogView` 的 `annualReconciliationList`（年度各標的券商對帳小計）中注入物理時間門禁 `payDate <= todayStr`。嚴格限制對帳小計僅累計實質入帳日已屆期的已實現股利，未到期的未來預約款項不得提前計入券商年度結算小計，確保對帳小計金額與券商 APP 實際存摺流水 100% 勾稽吻合。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `annualReconciliationList` 迴圈中加入 `if (payDate > todayStr) continue;` 時序門禁
- [ ] 驗證當存在未來預約股利時，券商年度對帳小計筆數與金額不包含該筆未結算款項
- [ ] 驗證當發放日到達或過去時，款項自動計入對帳小計
- [ ] 更新 `src/components/DividendLogView.test.ts` 相關券商對帳測試
