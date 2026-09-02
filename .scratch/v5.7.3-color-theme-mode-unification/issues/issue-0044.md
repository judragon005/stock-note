# 迭代主票券: v5.7.3 全專案「慣用紅綠漲跌」色彩模式統一與 CSS 變數體系全面連動

- **關聯 PRD**: [docs/specs/0044-color-theme-mode-unification-and-full-project-css-sync.md](../../docs/specs/0044-color-theme-mode-unification-and-full-project-css-sync.md)
- **版本**: v5.7.3
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **分流狀態 (Triage Status)**: `ready-for-agent`

---

## 🎯 迭代目標

1. **Header 切換按鈕標籤對稱化**：修正頂部切換按鈕在國際模式下的顯示文字為「`🟢 綠漲 🔴 紅跌`」。
2. **NAV 圖表與概覽卡片色彩統一**：在 `PortfolioGrowthChart.tsx` 中全面替換寫死之 Hex 色碼（`#ef4444` / `#10b981`），改用 `var(--gain-color)` 與 `var(--loss-color)`，確保當日漲跌額/率、全期累計總損益、XIRR、Alpha 超額報酬嚴格動態連動，NAV 總資產與 ATH 保持主題中性色。
3. **全專案彈窗與表格色彩一致性**：清查並修復 `XirrDetailModal.tsx`、`MarginStressModal.tsx` 等元件中寫死之漲跌顏色。
4. **無損回歸與 ADR 同步**：確保 `npm test` 100% 通過、`npm run build` 0 錯誤，並完成 ADR-0044 與 CONTEXT.md 同步。

---

## 📋 細粒度原子任務看板 (Granular Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 目標檔案與交付重點 | 狀態 | 分流標籤 |
| :---: | :--- | :---: | :--- | :---: | :---: |
| [**#01**](01-header-theme-toggle-and-css-variables-spec.md) | Header 模式切換按鈕文字對稱化與 CSS 變數規範對齊 | 0.2h | `src/components/Header.tsx` (文字修正與按鈕單元測試) | `RESOLVED` | `ready-for-agent` |
| [**#02**](02-portfolio-growth-chart-and-modals-color-unification.md) | NAV 圖表概覽卡片與全專案彈窗色彩全面連動 | 0.5h | `src/components/PortfolioGrowthChart.tsx`, `XirrDetailModal.tsx`, `MarginStressModal.tsx` | `RESOLVED` | `ready-for-agent` |
| [**#03**](03-full-regression-and-adr-sync.md) | 全量回歸測試、ADR 架策決策與領域文檔同步 | 0.3h | `npm test`, `npm run build`, `docs/adr/0044-*.md`, `CONTEXT.md` | `RESOLVED` | `ready-for-agent` |

---

## 子任務拆解清單 (3 張原子票券)
- [x] [01-header-theme-toggle-and-css-variables-spec.md](01-header-theme-toggle-and-css-variables-spec.md) - Header 模式切換按鈕文字對稱化與 CSS 變數規範對齊 (`RESOLVED`)
- [x] [02-portfolio-growth-chart-and-modals-color-unification.md](02-portfolio-growth-chart-and-modals-color-unification.md) - NAV 圖表概覽卡片與全專案彈窗色彩全面連動 (`RESOLVED`)
- [x] [03-full-regression-and-adr-sync.md](03-full-regression-and-adr-sync.md) - 全量回歸測試、ADR 架構決策與領域文檔同步 (`RESOLVED`)
