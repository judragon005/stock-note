# 01 — React Portal 渲染脫離 Containing Block 與視窗防溢出邊界約束 (React Portal & Modal Boundary Overflow Fix)

**What to build:**
解決 `MarketSyncStatusBadge.tsx` 彈窗上半部被螢幕視窗頂部裁切、無法檢視標題與點擊 `X` 關閉的問題。
在 `MarketSyncStatusBadge.tsx` 引入 React `createPortal`，將彈窗根容器渲染至 `document.body` 頂層，徹底脫離 `<header className="glass-card">` 的 `backdrop-filter: blur(16px)` 所建立的 Containing Block。
同時調整彈窗外層遮罩具備 `padding: '24px 16px'` 與 `overflowY: 'auto'`，彈窗本體設定 `maxHeight: 'min(90vh, 620px)'` 與 `overflowY: 'auto'`，確保任何解析度與螢幕縮放比例下頂部標題與關閉按鈕均完整可視可點。

**Blocked by:** None — can start immediately.

**Status:** done

- [x] 在 `MarketSyncStatusBadge.tsx` 引入 `import { createPortal } from 'react-dom';`
- [x] 將 `{showModal && (...) }` 改為 `showModal && typeof document !== 'undefined' && createPortal((...), document.body)`
- [x] 彈窗遮罩外層設定 `padding: '24px 16px'`、`overflowY: 'auto'`、`display: 'flex'`、`alignItems: 'center'`、`justifyContent: 'center'`
- [x] 彈窗卡片本體設定 `maxHeight: 'min(90vh, 620px)'`、`overflowY: 'auto'`、`margin: 'auto'`
