# 需求規格說明書：Code Review 全量重構與在途資金架構增強 (SPEC-0031)

## Problem Statement

在 V4.7「在途資金與三層可用性購買力會計帳本」上線後，經過雙軸 Code Review 審查，發現數個可進一步提升系統可維護性、架構整潔度與業務覆蓋度的技術改進點：

1. **引擎重複程式碼 (Duplicated Logic in Engine)**：
   - `AccountBalanceSummary` 14 欄位之初始物件字面量在 `calculateAccountBalances` 內重複出現 2 次。
   - `isPendingOrFutureEvent` 判定邏輯 (`tx.settlementStatus === 'PENDING' || (Boolean(tx.settlementDate) && tx.settlementDate > todayStr)`) 在 3 個獨立函式中重複分散撰寫，存在 Shotgun Surgery 風險。
2. **工作台元件職責過重 (Component Bloat & Feature Envy)**：
   - `CashLedgerWorkspace.tsx` 檔案已超過 1660 行，在途時序看板的 JSX 內部混雜了幣別轉換、正負格式化與卡片佈局邏輯，缺乏獨立子元件封裝。
3. **電匯與質押撥款在途推算未全自動化 (Incomplete In-Flight Settlement Automation)**：
   - 目前 `getSettlementDate` 僅對股票買賣 (`STOCK_BUY`/`STOCK_SELL`) 自動套用 T+2/T+1 推算，跨國電匯 (`FX_TRANSFER_IN/OUT`, `DEPOSIT`) 與質押撥款 (`LOAN_DISBURSEMENT`) 預設回傳交易日當天，未能完全落實 US#9 (電匯在途窗口) 與 US#10 (質押撥款在途窗口) 之預設自動化期待。

---

## Solution

執行全量代碼審查改善計畫：

1. **引擎層純函式 DRY 抽象**：
   - 封裝 `createEmptyAccountSummary(accountId, accountName, currency)` 工廠函式。
   - 封裝 `isPendingOrFutureTransaction(tx, todayStr)` 統一判定函式。
2. **在途交割日曆引擎升級 (Settlement Calendar Engine Enhancement)**：
   - 升級 `getSettlementDate`：
     - 台股股票：`T+2`（跳過週末）。
     - 美股股票：`T+1`（跳過週末）。
     - 跨國換匯/電匯調撥 (`FX_TRANSFER_IN`, `FX_TRANSFER_OUT`, `WIRE_FEE`)：預設 `T+2` 銀行清算窗口（跳過週末）。
     - 質押借款撥款 (`LOAN_DISBURSEMENT`)：預設 `T+1` 撥款窗口（跳過週末）。
     - 現金股息 (`DIVIDEND_PAYOUT`)：優先採用 `customPaymentDate`。
     - 其餘一般款項：交易日當天生效。
     - 全場景依然支援彈窗自訂與手動覆寫。
3. **前端元件模組化拆分**：
   - 新增 `src/components/PendingSettlementCard.tsx`，專職渲染在途排程卡片、幣別格式化與一鍵核銷互動。
   - 精簡 `CashLedgerWorkspace.tsx`，提升渲染效能與代碼可讀性。
4. **健全防禦與型別校驗**：
   - 提供日期格式安全解析防禦，徹底杜絕無效日期引發之 `NaN` 錯誤。

---

## User Stories & Acceptance Criteria

### User Story 1: DRY Engine Calculation
作為維護開發者，我希望引擎層的所有在途判定與帳戶初始化都透過單一具名函式完成，確保未來規則變更時僅需修改單一來源。
- **AC 1.1**: `calculateAccountBalances`、`calculateTradingBuyingPower`、`groupPendingSettlementsByTimeline` 統一呼叫 `isPendingOrFutureTransaction`。
- **AC 1.2**: 帳戶初始化統一呼叫 `createEmptyAccountSummary`。

### User Story 2: Automated Wire & Loan Settlement Window
作為進行海外電匯或股票質押的投資人，我希望建立電匯時系統自動為我推算 T+2 清算日，質押借款自動推算 T+1 撥款日，讓我免去手動查閱日曆之繁瑣。
- **AC 2.1**: `getSettlementDate` 針對 `FX_TRANSFER_OUT`/`FX_TRANSFER_IN` 預設回傳 T+2 日期。
- **AC 2.2**: `getSettlementDate` 針對 `LOAN_DISBURSEMENT` 預設回傳 T+1 日期。
- **AC 2.3**: 彈窗表單即時響應類別切換，動態更新預估交割日。

### User Story 3: Clean Workspace UI Architecture
作為前端架構師，我希望時序看板項目具備獨立的子元件封裝，使 `CashLedgerWorkspace.tsx` 維持關注點分離。
- **AC 3.1**: 建立 `src/components/PendingSettlementCard.tsx`。
- **AC 3.2**: `CashLedgerWorkspace.tsx` 引用該子元件，全量測試 100% 綠燈通過。

---

## Testing Decisions

1. 擴充 `src/engine/cashLedgerEngine.test.ts`，新增針對電匯 (T+2) 與質押撥款 (T+1) 自動推算之單元測試。
2. 驗證工廠函式與統一判定函式之極端邊界條件（如跨年、閏年、同日交易排序）。
3. 確保全專案所有既有單元測試持續 100% 綠燈通過。

---

## Out of Scope

- 引入過度複雜的第三方外部行事曆 API 或全球假期聯網查詢（保持純本地計算與手動覆寫彈性，符合 KISS 原則）。
