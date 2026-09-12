# 03 — Trends Layer SVG & DuPont Styling Refactor

**What to build:**
重構 `src/components/financial/FinancialTrendsLayer.tsx`。
將 Tailwind classes 替換為標準原生 Inline Styles 與深色主題變數。

1. 獲利三率折線 SVG：設定明確的寬高、網格輔助線、圖例與標籤，避免溢出。
2. 淨利 vs CFO 階梯圖：等距長條柱與背離警示標籤採用原生排版。
3. 杜邦 ROE 三因子矩陣：卡片式拆解（淨利率、週轉率、槓桿乘數）與主驅動力警示標籤排版。
4. 保持 `calculateMarginSvgPoints`、`formatCurrencyMillions`、`getDuPontDriverBadge` 既有邏輯以通過 Vitest 測試。

**Blocked by:** 02-hero-layer-inline-styling-refactor.md

**Status:** done

- [x] 移除 Tailwind classes，改用原生 Inline Styles
- [x] 三率折線 SVG 座標與圖例精準對齊
- [x] 既有單元測試 `FinancialTrendsLayer.test.ts` 100% 綠燈
