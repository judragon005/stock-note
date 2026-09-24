# 02 — 9927 泰銘官方發放日定錨 (2025-12-01) 與永豐金/元大台灣50數據校準

**What to build:** 
在 `src/engine/receivableDividendEngine.ts` 的 `OFFICIAL_TW_PAY_DATE_MAP` 註冊 `'9927:2025-11-13': '2025-12-01'`，並在交易紀錄中將 9927 泰銘的 `payDate` 明確設定為 `'2025-12-01'`；同步校正 2890 永豐金 2025-09-18 發放之現金股利為 22,750 元（每股 0.91 元 × 25,000 股），以及 0050 元大台灣50 2025-02-14 發放之現金股利為 1,400 元（每股 0.70 元 × 2,000 股）。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 在 `OFFICIAL_TW_PAY_DATE_MAP` 登錄 `'9927:2025-11-13': '2025-12-01'`。
- [x] 於 `src/engine/receivableDividendEngine.test.ts` 驗證 `estimatePaymentDate('2025-11-13', 'TW', '9927')` 回傳 `'2025-12-01'`。
- [x] 歷史交易資料庫中校準泰銘 (2025-12-01)、永豐金 (22,750 元)、0050 (1,400 元) 數值。

