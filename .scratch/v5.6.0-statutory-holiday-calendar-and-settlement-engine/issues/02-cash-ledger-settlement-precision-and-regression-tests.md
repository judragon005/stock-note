# 任務票券 #02: 現金帳本交割計算引擎升級與長假在途款邊界測試

- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **負責模組**:
  - `src/engine/cashLedgerEngine.ts` (升級)
  - `src/engine/cashLedgerEngine.test.ts` (擴充)

---

## 🎯 任務目標
將 `cashLedgerEngine.ts` 的 `calculateSettlementDate` 與 `getSettlementDate` 整合休市日曆模組，將單純的週末計數替換為嚴謹的營業日 (`isBusinessDay`) 累進，確保台美雙市場在途款在長假與節日期間維持正確的交割排程，不提早扣款或結算。

---

## 📋 實作細節與設計規格

1. **升級 `calculateSettlementDate(tradeDateStr, market)`**：
   - 引用 `holidayCalendar.ts` 的 `isBusinessDay`。
   - 迴圈累進天數並在 `isBusinessDay(d, market)` 為 true 時才扣減 `businessDaysToAdd`。
2. **升級連動函式**：
   - `getSettlementDate` 涉及換匯與撥款週期之交割日推算同樣享有休市日曆精確度。
3. **編寫長假交割邊界單元測試 (`cashLedgerEngine.test.ts`)**：
   - **台股春節封關測試**：
     - 測試封關前最後交易日買進之交易，T+2 交割日精準跳過整段農曆年假，直接順延至春節後開紅盤第二個營業日。
   - **美股感恩節/聖誕節 T+1 測試**：
     - 測試感恩節週三交易，T+1 交割日順延至週五（避開週四感恩節休市）。
     - 測試聖誕節前夕交易，T+1 交割日順延至節後第一個營業日。
   - **在途款時態演進測試**：
     - 驗證在春節假期間，`calculateAccountBalances` 依舊正確將款項列為在途款 (`pendingReceivables`/`pendingPayables`)，而非提前計入 `settledCash`。

---

## 驗收標準 (AC)
- [x] `calculateSettlementDate` 完整整合 `isBusinessDay`。
- [x] 既有 237 個單元測試與新增之長假邊界測試 100% 綠燈通過。
- [x] `npm run build` TypeScript 0 錯誤。
