# 01 — 頂部同步狀態徽章視覺與樣式全面重構 (Header Sync Badge Visual Redesign)

**What to build:**
徹底修復當前頂部 Header 左下方白邊黑底粗糙突兀的視覺問題。移除 Tailwind 類別，全面採用專案既有之深色科技毛玻璃樣式 (`background: rgba(19, 29, 49, 0.7)`, `border: 1px solid var(--border-color)`)。文字精簡為小巧精緻的狀態膠囊，移至右側狀態晶片組，與「台股盤中 12:22:02」、「匯率」自然並列，提升整體界面對稱性與呼吸感。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 移除 `MarketSyncStatusBadge.tsx` 中不符合全域規範的 Tailwind 類別，改以原生 Inline Styles 與 CSS Tokens 繪製
- [ ] 精簡膠囊標籤呈現：未同步時顯示小巧資料庫圖示與狀態，已同步時以國旗標籤與更新時間呈現（如 `🇹🇼 16:01 | 🇺🇸 08:02`）
- [ ] 調整 `Header.tsx` 佈局：將同步徽章移至右側狀態晶片組，避免佔據左下排按鈕空間
- [ ] 升級詳細資訊彈窗為專案原生毛玻璃暗黑卡片風格，確保色彩對比度與關閉互動順暢
