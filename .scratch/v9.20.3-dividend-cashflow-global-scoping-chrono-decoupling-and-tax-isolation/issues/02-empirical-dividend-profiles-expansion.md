# 02 — 權值與週期股夏秋常態慣性庫擴充 (Empirical Dividend Profiles Expansion)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `projectedCashflowEngine.ts` 的預設除息慣性庫 `DEFAULT_DIVIDEND_PROFILES` 中擴充台股指標性權值與週期股（2344 華邦電常態 8 月發放、2303 聯電 7 月、2454 聯發科 1/7 月等）。徹底消滅華邦電在 12 月份憑空捏造的 NT$ 22,500 幽靈現金流，使 12 月自癒恢復為實質枯水期（NT$ 18,927，31% 覆蓋率），並使下方的 00929/00934 互補配置推薦能準確辨識並提出填補建議。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 於 `projectedCashflowEngine.ts` 之 `DEFAULT_DIVIDEND_PROFILES` 擴充 `2344` (華邦電, 8月)、`2303` (聯電, 7月)、`2454` (聯發科, 1/7月)
- [ ] 驗證持有 20,000 股華邦電時，滾動 12 個月現金流預測在 12 月份金額為 NT$ 0，8 月份出現合理預估
- [ ] 驗證 12 月自癒修正為枯水期（覆蓋率僅 31%），並觸發 00929/00934 推薦填補 12 月
- [ ] 編寫/更新 `src/engine/projectedCashflowEngine.test.ts` 相關單元測試
