# 04 — 持倉總覽表 (行內現價快修) 與交易明細搜尋過濾 (Holdings Table & Trade History Filter)

**What to build:**
提供現有持倉總覽表，支援在市價欄位直接點擊修改最新市價並即時連動損益計算；提供歷史交易明細表，支援股票代碼與策略標籤即時搜尋過濾，並提供刪除確認防禦。

**Blocked by:** 02 — 雙市場交易錄入彈窗與自動稅費試算 (Trade Entry Modal & Auto Fees), 03 — 財務指標儀表板、資產配置圖與多幣別切換 (Portfolio Dashboard & Multi-Currency Switcher)

**Status:** ready-for-agent

- [ ] 點擊持倉現價欄位可直接行內編輯，失焦或 Enter 後即刻重新計算該檔與全組合未實現損益。
- [ ] 歷史交易列表支援搜尋股票代碼與策略標籤，即時過濾顯示。
- [ ] 支援刪除歷史單筆交易，並自動觸發重算。
