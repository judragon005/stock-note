# 迭代主票券: v5.6.0 法定國定假日休市日曆與精確交割結算引擎 (Statutory Holiday Calendar & Settlement Precision Engine)

- **關聯 PRD**: [docs/specs/0040-statutory-holiday-calendar-and-settlement-engine.md](../../docs/specs/0040-statutory-holiday-calendar-and-settlement-engine.md)
- **關聯技術債**: [docs/debts/0006-statutory-holiday-calendar-and-settlement-precision.md](../../docs/debts/0006-statutory-holiday-calendar-and-settlement-precision.md)
- **版本**: v5.6.0
- **分流狀態 (Triage Status)**: `COMPLETED` (全數完工驗收完畢)

---

## 🎯 迭代目標
解決現行 `cashLedgerEngine.ts` 中 `calculateSettlementDate` 僅過濾週末、導致台股春節封關（連續休市 7~11 天）、國定假日與美股 10 大聯邦休市日期間交割扣款日在途款提前結算的財務時態失真問題。建立 100% 離線優先、高效能 ($O(1)$) 的台美雙市場休市日曆模組，全面提升現金帳本交割與購買力之底層會計精確性。

---

## 📋 任務拆解看板 (Task Breakdown Board)

| 票券編號 | 任務名稱 | 預估工時 | 分流標籤 | 狀態 | 驗收結果 |
| :---: | :--- | :---: | :---: | :---: | :---: |
| [**#01**](01-holiday-calendar-engine-and-unit-tests.md) | 台美雙市場法定休市日曆常數表與純函式查詢模組開發 | 1.0h | `ready-for-agent` | `RESOLVED` | ✅ 內建 2023~2030 年台美雙市場休市日曆，11 項單元測試 100% 綠燈 |
| [**#02**](02-cash-ledger-settlement-precision-and-regression-tests.md) | 現金帳本交割計算引擎升級與長假在途款邊界測試 | 1.0h | `ready-for-agent` | `RESOLVED` | ✅ 升級交割營業日推算，補齊春節封關/美股節日在途款邊界測試，251 測試綠燈 |
