# 架構決策記錄 (ADR 0139)：質押借貸 FULL_PAYOFF 全額結清統一委託法定沖償引擎、流通股數推導純函式集中化與持倉雙階排序 DRY 重構架構

## 狀態 (Status)
**已接受 (Accepted)** - 2026-09-25

## 背景與問題脈絡 (Context)
在專案演進至 V8.51.0 之際，全系統已累積 971 個測試。經架構審查與技術債盤點，系統內部存在三項重複邏輯 (DRY) 與會計雙軌風險：
1. **質押借貸全額結清與部分清償引擎雙軌分歧 (Debt #0036 / Issue #25)**：
   - 部分還款已委託符合《民法》第 323 條（規費 ➔ 利息 ➔ 本金）之純函式引擎 `applyDebtRepayment`；但全額結清 (`FULL_PAYOFF`) 於 `CashLedgerWorkspace.tsx` 仍維持舊版手工組裝流水與手動清零本金，產生雙軌維護成本與規費殘留風險。
2. **估值核心流通股數推導重複分散 (Debt #0038 / PR #62)**：
   - `calculateFcfYield` 與 `calculateDcfValuation` 各自重複撰寫「優先資本額 / 10 ➔ 淨利 / EPS ➔ 保底 10 億股」之股數推導邏輯，違反 DRY 原則且缺乏獨立公開測試縫隙。
3. **持倉雙階自然排序重複實現 (Debt #0001 / PR #83)**：
   - 核心計算引擎 `calculator.ts` 與 UI 視圖防禦層 `HoldingsTable.tsx` 各自實現完全相同的「台股優先、美股置底、同市場代碼字典序」之 7 行比較器代碼。

## 決策內容 (Decision)

1. **質押借貸 FULL_PAYOFF 統一委託 `applyDebtRepayment` 會計引擎**：
   - 淘汰 `CashLedgerWorkspace.tsx` 中的手工流水組裝與本金清零邏輯。
   - 計算全額應還金額後，統一傳遞給 `applyDebtRepayment`，由核心純函式負責規費扣抵、利息沖償與本金沖銷，並自動產出標準拆分流水。
   - 直接將回傳之更新後合約打上結清日標記 `closedDate: effectiveDate`，確保部分還款與全額結清共享 100% 一致之沖償演算法。
2. **導出流通股數推導標準純函式 `deriveSharesOutstanding`**：
   - 於 `src/engine/keyMetricsEngine.ts` 集中封裝並導出 `deriveSharesOutstanding(recordOrRecords?, overrideShares?)`。
   - 將 `calculateFcfYield`、`calculateDcfValuation` 與 `AnalysisMetricView.tsx` 統一改為調用此純函式，並在單元測試建立專屬極端資料覆蓋。
3. **抽取集中排序比較器 `compareHoldingsOrder`**：
   - 於 `src/utils/holdingsSort.ts` 集中定義並導出 `compareHoldingsOrder(a, b)`。
   - 供 `calculator.ts` 與 `HoldingsTable.tsx` 統一引用，並編寫完整的單元測試覆蓋台美股排序與字典序升冪。

## 效益與權衡 (Consequences)

- **正面效益**：
  - **消滅會計雙軌風險**：全額結清與部分還款皆由唯一受測引擎管理，日後法規或費用調整只需修改一處，徹底杜絕會計漂移。
  - **極致乾淨的代碼衛生 (Clean Code & KISS)**：一次性解決專案中積存最久的 3 個技術債（#0001, #0036, #0038）。
  - **單一事實來源 (SSOT)**：流通股數推導與持倉排序邏輯均具備專屬純函式與獨立單元測試保護。
- **權衡**：
  - 重構影響 UI 狀態更新入口點，需確保現有 971 個測試與借貸沖銷流程 100% 綠燈相容。
