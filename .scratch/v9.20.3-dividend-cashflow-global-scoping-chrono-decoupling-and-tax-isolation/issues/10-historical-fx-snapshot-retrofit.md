# 10 — 歷史外幣折合台幣匯率快照穿透 (Historical FX Snapshot Retrofit)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
改造 `DividendHistoryTable` 外幣折合台幣邏輯，優先調用交易當下記錄的成交匯率快照 `trade.exchangeRate`。僅在歷史無快照時 fallback 至當前即時匯率，消除歷史外幣記帳被今日即時匯率硬乘產生的幽靈匯差，確保歷史入帳台幣金額與使用者銀行存摺實際入帳金額一致。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 改造 `DividendHistoryTable` 計算折合台幣處：`const effectiveRate = t.exchangeRate && t.exchangeRate > 0 ? t.exchangeRate : usdToTwdRate;`
- [ ] 驗證歷史 2021 年美股交易（匯率 28.0）不會被今日 32.5 匯率硬乘，金額精確還原歷史水準
- [ ] 驗證無匯率快照之外幣交易仍能平滑回退至即時匯率
- [ ] 更新 `src/components/dividend/DividendHistoryTable.test.tsx` 匯率快照穿透測試
