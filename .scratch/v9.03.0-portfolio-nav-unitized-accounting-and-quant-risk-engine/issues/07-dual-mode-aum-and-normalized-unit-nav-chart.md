# 07 — 走勢圖資產金額 (AUM) 與單位淨值 (Unit NAV %) 雙模切換

**What to build:**
在 `src/components/PortfolioGrowthChart.tsx` 提供 `[ 💰 資產金額 (AUM) ]` 與 `[ 📊 淨值走勢 (Unit NAV % 對照大盤) ]` 雙模切換開關。在「資產金額」模式下，展示實際財富總值、成本、市值、現金與負債；在「淨值走勢」模式下，將投資組合單位淨值與大盤基準起點皆歸一化為 100%，以百分比刻度清晰展示 Alpha 超額報酬剪刀差，徹底解決個股/ETF 幾十元與千萬資產強制疊加的尺度失衡問題。

**Blocked by:** Ticket 01, Ticket 02, Ticket 06

**Status:** DONE

- [x] 在 `PortfolioGrowthChart.tsx` 頂部新增模式切換狀態 `chartMode: 'AUM' | 'UNIT_NAV'`
- [x] 在 `UNIT_NAV` 模式下，將 `series` 與大盤數列的第一筆價格歸一化為 100%（或相對基期百分比）
- [x] 座標軸 Y 軸刻度適配：AUM 模式顯示貨幣金額（如 NT$ 12.5M），UNIT_NAV 模式顯示百分比累積報酬率（如 +45.2%）
- [x] 交互 Tooltip 同步適配雙模數值顯示
- [x] 單元測試驗證模式切換與歸一化數列正確無誤
