# ADR-0031: V4.8 Code Review 全量重構、在途交割日曆全自動化與時序卡片模組化

- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **對應 PRD**：[SPEC-0031: docs/specs/0031-code-review-refactoring-and-in-transit-enhancements.md](../specs/0031-code-review-refactoring-and-in-transit-enhancements.md)

## 上下文 (Context)
在 V4.7 交付「在途資金與三層可用性購買力帳本」後，透過 `/code-review` 發現以下架構與可維護性痛點：
1. **DRY 違反與欄位冗餘**：`src/engine/cashLedgerEngine.ts` 內計算各帳戶與全域彙總時，重複硬編碼了 14 個欄位的初始值物件達 4 次。
2. **在途交割日曆覆蓋不足**：跨國換匯/電匯調撥 (`FX_TRANSFER_IN/OUT`, `WIRE_FEE`) 與股票質押借款撥款 (`LOAN_DISBURSEMENT`) 尚未納入交割推算。
3. **組件龐大**：`CashLedgerWorkspace.tsx` 檔案過長，在途時序面板卡片邏輯可進一步模組化。

## 決策 (Decision)
1. **引擎層 DRY 工廠與純函式抽取**：
   - 封裝 `createEmptyAccountSummary()` 單一工廠函式。
   - 封裝 `isPendingOrFutureTransaction()` 統一判定在途邏輯。
2. **交割日曆全場景覆蓋**：
   - 升級 `getSettlementDate`，支援電匯自動推算 T+2（避開週末）、質押撥款自動推算 T+1（避開週末）。
3. **時序卡片獨立模組化**：
   - 抽出 `src/components/PendingSettlementCard.tsx` 專責呈現時序排程。

## 後果與影響 (Consequences)
- 代碼重複率降低，型別定義單一來源 (Single Source of Truth)。
- 全專案 166 項單元測試全綠通過。
