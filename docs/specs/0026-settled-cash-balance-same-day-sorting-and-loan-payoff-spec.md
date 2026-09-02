# 產品需求規格書 (PRD)：實質已交割可用現金隔離、同日金流雙向時間軸排序與質押設質規費還款總額整併 (SPEC-0026)

## 📌 問題陳述 (Problem Statement)

在多券商現金帳本與股票質押借款模組中，經實際對帳與使用者操作反饋發現以下關鍵問題：
1. **可用現金餘額提早計入未來款項**：`calculateAccountBalances` 引擎原先將所有流水無條件累加，造成「未來尚未發放的股息（如 2026-10-01 泰銘股息）」與「T+2/T+1 待交割在途買進款（如 2026-08-25 買進、2026-08-27 交割）」提早計入交割戶當前可用現金餘額，導致可用餘額虛增或與銀行實際交割戶不一致。
2. **同日金流於「新 ➔ 舊」排序模式下順序顛倒**：在「新 ➔ 舊 (Newest to Oldest)」排序模式下，當同一天發生股息入帳（早先發生）與買進再投資交割扣款（後續發生）時，舊邏輯固定將股息入帳排在最上方，導致由上而下的時間軸與「新 ➔ 舊」規則矛盾。
3. **預扣稅費被歸類為「其他」徽章**：流水帳表格中各類美股或台息預扣稅被渲染為灰色「其他」徽章，缺乏清晰可辨識的稅費專屬樣式。
4. **質押借款還款總額重複計算設質規費且佈局分散**：
   - 股票質押的「當前應還款總金額」原先未納入設質三大規費（撥券費、設質登記費、手續費），後續加入時因判斷邏輯不當導致規費被重複加總兩次（如 $54 + $54 = $108）。
   - 設質三大規費原外掛於下方獨立黃色框中，導致質押借款卡片視覺結構零散。

---

## 🎯 解決方案 (Solution)

1. **實質已交割可用現金（Settled Cash Balance）精準隔離**：
   - `calculateAccountBalances` 僅累計 `date <= todayStr` 且 `settlementStatus !== 'PENDING'` 之已到期交割款。
   - 引入 `pendingSettlementAmount`（在途待交割/未來款項合計）與 `projectedBalance`（預計在途交割後淨餘額）。
   - 在券商交割戶卡片上，若存在在途款項，即時呈現黃色「在途待交割」標籤與「預估交割後餘額」。
2. **同日金流雙向動態時間軸排序（Bidirectional Same-Day Ordering）**：
   - 在「新 ➔ 舊 (DESC)」模式下：當天後發生的流出/交割扣款排在上方（較新），先發生的流入/股息入帳排在下方（較舊）。
   - 在「舊 ➔ 新 (ASC)」模式下：當天先發生的流入/股息入帳排在上方（較舊），後發生的流出/交割扣款排在下方（較新）。
3. **正名專屬「🧾 預扣稅費」徽章**：
   - 將 `TAX` 類別或備註含預扣稅之流水項目，統一渲染為玫瑰粉專屬徽章「🧾 預扣稅費」，並納入手續費/利息/稅費分類篩選。
4. **質押設質三大規費防重複計算與黑底卡片深度整併**：
   - `calculateLoanInterestAndPayoff` 精準計算三大規費總和（優先取細項之和，無細項則取 `pledgeFee`，杜絕重複加總）。
   - 還款總額公式：$$\text{應還款總金額} = \text{未還本金} + \text{當前應計利息} + \text{設質三大規費}$$
   - 將「設質三大規費」完整整併進「利息」與「應還款總金額」所在的黑色核心卡片內。

---

## 📋 使用者故事 (User Stories)

1. **交割戶實質現金不被未來事件虛增**：身為投資人，當我查詢永豐大戶投可用餘額時，尚未到期的 10 月股息不會被提早計入，且待交割款清晰標註為在途款項與預估交割後餘額。
2. **符合直覺的時間軸瀏覽**：身為使用者，在「新 ➔ 舊」檢視下，當天後發生的再投資買進扣款呈現在最上方，先發生的股息入帳在下方，符合由上而下的時間流向。
3. **質押結清金額精準且視覺整齊**：身為質押借款人，我能在一張黑色卡片內同時看到本金、計息、設質三大規費與最終應還款總金額，數值完全吻合券商還款扣款帳單。

---

## 🛠️ 實作決策 (Implementation Decisions)

### 1. 現金餘額與在途款計算引擎 ([src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts))
- `AccountBalanceSummary` 擴充 `pendingSettlementAmount` 與 `projectedBalance`。
- `calculateAccountBalances` 引入 `isFutureEvent = tx.date > todayStr` 與 `isPendingSettlement = tx.settlementStatus === 'PENDING' || tx.settlementDate > todayStr` 分流。

### 2. 質押利息與還款總額計算 ([src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts))
- `calculateLoanInterestAndPayoff` 修正 `pledgeFees` 邏輯：
  ```ts
  const pledgeFees = (loan.transferFee !== undefined || loan.pledgeRegistryFee !== undefined || loan.handlingFee !== undefined)
    ? ((loan.transferFee || 0) + (loan.pledgeRegistryFee || 0) + (loan.handlingFee || 0))
    : (loan.pledgeFee || 0);
  const totalPayoffAmount = principal + accruedInterest + pledgeFees;
  ```

### 3. 前端工作區渲染優化 ([src/components/CashLedgerWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx))
- `filteredTransactions` 實作依 `sortOrder` 雙向判定同日優先級：
  ```ts
  return sortOrder === 'DESC' ? prioB - prioA : prioA - prioB;
  ```
- `renderCategoryBadge` 支援 `TAX` 與預扣稅關鍵字渲染。
- 借貸卡片移除獨立黃框，將設質三大規費以虛線分隔整併於黑色卡片中間。

---

## ✅ 驗收條件 (Acceptance Criteria)

1. **AC-1 (實質交割餘額過濾)**：未來日期（`date > 今天`）與待交割狀態（`PENDING`）之款項不計入 `balance`。
2. **AC-2 (在途款與預估餘額呈現)**：當帳戶存在待交割款時，帳戶卡片顯示「在途待交割」黃色標籤與「預估交割後餘額」。
3. **AC-3 (同日新舊排序正確)**：在「新 ➔ 舊」檢視下，同日買進交割扣款排在股息入帳上方；切換為「舊 ➔ 新」時股息入帳排在買進扣款上方。
4. **AC-4 (預扣稅費專屬徽章)**：預扣稅相關流水呈現玫瑰粉「🧾 預扣稅費」徽章。
5. **AC-5 (質押還款總額公式無重複計算)**：左側卡片本金 $495,000 + 利息 $1,519 + 規費 $54 應等於 $496,573，設質三大規費整併於黑底卡片中。
6. **AC-6 (測試與建置 100% 綠燈)**：148 項單元測試全數通過，`npm run build` 0 錯誤。
