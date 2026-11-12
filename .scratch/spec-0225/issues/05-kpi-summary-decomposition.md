# 05 — `DividendKpiSummary.tsx` 四大發光 KPI、質押利差與配股追蹤卡片

**What to build:**
將 4 大發光 KPI 摘要面板抽出為獨立子組件 `DividendKpiSummary.tsx`，除原有實領、待收、累計、稅費外，新增借貸質押利差抵沖卡片、匯費損耗警告與待入庫股票股利彙總。

**Blocked by:** 03 — 質押借貸淨利差 (Carry Spread) 與累計匯費警報模組

**Status:** ready-for-agent

- [ ] 獨立抽出 `src/components/dividend/DividendKpiSummary.tsx`。
- [ ] 支援實質淨利差 (`股息 - 利息`) 與累計跨行匯費警報顯示。
- [ ] 支援股票股利 (配股) 待入庫股數與上市追蹤展示。
- [ ] 單元測試驗證 KPI 指標計算與邊界值渲染。

