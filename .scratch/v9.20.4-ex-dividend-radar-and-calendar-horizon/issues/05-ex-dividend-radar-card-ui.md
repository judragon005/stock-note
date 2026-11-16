# 05 — 開發獨立 ExDividendRadarCard 緊湊時序清單卡片元件

**What to build:** 在 src/components/dividend/ExDividendRadarCard.tsx 建立獨立元件。頂部展示彙整 KPI（近 60 天預計除息檔數、預估稅後淨現金流總額、健保扣繳預警總件數）；主體以時序流清單呈現：標示 T-X 倒數徽章、標的代號/名稱、每股配息、預計淨入帳金額、二代健保警報徽章、預計入帳發放日與官方確認/預估狀態。

**Blocked by:** 01 (#566), 02 (#567), 03 (#568), 04 (#569)

**Status:** ready-for-agent
**GitHub Issue:** #570

- [ ] 建立獨立 ExDividendRadarCard 元件並具備精美 Glassmorphism 視覺風格
- [ ] 支援頂部彙整 KPI 統計與時序流清單排版
- [ ] 實作無事件時之優雅空狀態（Empty State）
- [ ] 撰寫元件級渲染測試驗證各項徽章與文字顯示
