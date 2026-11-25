# 06 — 建立後端複合逾時網路抓取原語 (Deadlock-Free Lock-Scoped Fetch)

**Parent:** #609 (Spec 0247)

**What to build:** 於後端市場同步共用核心提供單一複合逾時抓取原語，結合外部 AbortSignal 與上限逾時，確保掛起請求於時限內中止。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 掛起請求超過 timeoutMs 時必於時限內中斷並拋出明確逾時錯誤
- [x] 外部 AbortSignal 提前觸發時立即中止請求並正確清理計時器
- [x] 正常回應完整透傳且無計時器洩漏
