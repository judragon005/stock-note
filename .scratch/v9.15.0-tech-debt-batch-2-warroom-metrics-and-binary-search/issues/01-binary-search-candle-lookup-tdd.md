# Ticket 01 — 實作二元搜尋純函式 `findLatestCloseBeforeDate` 與專屬單元測試 (TDD)

**State:** OPEN
**Parent:** #466 (Spec 0220)

## What to build
在 `src/utils/binarySearch.ts` 建立純函式 `findLatestCloseBeforeDate(candles, targetDate)`，針對依日期升序排列之日 K 線陣列進行 $O(\log N)$ 二分搜尋，取得小於或等於目標日期的最新交易日收盤價。

## Acceptance criteria
- [ ] 撰寫 `src/utils/binarySearch.test.ts` 覆蓋：
  - 完全命中目標日期交易日。
  - 目標日期為週末或國定假日，自動取前一交易日收盤價。
  - 目標日期早於所有 K 線首日，回傳 `null`。
  - 目標日期晚於所有 K 線末日，回傳最後交易日收盤價。
  - 空陣列或 `undefined` 安全防禦，回傳 `null`。
- [ ] 實作純函式，零外部相依，單元測試 100% 通過。
