# 01 — 佈局渲染時序測試縫隙建置 (TDD Red Gate)

**What to build:**
在 `src/components/DividendLogView.test.ts` 新增測試驗證，利用靜態渲染標記直接檢驗關鍵容器的字元索引順序：
`Index("dividend-dual-panel-grid") < Index("近日持倉除息行事曆雷達") < Index("receivable-calendar")`。
在現行置頂代碼下，該測試應能精準攔截並報錯（紅燈）。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 新增 `Spec 0233: 近日持倉除息行事曆雷達佈局順序測試`
- [x] 驗證全市場與多帳戶下的渲染先後順序
- [x] 確保測試在重構前明確失敗（紅燈：expected 29420 to be less than 3896）
