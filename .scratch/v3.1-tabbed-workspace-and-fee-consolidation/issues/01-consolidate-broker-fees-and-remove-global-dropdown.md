# Ticket #1: [Refactor/Engine] 賣出手續費功能全面收斂至券商帳戶與移除全域重複選單

- **狀態**: Completed
- **規格書**: [SPEC-0014](../../../docs/specs/0014-tabbed-workspace-and-broker-fee-consolidation.md)
- **架構決策**: [ADR-0014](../../../docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)

---

## 任務目標 (Objective)
徹底移除 Header 頂部殘留的獨立全域「賣出手續費折讓率」選單，將賣出手續費試算與折讓率邏輯完全收斂由「券商帳戶體系 (Broker Accounts)」獨立管理與驅動，達成 Single Source of Truth (SSOT)。

---

## 實作範圍 (Scope)
1. **Header 元件簡化 (`src/components/Header.tsx`)**：
   - 移除 `brokerFeeDiscount` 與 `onChangeBrokerFeeDiscount` props。
   - 移除頂部獨立之「賣出手續費：6折/2.8折/2折/全額」下拉選單。
2. **計算引擎收斂 (`src/engine/calculator.ts`)**：
   - 移除 `calculateHoldingsAndSummary` 中全域傳入的 `brokerFeeDiscount` 參數，部位預估賣出手續費直接查詢該部位綁定之 `accountId` 或預設券商帳戶的 `discountRate` 與 `minFee`。
3. **App 狀態清理 (`src/App.tsx`)**：
   - 移除全域 `brokerFeeDiscount` state 與對應的儲存邏輯。
4. **單元測試校準 (`src/engine/calculator.test.ts`)**：
   - 更新測試呼叫簽章，確保 100% 綠燈通過。

---

## 驗收條件 (Acceptance Criteria)
- [ ] Header 不再出現「賣出手續費」單獨選單。
- [ ] 在倉部位預估賣出手續費完全由個別券商帳戶的折讓率精確試算。
- [ ] 所有單元測試 100% 通過。
