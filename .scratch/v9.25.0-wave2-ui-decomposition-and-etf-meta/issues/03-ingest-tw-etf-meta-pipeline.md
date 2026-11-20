# T03: 建立 ingest-tw-etf-meta.cjs (TWSE t187ap47_L + Yahoo .TW/.TWO Crumb 費率 30D TTL)
- 關聯 Issue: #596 / Spec 0241 / Debt 0061 #3
- 目標檔案: `scripts/market-sync/ingest-tw-etf-meta.cjs`
- 驗收: 支援官方 `t187ap47_L` 批次入庫、按需 Yahoo Crumb `.TW`/`.TWO` 後綴安全查費率、`UNAVAILABLE` 負快取與 `AbortSignal`。
