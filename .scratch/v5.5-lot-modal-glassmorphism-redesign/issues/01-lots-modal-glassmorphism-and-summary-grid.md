# 子票券 #01: Glassmorphism 容器重構與頂部 4 格資產指標看板

- **關聯 PRD**: `docs/specs/0038-lot-modal-glassmorphism-redesign-and-ux-enhancements.md` (AC-1, AC-2, AC-7)
- **所屬主票券**: `issue-0038.md`
- **分流標籤**: `ready-for-agent`

---

## 🎯 任務目標
1. 移除 `LotsBreakdownModal.tsx` 中所有無效之 Tailwind CSS 類別，改用專案標準 `glass-card`、CSS 變數與 Inline CSS。
2. 實作深色毛玻璃背景遮罩與 `Escape` / 遮罩點擊關閉監聽。
3. 實作頂部 4 格資產指標看板（在庫總股數、總成本基準、參考現價、未實現損益與報酬率膠囊）。
4. 實作自訂會計方法選擇器（含 Tooltip 說明）與現代化 Segmented Control 頁籤。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 彈窗在各螢幕解析度下置中且有毛玻璃背景遮罩，寬度自適應（最大 920px）。
- [ ] 頂部 4 格卡片排版整齊，未實現損益依紅漲綠跌主題精確變色。
- [ ] 頁籤切換流暢，會計方法選單支援 Hover 懸停解釋。
