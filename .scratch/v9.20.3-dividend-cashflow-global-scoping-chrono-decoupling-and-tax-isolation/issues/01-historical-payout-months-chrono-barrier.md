# 01 — 歷史發放月時序因果屏障門禁 (Chrono Taint Barrier in Historical Payout Learning)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
改造 `extractHistoricalPayoutMonths` 歷史發放月萃取純函式，注入 `currentDateStr` 參數與物理時間門禁 `payDate <= currentDateStr`。當明細中存在未到期預約股利（如 2026-12-16 華邦電）時，歷史學習器物理性阻斷未來月份倒灌歷史習慣庫，杜絕歷史學習被未來預約款項污染。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 改造 `extractHistoricalPayoutMonths(trades: TradeRecord[], currentDateStr?: string)` 支援時序門禁
- [ ] 凡 `payDate > currentDateStr` 之交易紀錄，物理性禁止納入該標的之歷史常態發放月陣列
- [ ] 在 `DividendLogView` 中調用處傳入 `todayStr`，確保視圖層即時阻斷倒灌
- [ ] 更新 `src/engine/dividendAggregator.test.ts` 與 `src/components/DividendLogView.test.ts` 單元與整合測試
