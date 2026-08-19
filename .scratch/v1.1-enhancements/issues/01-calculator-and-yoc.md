# 01 — 會計引擎擴充：成本殖利率 (YoC) 與手續費折數試算核心 (Accounting Engine & TDD)

**What to build:**
擴充 `src/engine/calculator.ts` 與 `src/types/stock.ts`。為每檔持倉計算「累計領取股息」與「持股成本殖利率 (Yield on Cost %)」；新增手續費折數試算輔助函式 `calculateTaiwanFee(price, shares, discount, minFee)`，並撰寫 Vitest 單元測試確保 100% 通過。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `HoldingPosition` 新增 `totalDividends` 與 `yieldOnCostPercent` 欄位。
- [x] 支援台股手續費折扣計算（基底 0.1425% × 折扣，支援最低手續費設定）。
- [x] 在 `calculator.test.ts` 新增 YoC 與手續費折數之單元測試並全數通過。
