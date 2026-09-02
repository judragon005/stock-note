# 07 — 在途交割時序排程面板與一鍵核銷 (Timeline Drawer & Toggle)

**What to build:**
在現金帳本工作區新增「在途交割時序排程面板 (Settlement Timeline Card)」：
- 依據 `groupPendingSettlementsByTimeline` 結果，按日期時間軸依序展開（今日交割、明日交割、本週交割、未來排程）。
- 每一筆在途項目提供：
  - 帳戶與標的資訊、交割金額、倒數天數。
  - `[✅ 一鍵確認交割]` 快捷按鈕：點擊後立即將該筆 `settlementStatus` 切換為 `'SETTLED'`，同步更新 LocalStorage 並重算三層可用性餘額。
  - 若已為 `SETTLED`，亦可點擊切回 `⏳ 標記為待交割`。

**Blocked by:** 04-timeline-grouping-engine

**Status:** completed

- [x] 建置在途交割時序排程面板元件（支援摺疊/展開）。
- [x] 實作一鍵切換狀態之回調函式與即時狀態更新。
- [x] 驗證切換狀態後頂部四核心指標卡片與流水清單之即時聯動。
