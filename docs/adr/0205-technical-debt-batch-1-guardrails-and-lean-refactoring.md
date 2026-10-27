# 0205 ADR: 第一梯隊高性價比架構技術債清理與精實重構架構決策 (Technical Debt Batch 1: Guardrails, Compound Timeout, Component Decomposition, and Style Cleanup)

## 狀態 (Status)

* **狀態：** `APPROVED`
* **決策日期：** 2026-10-27
* **關聯 Issue：** #336
* **對應規格書：** [`docs/specs/0205-technical-debt-batch-1-guardrails-and-lean-refactoring-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0205-technical-debt-batch-1-guardrails-and-lean-refactoring-spec.md)

---

## 脈絡與問題陳述 (Context & Problem Statement)

專案在演進至 V9.01.0 後，存在 4 項高性價比架構技術債：
1. **文檔防護缺失 (技術債 0047)**：`pre-push-guard.cjs` 尚未納入文檔死鏈檢驗，容易導致壞鏈被意外推送到遠端。
2. **連線逾時失守 (技術債 0052)**：傳入取消信號時 `defaultFetchJson` 覆蓋了 20 秒連線超時，可能造成請求無限期掛起。
3. **資料泥團與父層無效重繪 (技術債 0054)**：`WarRoomWorkspace.tsx` 頂層散落 8 個校準表單 State，使用者打字時引發 2,200 行單體元件反覆重渲染。
4. **內聯樣式重複宣告 (技術債 0053)**：`EightQuarterStatementTable.tsx` 表格儲存格樣式重複宣告。

---

## 決策結果 (Decision Outcome)

採納以下極簡與高防禦性解法（遵循 KISS 原則）：

1. **整合 Pre-push Guard 文檔守門**：在 `scripts/pre-push-guard.cjs` 加入 `verify-docs.cjs`，以 1 秒內的微小耗時換取 100% 杜絕死鏈與規格脫鉤。
2. **信號複合與降級兜底**：使用 `AbortSignal.any([options.signal, timeoutSignal])`，並在舊版環境無縫退回 `options.signal || timeoutSignal`，兼顧手動取消與逾時防護。
3. **Modal 狀態下沉與子元件獨立**：將快速校準表單提取至 `MacroQuickCalibrationModal.tsx`，表單輸入狀態完全下沉於內部自治，僅在使用者點擊「儲存」時輸出結果，徹底消滅父層 8 個狀態泥團與 Re-render 效能損耗。
4. **抽取樣式常數與展示型儲存格**：於 `EightQuarterStatementTable.tsx` 抽取 `TABLE_CELL_STYLES`，提升可維護性。
5. **技術債看板更新**：同步將 0047, 0052, 0053, 0054 標記為 `RESOLVED`。
