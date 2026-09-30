# 07 — TermTooltip Portal 化 (直掛 document.body)

**What to build:**
重構 `TermTooltip.tsx`，使用 React `createPortal` 將浮層卡片直接掛載至 `document.body` 頂層，徹底根絕由父容器 `backdrop-filter` 或 DOM 順序所形成的 CSS Stacking Context 遮擋陷阱。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 引入 `createPortal` 渲染 Tooltip 彈出層。
- [ ] 彈出層 DOM 節點獨立於卡片 DOM 樹之外。
