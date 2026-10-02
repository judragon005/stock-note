# 01 — 獨立抽取市場新鮮度服務與單元測試

**What to build:** 建立 `scripts/market-sync/market-freshness-service.cjs`，提供獨立的 `getMarketAnchorDate(market, now)` 與 `checkMarketFreshness(db, now)` 公開介面，並以專屬單元測試 `src/engine/marketFreshnessService.test.ts` 驗證平日/週末邊界與跨時區結算計算。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 實作 `scripts/market-sync/market-freshness-service.cjs`
- [x] 撰寫 `src/engine/marketFreshnessService.test.ts`
- [x] 覆蓋台美股結算邊界、週末回推與空庫情境 (4/4 綠燈)
