# 02 — 頂層視圖排版重組與 Props 零漏接遷移 (TDD Green)

**What to build:**
在 `src/components/DividendLogView.tsx` 中將 `<ExDividendRadarCard />` 由最頂部移至 `<div className="dividend-dual-panel-grid">` 之後、`<div id="receivable-calendar">` 之前。保持所有屬性與回調完整傳遞，使 Ticket 01 測試與既有測試全數轉綠。

**Blocked by:** 01 — 佈局渲染時序測試縫隙建置 (TDD Red Gate)

**Status:** closed

- [x] 移除最頂部之 `<ExDividendRadarCard />` 渲染節點
- [x] 插入至 `dividend-dual-panel-grid` 與 `#receivable-calendar` 之間
- [x] 驗證 Ticket 01 測試綠燈通過
- [x] 驗證既有 26 個單元測試 100% 綠燈
