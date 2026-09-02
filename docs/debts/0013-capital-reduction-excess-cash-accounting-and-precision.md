# 技術債 #0013: 現金減資超額退款轉列已實現利得與美股碎股精度收斂 (Capital Reduction Excess Cash & Fractional Shares Precision)

- **狀態**：`RESOLVED` (已於 v5.2 / ADR #0034 解決)
- **優先級**：`P1`
- **發現來源**：證券核心系統與交易員深度審查 (Trader & Quant Audit)
- **建立日期**：2026-08-26
- **標籤**：`Accounting` · `Precision` · `Engine` · `Corporate-Action`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統於 `src/engine/calculator.ts` 中處理現金減資退款代碼如下：
```typescript
const refund = cashAmount > 0 ? cashAmount : (price > 0 && finalReduced > 0 ? finalReduced * price : 0);
if (refund > 0) {
  item.totalCapitalReturned += refund;
  item.totalCostBasis = Math.max(0, item.totalCostBasis - refund);
}
```

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **現金減資超額退款被吞噬 (Accounting Anomaly)**：若某檔持股經歷長期配息或多次減資後，庫存成本僅剩 2,000 元，但本次現金減資退款 3,000 元，現行 `Math.max(0, totalCostBasis - refund)` 會將成本歸零，但**多出的 1,000 元現金直接消失**，未計入已實現利得，造成整戶投資總損益短少。
  2. **美股小數點碎股浮點數精度漂移**：美股支援 0.0001 股碎股，原生 JavaScript 在多次加減運算時會產生 IEEE 754 浮點數微幅漂移（如 `0.30000000000000004`）。
* **暫緩理由**：
  1. 一般台股現金減資退款金額很少超過總持倉成本，常態情境下不影響損益計算。
  2. 需增補邊界測試案例，待統一進行引擎精度加固時一併修復。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **修正減資超額退款邏輯**：
   ```typescript
   if (refund > 0) {
     item.totalCapitalReturned += refund;
     if (refund > item.totalCostBasis) {
       const excessGain = refund - item.totalCostBasis;
       item.realizedPnL += excessGain;
       item.totalCostBasis = 0;
     } else {
       item.totalCostBasis -= refund;
     }
   }
   ```
2. **美股股數強制萬分位收斂**：
   - 封裝 `roundFractionalShares(shares: number): number => Math.round(shares * 10000) / 10000`。
3. **擴充單元測試**：
   - 在 `src/engine/calculator.test.ts` 新增「超額退款自動計入已實現損益」之邊界測試。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組修復：
1. 使用者登錄高額現金減資退款且超過持倉成本基準時。
2. 進行 P1 階段會計引擎加固時主動修復。
