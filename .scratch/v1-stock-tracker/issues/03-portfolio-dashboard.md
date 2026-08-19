# 03 — 財務指標儀表板、資產配置圖與多幣別切換 (Portfolio Dashboard & Multi-Currency Switcher)

**What to build:**
構建頂部視圖切換器（全部市場 / 台股 / 美股）與匯率自訂調整器；呈現四大關鍵財務指標卡片（總市值、未實現浮動損益、已實現出場損益、累計股息）；提供雙市場佔比進度條與個股持倉權重視覺化。

**Blocked by:** 01 — 雙市場移動加權平均與損益計算核心 (Accounting Engine & TDD), 02 — 雙市場交易錄入彈窗與自動稅費試算 (Trade Entry Modal & Auto Fees)

**Status:** ready-for-agent

- [ ] 支援切換「全部」、「台股 (TWD)」與「美股 (USD)」獨立視圖。
- [ ] 自訂 USD/TWD 匯率時，總資產即時連動動態重算。
- [ ] 資產配置分佈圖清晰顯示台美市場比例與前幾大重倉標的。
