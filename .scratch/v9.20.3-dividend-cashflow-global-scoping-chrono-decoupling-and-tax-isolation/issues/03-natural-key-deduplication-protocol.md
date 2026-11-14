# 03 — 金融事件除息日自然鍵防撞去重協定 (Natural Key Deduplication Protocol)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
升級雙軌應收股利合成中樞 `buildUnifiedPendingReceivables` 的去重防撞邏輯，以不可變的除息基準日金融自然鍵 `${market}_${symbol}_${exDate}` 取代易變的 `payDate`。當官方公告與手動預約發放日因券商作業產生 1~2 天延遲誤差時，系統能精準判定為同一除權息金融事件並自動去重，徹底消除待入帳款項虛增 200% 的雙重認列問題。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 改造 `buildUnifiedPendingReceivables` 內部 Map 鍵值演算法，改用 `${r.market}_${r.symbol.toUpperCase()}_${r.exDate}`
- [ ] 驗證官方公告（如發放日 12-18）與手動預約（如發放日 12-16）除息日相同時，合成結果嚴格維持 1 筆
- [ ] 保持按 `payDate` 升冪排序輸出，且優先保留已確認之交易資料
- [ ] 編寫/更新 `src/engine/dividendAggregator.test.ts` 與 `src/components/DividendLogView.test.ts` 去重測試
