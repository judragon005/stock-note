# 03 — 建立主流高息與債券標的官方真實發放日庫與消滅跨年推估漂移

**What to build:**
在 `src/engine/receivableDividendEngine.ts` 建立 2024~2025 台股主流高股息與債券標的（0056, 00878, 00919, 00929, 00940, 00713, 00937B, 00933B, 00679B, 00687B, 2886, 2890 等）之官方真實入帳發放日常態表。當交易紀錄無顯式 `payDate` 時，優先查表讀取真實發放日，消滅固定 28 天推估產生的跨年邊界錯置（例如 2024 年底除息、2025 年初發放精確歸屬）。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `receivableDividendEngine.ts` 建立 `OFFICIAL_TW_PAY_DATE_MAP` 常態庫
- [ ] 整合 `getEffectiveDividendPayDate`，優先級為：`trade.payDate` ➔ `OFFICIAL_TW_PAY_DATE_MAP` ➔ 常態推估天數
- [ ] 驗證 2024 年底與 2025 年底之除息款項精確歸入官方實際發放月份
