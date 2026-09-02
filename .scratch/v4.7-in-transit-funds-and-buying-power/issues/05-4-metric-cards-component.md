# 05 — 現金帳本四核心指標動態看板 (4-Metric Cards Component)

**What to build:**
在 `CashLedgerWorkspace.tsx` 頂部建置頂級券商風格的四核心指標發光看板：
1. 🟢 **實質可用現金 (Settled Cash)**：標註「可隨時出金提領」，大字號顯示。
2. 🟡 **在途待入帳 (Pending Inflows)**：標註「預計入帳 (+ N 筆)」，點擊可連動時序排程。
3. 🔴 **在途待扣款 (Pending Outflows)**：標註「預計扣款 (- N 筆)」，警示備妥交割款。
4. ⚡ **交易購買力 (Trading Buying Power)**：標註「即時可下單額度」。
- 支援「原幣 (TWD/USD)」與「折合台幣 (TWD)」雙軌切換顯示。

**Blocked by:** 02-tri-state-availability-engine, 03-trading-buying-power-engine

**Status:** completed

- [x] 建置四核心指標卡片元件，具備發光背景與層次分明的微動畫。
- [x] 支援所選帳戶與全域總覽的數值動態連動。
- [x] 支援多幣別格式化（台幣整數無條件捨去、美金保留 2 位小數）。
