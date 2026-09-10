# 06 — CSV 動態資料交換 (DDE) 公式注入防禦過濾器 (CSV DDE Formula Sanitizer)

**What to build:**
實作符合 OWASP CSV Injection 標準之安全過濾引擎 `csvSanitizer.ts`。在交易紀錄匯出、持股清單匯出及任何 CSV 生成邏輯中，檢測每個儲存格的字串內容。若字串以危險字元 (`=`, `+`, `-`, `@`, `\t`, `\r`) 開頭，自動在前方附加單引號 `'`（例如：`=SUM(...)` 轉為 `"'=SUM(...)"`），使試算表軟體（Excel、Calc、Numbers）將其作為純文字處理，防止惡意公式與動態資料交換 (DDE) 觸發本機代碼執行 (RCE)。合法數值型態欄位（成交價、股數、費用）保持純數值格式，不影響統計彙總運算。

**Blocked by:** None — can start immediately

**Status:** complete

- [x] 定義 6 大危險開頭字元常數 `['=', '+', '-', '@', '\t', '\r']`
- [x] 實作 `sanitizeCSVCell(value: unknown): string` 消毒函數
- [x] 數值型別（number）與安全字串保持原生輸出；以危險字元開頭之字串前置單引號 `'` 消毒並雙引號包裹
- [x] 整合現有交易匯出模組（如 `exportTradesToCSV`），全面替換為安全消毒輸出
- [x] 單元測試於 `src/engine/csvSanitizer.test.ts` 驗證所有公式注入變體與數值欄位相容性
