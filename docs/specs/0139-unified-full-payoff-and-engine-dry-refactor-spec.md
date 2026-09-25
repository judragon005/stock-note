# 需求規格說明書 (PRD #0139)：質押借貸 FULL_PAYOFF 全額結清統一委託法定沖償引擎、流通股數推導純函式集中化與持倉雙階排序 DRY 閉環重構

- **規格編號**：Spec 0139
- **發布版本**：V8.52.0
- **關聯架構決策**：[ADR 0139](../adr/0139-unified-full-payoff-and-engine-dry-refactor.md)
- **關聯技術債**：
  - 🎯 核心：[Debt #0036 (質押借貸 FULL_PAYOFF 全額結清分支統一委託 applyDebtRepayment 引擎重構)](../debts/0036-full-payoff-unified-engine-refactor.md)
  - 🔗 關聯 1：[Debt #0038 (提取流通股數推導共用輔助函式 deriveSharesOutstanding)](../debts/0038-derive-shares-outstanding-helper-refactor.md)
  - 🔗 關聯 2：[Debt #0001 (持倉雙階自然排序 DRY 集中化重構)](../debts/0001-holdings-sort-dry-refactor.md)
- **關聯 GitHub Issue**：[Issue #25](https://github.com/judragon005/stock-note/issues/25)

---

## Problem Statement (問題陳述)

在專案演進至 V8.51.0、累積 971 個嚴格單元測試的穩健基礎上，經架構審查識別出專案內部存在三大亟待收斂的重複邏輯 (DRY) 與會計雙軌風險：

1. **質押借貸全額結清 (`FULL_PAYOFF`) 與法定沖償引擎雙軌分歧 (Debt #0036 / Issue #25)**：
   - 在 V8.36.0 (PR #24) 中，系統引入了符合《民法》第 323 條法定清償順序（**規費 ➔ 利息 ➔ 本金**）的純函式清償引擎 `applyDebtRepayment`（位於 [`src/engine/cashLedgerEngine.ts`](../../src/engine/cashLedgerEngine.ts#L800)）。「部分還款 (`PARTIAL_PAY`)」已全面切換委託此引擎，自動扣抵已繳規費並維護計息日。
   - 然而在 [`src/components/CashLedgerWorkspace.tsx`](../../src/components/CashLedgerWorkspace.tsx#L471-L543) 中，「全額結清 (`FULL_PAYOFF`)」分支仍遺留舊版手工拼裝邏輯：手工調用 `calculateLoanInterestAndPayoff`、手工組裝推入 3 筆交易流水、手工將 `loan.principal` 設為 0。
   - 此雙軌機制導致：若日後質押合約新增提前結清手續費、違約金或費用折讓，必須在 UI 視圖層與純函式引擎雙處維護，且手工分支未能完全調用合約內的規費清零邏輯，存在微小會計殘留隱患。

2. **估值核心流通股數推導邏輯重複且分散 (Debt #0038 / PR #62)**：
   - 在 [`src/engine/keyMetricsEngine.ts`](../../src/engine/keyMetricsEngine.ts) 中，自由現金流報酬率 (`calculateFcfYield`) 與現金流折現模型 (`calculateDcfValuation`) 均需要流通在外的股數以計算每股數值。
   - 兩者各自獨立實作了完全相同的推導階梯：「優先取資產負債表之股本 / 10 ➔ 次級取稅後淨利 / EPS ➔ 保底 1,000,000,000 股」。
   - 同時在 UI 視圖層 [`src/components/analysis/AnalysisMetricView.tsx`](../../src/components/analysis/AnalysisMetricView.tsx) 中亦存在散落的股本推導片段，缺乏公開導出的純函式與獨立測試縫隙。

3. **持倉清單雙階自然排序重複實現 (Debt #0001 / PR #83)**：
   - 系統為滿足美股與台股持倉雙階自然排序規格（台股權重 0 置前、美股權重 1 置底、同市場依代碼字典序自然升冪），在核心計算引擎 [`src/engine/calculator.ts`](../../src/engine/calculator.ts#L919-L925) 與 UI 視圖層 [`src/components/HoldingsTable.tsx`](../../src/components/HoldingsTable.tsx#L233-L239) 各自重複實現了完全相同的 7 行比較器代碼。
   - 雖代碼量不大，但屬於自 2026-08-21 積存至今歷史最久之未解決技術債，需趁本輪重構一次性乾淨結清。

---

## Solution (解決方案)

本規格遵循 **KISS 原則** 與 **第一性原理**，不引入任何新第三方依賴，純粹透過模組解耦、純函式抽取與單一事實來源 (SSOT) 委託重構，一次性解決上述三項技術債：

1. **質押借貸 FULL_PAYOFF 全面統一委託 `applyDebtRepayment` (Debt #0036)**：
   - 將 `CashLedgerWorkspace.tsx` 中的 `executePayoff` 函式全面改寫，無論是全額結清 (`FULL_PAYOFF`) 或是部分償還 (`PARTIAL_PAY`)，一律計算應清償總金額後，委託 `applyDebtRepayment` 核心純函式處理。
   - `applyDebtRepayment` 保證依據法定順序逐項扣抵規費、利息與本金，並自動產生標準之拆分現金流水（規費 `WIRE_FEE`、利息 `FINANCING_FEE`、本金 `LOAN_REPAYMENT`）。
   - 全額結清時，合約之本金自然降為 0，且合約內未繳規費自然清零，直接標記 `closedDate: effectiveDate` 與 `lastInterestPaymentDate: effectiveDate`，消除 UI 與引擎的雙軌維護成本。

2. **抽取共用公開純函式 `deriveSharesOutstanding` (Debt #0038)**：
   - 在 `src/engine/keyMetricsEngine.ts` 集中導出標準純函式 `deriveSharesOutstanding(recordOrRecords?, overrideShares?)`。
   - 完整支援多季陣列、單季物件與自訂股數覆寫，封裝三階推導階梯。
   - 將 `calculateFcfYield`、`calculateDcfValuation` 與 `AnalysisMetricView.tsx` 全面改為調用此純函式，並於單元測試中建立專屬測試縫隙。

3. **抽取集中排序比較器 `compareHoldingsOrder` (Debt #0001)**：
   - 在 `src/utils/holdingsSort.ts` 集中定義並導出純函式比較器 `compareHoldingsOrder(a, b)`。
   - 支援包含 `{ symbol: string; market: 'TW' | 'US' }` 介面之任何標的或持倉物件排序。
   - `calculator.ts` 與 `HoldingsTable.tsx` 統一引用此比較器，並編寫完整的單元測試覆蓋雙市場與自然升冪邊界。

---

## User Stories (使用者故事)

1. 作為投資人與記帳使用者，當我在質押借貸模組點擊「全額結清」時，我希望系統依照金融法規順序精確沖銷規費、計息天數與本金，並在現金帳本產生清晰分明的拆分流水，使記帳紀錄與券商銀行帳戶完全一致。
2. 作為使用者，我希望在全額結清質押借貸後，該筆借貸合約內部累積的設質手續費與規費能被正確歸零結清，避免在未來的報表或過濾器中出現舊規費殘留。
3. 作為個股量化分析的使用者，我希望在查看自由現金流報酬率 (FCF Yield) 與現金流折現 (DCF) 模型時，系統內部計算每股指標的流通股數基準 100% 相同一致，杜絕因分散實作產生的估值分歧。
4. 作為台美雙市場投資人，我希望無論是在持倉總覽計算引擎還是在持倉表格 UI 介面，所有股票永遠保持「台股置頂（依代碼升冪）➔ 美股置底（依代碼升冪）」的自然整齊順序。
5. 作為專案維護工程師，我希望專案架構中不存在複製貼上的重複邏輯（DRY），所有純函式運算均具備高內聚性、單一職責與專屬單元測試保護。

---

## Implementation Decisions (實作決策)

### 1. `compareHoldingsOrder` 排序工具抽取 ([src/utils/holdingsSort.ts](../../src/utils/holdingsSort.ts))
```typescript
export interface HasMarketAndSymbol {
  symbol: string;
  market: 'TW' | 'US';
}

/**
 * 美股與台股持倉雙階自然排序比較器 (KISS 純函式)
 * 1. 台股權重 0 置前，美股權重 1 置底
 * 2. 同市場依據標的代碼進行自然字典序升冪排列 (localeCompare)
 */
export function compareHoldingsOrder(a: HasMarketAndSymbol, b: HasMarketAndSymbol): number {
  const marketWeightA = a.market === 'TW' ? 0 : 1;
  const marketWeightB = b.market === 'TW' ? 0 : 1;
  if (marketWeightA !== marketWeightB) {
    return marketWeightA - marketWeightB;
  }
  return a.symbol.localeCompare(b.symbol);
}
```

### 2. `deriveSharesOutstanding` 純函式導出 ([src/engine/keyMetricsEngine.ts](../../src/engine/keyMetricsEngine.ts))
```typescript
/**
 * 第一性原理之流通股數推導純函式 (SSOT)
 * 1. 優先使用手動指定之 overrideShares
 * 2. 優先由資產負債表 capitalStock 推導 (台股面額 10 元，股數 = capitalStock / 10)
 * 3. 次級由損益表淨利與 EPS 反推 (netIncome / eps)
 * 4. 保底基準值 1,000,000,000 (10 億股)
 */
export function deriveSharesOutstanding(
  recordOrRecords?: QuarterlyFinancialRecord | QuarterlyFinancialRecord[],
  overrideShares?: number
): number {
  if (overrideShares && overrideShares > 0) return overrideShares;
  const records = Array.isArray(recordOrRecords) ? recordOrRecords : (recordOrRecords ? [recordOrRecords] : []);
  const latest = records[0] || records[records.length - 1];
  if (!latest) return 1000000000;

  if (latest.balanceSheet?.capitalStock && latest.balanceSheet.capitalStock > 0) {
    return latest.balanceSheet.capitalStock / 10;
  }
  if (latest.income?.netIncome && latest.income.eps && latest.income.eps > 0) {
    return latest.income.netIncome / latest.income.eps;
  }
  return 1000000000;
}
```

### 3. `executePayoff` FULL_PAYOFF 分支統一委託 ([src/components/CashLedgerWorkspace.tsx](../../src/components/CashLedgerWorkspace.tsx))
- 淘汰 `CashLedgerWorkspace.tsx` L471~L533 的 60 行手工流水組裝。
- 將 `metrics = calculateLoanInterestAndPayoff(loan, effectiveDate)` 所得之應清償總金額直接作為 `repaymentAmount` 傳遞給 `applyDebtRepayment`。
- `applyDebtRepayment` 回傳之 `updatedLoan` 自動包含規費清零、利息繳清與 `remainingPrincipal = 0`。
- 直接將 `updatedLoan` 標記 `closedDate: effectiveDate` 與 `lastInterestPaymentDate: effectiveDate`，並寫入帳本流水與保存。

---

## Testing Decisions (測試決策)

1. **公開介面測試縫隙 (Test Seams)**：
   - **`src/utils/holdingsSort.test.ts` (新創單元測試)**：
     - 測試台股 (2330) 優先於美股 (AAPL)。
     - 測試同市場台股 (1101 vs 2330) 依數字代碼升冪。
     - 測試同市場美股 (AAPL vs MSFT vs NVDA) 依英文字典序升冪。
     - 測試同標的傳入時回傳 0。
   - **`src/engine/keyMetricsEngine.test.ts` (擴充單元測試)**：
     - 測試手動傳入 `overrideShares` 優先採用。
     - 測試僅具備 `balanceSheet.capitalStock` 時精確除以 10。
     - 測試無 `capitalStock` 但具備 `netIncome` 與 `eps` 時正確反推股數。
     - 測試無財務數據時回傳保底 1,000,000,000。
     - 驗證 `calculateFcfYield` 與 `calculateDcfValuation` 採用共用推導後輸出無偏差。
   - **`src/components/CashLedgerWorkspace.tsx` / `src/engine/cashLedgerEngine.test.ts`**：
     - 驗證全額結清場景下，`applyDebtRepayment` 足額沖償規費、利息與本金，回傳三筆對應金額之拆分流水。
     - 驗證結清後合約本金降為 0，且合約之設質規費被扣抵清空。
2. **回歸測試保證**：
   - 本地執行 `npm test` 確保既有 102 個測試套件、971 個測試 100% 綠燈通過。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤、0 警告。

---

## Out of Scope (範圍界定)

1. **新增第三交易市場 (如日股/港股) 排序權重**：本規格聚焦於現有台美雙市場 DRY 抽取，日後若引進第三市場再擴充權重對照表。
2. **新增美股多幣別借貸清償**：維持現有 USD / TWD 借貸沖銷規則，不新增其他外幣借貸型別。
3. **更動 IndexedDB 資料庫 Schema**：維持既有資料庫版本與結構，所有重構均為代碼邏輯層面之收斂。

---

## Further Notes (後續附註)

- 本規格實作完成後，技術債看板 `docs/debts/README.md`、`0001`、`0036`、`0038` 將同步標記為 `RESOLVED`。
- 本規格對應關聯 GitHub [Issue #25](https://github.com/judragon005/stock-note/issues/25)。
