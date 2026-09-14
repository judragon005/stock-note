# 01 — 圓環進度條與健診卡片原生 Glassmorphism 重構 (Gauge & Card Native Glassmorphism)

**What to build:**
重構 `src/components/health/HealthScoreGauge.tsx` 與 `src/components/health/HealthCard.tsx`：
1. 徹底拔除 Tailwind 類別，全面採用專案原生 CSS 變數（`var(--bg-card)`, `var(--border-color)`, `var(--text-primary)`, `var(--text-secondary)`, `.glass-card` 等）與 Inline Styles。
2. 固定 SVG 尺寸與 ViewBox，文字絕對垂直水平居中，進度環漸層染色，杜絕任何溢出變形。
3. `HealthCard.tsx` 消除巨大黑箭頭，使用內建小型 Lucide ChevronRight 或精美 CSS 箭頭，左側評語行距放寬，右側圓環對齊。

**Blocked by:** None — can start immediately

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #57

- [x] `HealthScoreGauge.tsx` 原生化重構（精準約束半徑與中心文字）
- [x] `HealthCard.tsx` 原生化重構（.glass-card 樣式、平滑懸停發光、消除大黑箭頭）
- [x] 支援深色與淺色主題色彩對齊
