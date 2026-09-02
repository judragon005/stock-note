# Issue 03: 現金股利高精準比對與全量 TDD 回歸驗證

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0058 §2.3](file:///d:/APP/股票紀錄/docs/specs/0058-smart-scan-real-holding-alignment-and-rescan-precision-spec.md)
- **影響範圍**：`src/engine/corporateActionScanner.ts`, `src/engine/corporateActionScanner.test.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- 現金股利原以 $\le$ 60 天內同類型粗暴判定為已入帳，導致使用者刪除特定季配息後，重掃仍被其他季度混淆判定為已入帳。

---

## 2. 實作變更 (Implementation Changes)
- 在 `corporateActionScanner.ts` 中改為高精準比對：
  - 比對 `exDate`/`payDate`，或在 45 天內同時驗證每股配息價格或配息總金額。
  - 被刪除的季度配息精準識別為 `isAlreadyRecorded = false`（待補登）。
- 在 `corporateActionScanner.test.ts` 中補齊單季配息刪除重掃、除息日買進排除、9927 減資除息等單元測試。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] 手動刪除特定季配息後，重掃 100% 正確出現在待補登清單中。
- [x] 全量 33 個測試檔案、381 個單元測試 100% 綠燈通過。
- [x] TypeScript 編譯 0 錯誤。
