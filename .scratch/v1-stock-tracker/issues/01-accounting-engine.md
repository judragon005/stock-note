# 01 — 雙市場移動加權平均與損益計算核心 (Accounting Engine & TDD)

**What to build:**
實作純函數會計計算核心 `calculateHoldingsAndSummary`。支援台股與美股多筆買進之單位成本加權重算、部分賣出之已實現損益扣減、現金股利累計統計、小數點股數精度與多幣別動態匯總，並具備 100% 覆蓋之 Vitest 單元測試。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 分批買進同一標的時，自動精確核算移動加權平均每股成本。
- [ ] 部分賣出時，準確結算已實現損益且不干擾剩餘庫存單位成本。
- [ ] 現金股息記錄累計於總收益，不影響持有成本線。
- [ ] 多幣別（TWD/USD）獨立計算與匯率轉換加總驗證通過。
