# Ticket 04 — WarRoomWorkspace 串接 Hook 並精簡 110+ 行計算程式碼

**State:** OPEN
**Parent:** #466 (Spec 0220)

## What to build
在 `src/components/WarRoomWorkspace.tsx` 引入 `useWarRoomPortfolioMetrics`，移除 L472～L580 的重複內聯風控運算，專注於各分區卡片的排版與佈局。

## Acceptance criteria
- [ ] `WarRoomWorkspace.tsx` 程式碼精簡 110+ 行。
- [ ] 戰情室各分區卡片接收之 `shield` 與 `lookThroughReport` 資料完全不變。
- [ ] 現有戰情室相關測試全部綠燈通過。
