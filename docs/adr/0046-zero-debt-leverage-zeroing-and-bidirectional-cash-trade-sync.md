# ADR 0046: 零負債槓桿歸零、利息膠囊券商聚合與預扣稅分離、流水帳股息雙向同步全域連動 (Zero-Debt Leverage Zeroing, Broker Interest Aggregation & Bidirectional Cash-Trade Sync)

## 狀態 (Status)
**已接受 (ACCEPTED)**

## 背景與問題 (Context & Problem Statement)
在現貨投資與多幣別現金流水帳本日常使用中，發現三大關鍵體驗與架構問題：
1. **零負債現貨槓桿顯示 0.97x**：當使用者無任何借款負債且持有閒置現金時，公式算出的 0.97x 容易讓人誤解為借貸槓桿。
2. **利息膠囊多月份分裂與預扣稅未區分**：利息備註包含不同月份區間造成膠囊過多；股票股息與現金利息之預扣稅未分開統計。
3. **流水帳股息手動修改與 Trade 數據脫鉤**：使用者發現券商實際入帳金額與自動計算不符時，在流水帳修改無法雙向回寫原始 Trade，導致損益與現金水位計算不同步。

## 決策 (Decision)
1. **槓桿計算歸零**：在 `riskExposureEngine.ts` 中，當 `totalDebtTWD === 0` 時，槓桿率直接評定為 `0.00x`，只有存在實質負債時才計算槓桿比率。
2. **利息依券商帳戶聚合**：在 `aggregateInterestIncomeDetails` 中改以券商帳戶與幣別為 Key 聚合多筆利息，並提供 `aggregateWithholdingTaxDetails` 獨立計算利息預扣與股息預扣。
3. **雙向連動與全域即時重算**：在 `CashLedgerWorkspace` 與 `App.tsx` 中建立雙向同步機制，編輯 `tx-auto-*` 時同步更新 Trade 資料表，透過 React 頂層狀態流自動驅動 NAV、現金水位與被動收益即時重算。

## 後果與影響 (Consequences)
- **正面影響**：
  - 現貨投資人介面清爽直覺，徹底告別 0.97x 的槓桿困惑。
  - 被動收益卡片排版精簡，稅額來源一清二楚。
  - 對帳單金額可隨時手動微調校正，系統數據與券商 100% 吻合。
- **負面影響/代價**：
  - 流水帳編輯邏輯需處理 `relatedTradeId` 的關聯維護，增加了狀態同步的單元測試覆蓋要求。
