# 08 — 螢幕絕對座標計算與視窗邊界防溢出

**What to build:**
在 `TermTooltip.tsx` 中實作基於 `getBoundingClientRect()` 的精確定位演算法，計算 `position: fixed` 的 top/left/right 座標，並加入邊界溢出防禦：當右側超出螢幕時自動靠右對齊，當下方超出可視區域時自動向上翻轉。

**Blocked by:** 07 — TermTooltip Portal 化 (直掛 document.body)

**Status:** ready-for-agent

- [ ] 精確依據觸發點位置計算浮層座標。
- [ ] 支援邊界碰撞檢測，杜絕彈窗超出瀏覽器可視區域。
