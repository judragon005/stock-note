# 03 — 聚合引擎單元測試套件全面補強 (TDD Unit Tests Suite)

**What to build:**
於 `src/engine/dividendAggregator.test.ts` 建立紅-綠-重構測試案例：
1. **跨年時序測試**：
   - 模擬 2024-12-25 除息、2025-01-15 入帳之款項，驗證其計入 2025 年度現金流，排除於 2024 年度之外。
   - 模擬 2025-12-20 除息、2026-01-10 入帳之款項，驗證其不計入 2025 年度現金流。
2. **跨月時序測試**：
   - 模擬 2025-07-23 除息、2025-08-24 入帳之款項，驗證其出現在 8 月份分佈中（Index 7），而非 7 月（Index 6）。
3. **未到期入帳排除測試**：
   - 模擬尚未到發放日（`effectivePayDate > currentDateStr`）之款項，驗證其不計入已實領總額，亦不計入當年度排行榜分子。
4. **毛額與扣稅勾稽測試**：
   - 驗證 `currentYearGrossTWD - currentYearTaxTWD === currentYearDividendsTWD`。
5. **TTM 稅費扣抵測試**：
   - 驗證近 12 個月滾動統計精確扣除二代健保補充保費與預扣稅。

**Blocked by:** Ticket 01, Ticket 02

**Status:** closed
- [x] 撰寫跨年入帳時序測試並確認綠燈
- [x] 撰寫跨月入帳時序測試並確認綠燈
- [x] 撰寫未到期除息排除測試並確認綠燈
- [x] 撰寫毛額與扣繳稅額精準勾稽測試
- [x] 撰寫 TTM 滾動現金流稅費測試
