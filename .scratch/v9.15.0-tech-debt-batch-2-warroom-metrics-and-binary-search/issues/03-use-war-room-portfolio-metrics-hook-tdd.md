# Ticket 03 — 實作自訂 Hook `useWarRoomPortfolioMetrics` 與無 DOM 單元測試 (TDD)

**State:** OPEN
**Parent:** #466 (Spec 0220)

## What to build
在 `src/hooks/useWarRoomPortfolioMetrics.ts` 抽取與持倉、借貸、交割款扣除、自由發射彈藥 (Free Ammo)、美股匯差與維持率相關的計算邏輯。

## Acceptance criteria
- [ ] 撰寫 `src/hooks/useWarRoomPortfolioMetrics.test.ts` 覆蓋：
  - 一般持倉與質押借貸的維持率與自由彈藥計算。
  - 未交割款與 7 日 DCA 扣除對自由彈藥之衝擊。
  - 美股匯差加權成本匯率與匯差緩衝墊計算。
  - 無質押借貸時的安全降級。
- [ ] 測試無 DOM 依賴，以 renderHook 執行且 100% 綠燈。
