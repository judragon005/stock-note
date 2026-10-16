# 09 — 台股每日盤後同步排程 (sync-tw-market.cjs) 營業日守衛掛載

**Parent:** #275

**What to build:**
在 `scripts/market-sync/sync-tw-market.cjs` 頂部引入 `isTradingDay` 與 `getHolidayReason`。在 16:00 定時排程執行時，若今日判定為法定休市日或天災停市日，輸出中文略過日誌並於 0ms 內安全退出，杜絕無效 HTTP 請求。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 模擬國定假日（如 2026-09-28）或颱風假（2026-07-10），腳本輸出 `[略過] 今日為台股休市日 [教師節]`，發起之外部網路請求數為 0。
- [ ] 正常交易日流程完全不受影響。
- [ ] 附單元/整合測試驗證守衛行為。
