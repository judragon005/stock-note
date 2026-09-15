# 02 — 無障礙 ESC 快捷鍵關閉與單元測試防禦性驗證 (Modal UX ESC Key & Unit Tests)

**What to build:**
為 `MarketSyncStatusBadge` 的彈窗加入鍵盤 `Escape` 鍵快捷關閉監聽（並在卸載或關閉時精準清理），提升無障礙體驗。
撰寫/更新單元測試，驗證點擊徽章後彈窗透過 Portal 掛載於 `document.body`，且關閉按鈕、點擊遮罩以及按下 ESC 鍵均能正確關閉彈窗。

**Blocked by:** 01 — React Portal & Modal Boundary Overflow Fix

**Status:** done

- [x] 在 `MarketSyncStatusBadge.tsx` 加入 `useEffect` 監聽鍵盤 `Escape` 事件，按下時自動關閉彈窗
- [x] 撰寫/擴充單元測試，驗證：
  - 點擊徽章開啟彈窗後，Modal 存在於 `document.body` 中
  - Modal 帶有視窗防溢出樣式屬性 (`maxHeight`, `overflowY`)
  - 點擊 `X` 按鈕關閉彈窗
  - 點擊外部 Backdrop 關閉彈窗
  - 按下 `Escape` 鍵關閉彈窗
