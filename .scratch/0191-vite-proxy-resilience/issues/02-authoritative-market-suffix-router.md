# 02 — 標的市場精準後綴守衛 (Authoritative Market Suffix Router)

**Parent:** #279

**What to build:**
重構 `priceFetcher.ts` 內發起外部 Yahoo Finance 報價時的市場後綴推導與 fallback 機制。在發送請求前，先透過本地官方股票字典 (`officialStockDictionary`) 與核心權值標的庫鎖定標的所屬市場。對明確屬於 TWSE 上市之標的（如 `0050`、`0056`、`2330`）鎖定 `.TW`，上櫃標的鎖定 `.TWO`。嚴禁對已知市場的標的在失敗時跨市場盲目探測重試（如 `0050.TWO`），立即削減 50% 的外部 API 請求負載。僅對完全未知的新標的保留安全雙軌探測。

**Blocked by:** None — can start immediately

**Status:** RESOLVED

## Acceptance Criteria
- [x] 於 `priceFetcher.ts` 中導入權威市場後綴解析器 `resolveAuthoritativeMarketSuffix(symbol: string): '.TW' | '.TWO' | 'UNKNOWN'`。
- [x] 若標的已知為 TWSE 上市，僅請求 `.TW` 後綴，失敗時不發送 `.TWO` 請求。
- [x] 若標的已知為 TPEx 上櫃，僅請求 `.TWO` 後綴，失敗時不發送 `.TW` 請求。
- [x] 若標的為字典外之未知代碼，維持原先安全的 `.TW` 失敗回退 `.TWO` 雙軌探測機制。
- [x] `priceFetcher.test.ts` 新增測試驗證上市標的無效重試被精準阻斷，現有測試 100% 通過。
