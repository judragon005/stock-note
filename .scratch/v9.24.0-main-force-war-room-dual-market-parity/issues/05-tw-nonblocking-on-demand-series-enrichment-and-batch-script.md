# 05 — 台股歷史序列 (TDCC 10 週 / 月營收 12 月 / 歷史配息) 非阻塞按需補齊與自動重繪

**Parent:** #592 (Spec 0239)
**What to build:** 徹底解除開頁單檔歷史序列補齊（TDCC 10 週、月營收 12 個月、歷史近 4–8 次除息）之 2.5 秒強制棄權與 5 分鐘失敗冷卻鎖死：首屏於 $\le 300\text{ms}$ 內先以在庫資料完成渲染並附帶 `enrichmentPending` 旗標，後端背景完成 SQLite 持久化後立即釋放待補旗標，前端透過具 RequestGuard 防競態之輕量重撈自動無縫更新卡片；同時提供持股清冊一鍵批次歷史補齊腳本。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用
**Status:** ready-for-agent

- [ ] 當查詢標的之 `tw_tdcc_distribution < 4` 週、`tw_monthly_revenue < 6` 月或缺乏歷史配息時，`/api/market/history/:symbol` 立即回傳在庫資料與 `enrichmentPending: true`，同時背景繼續完成補齊入庫（不因 2.5 秒截斷而丟棄請求）。
- [ ] 若單次外部回補失敗或超時，不再以 5 分鐘長冷卻鎖死該標的（改採短退避），且背景成功入庫後立即標記完成。
- [ ] `AiForceDashboardView` 在收到 `enrichmentPending: true` 時啟動受控背景重撈，於切換至另一標的時由 RequestGuard 立即取消過期回呼，補齊完成後自動無縫更新 Card 19/20/21。
- [ ] 提供可獨立執行之持股清冊批次歷史補齊腳本，受控節流並具單元測試驗證。
