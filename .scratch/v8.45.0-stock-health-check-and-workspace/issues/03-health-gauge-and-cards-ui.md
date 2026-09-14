# 03 — 雙層圓環評分進度條與健診卡片元件 (Health Score Gauge & Health Card Components)

**What to build:**
打造高度還原參考介面的視覺呈現元件：
1. `src/components/health/HealthScoreGauge.tsx`：精美 SVG 雙層圓環進度條，中央呈現 `X/Y` 分數與「通過 XX% 條件」文字，外環依比例以主題色動態旋轉。
2. `src/components/health/HealthCard.tsx`：包含卡片標題、智能評語說明文字、右側圓環進度條、底部「查看完整健診細節 ➔」互動連結。

**Blocked by:** Ticket 01, Ticket 02

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #55

- [x] 實作 `HealthScoreGauge.tsx`，支援自定義半徑、線寬、分數與主題色自適應
- [x] 實作 `HealthCard.tsx`，呈現類別標題、摘要說明與評語
- [x] 卡片底部提供點擊觸發「查看完整健診細節」之事件回呼 (Callback)
- [x] 深色/淺色主題與現代毛玻璃擬態支援
