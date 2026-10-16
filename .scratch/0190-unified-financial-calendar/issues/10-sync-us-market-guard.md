# 10 — 美股每日盤後同步排程 (sync-us-market.cjs) 美東休市守衛掛載

**Parent:** #275

**What to build:**
在 `scripts/market-sync/sync-us-market.cjs` 頂部掛載美股營業日檢查。每日 08:00 定時排程執行時，先判定美東昨日是否為美股休市日，若為休市日則輸出中文略過日誌並靜默退出，徹底消除向 Yahoo Finance 盲目發送 1,500 次 HTTP 請求之無謂耗損。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** done

## Acceptance Criteria
- [x] 模擬美股週一國定休市（如 2026-01-19 馬丁路德金紀念日），台灣時間週二早晨 08:00 執行時輸出 `[略過] 美股昨夜為休市日 [馬丁路德金紀念日]`，對外部發起之請求數為 0。
- [x] 正常交易日增量同步與全量建置模態功能完全不受影響。
- [x] 附單元測試驗證守衛行為。
