# 05 — 搜尋輸入框寬度彈性重構 (支援 4~8 碼)

**What to build:**
重構 `HeaderMarketBar.tsx` 中的股票搜尋 input，移除寫死的 `width: '75px'`，改為 `minWidth: '95px'`、配合適度 padding 與自適應彈性排版，確保輸入超過 5 碼（如 ETF `004030`、權證 6 碼或美股代號）時，字尾不再被截斷切除。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 移除 input 元素中寫死的 `width: '75px'`。
- [ ] 支援至多 8 碼字元完整顯示，不溢出、不遮擋。
