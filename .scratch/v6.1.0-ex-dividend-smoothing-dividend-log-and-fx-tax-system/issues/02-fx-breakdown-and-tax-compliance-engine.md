# Ticket #02: 外匯損益獨立拆解與二代健保/海外所得稅階預警引擎 (TDD)

## 🎯 任務目標 (對應技術債 #0011)
實現美股外匯匯差與股票本體價差雙軸獨立拆解引擎 `src/engine/fxBreakdown.ts`，並於 `src/engine/taxComplianceEngine.ts` 實現台股二代健保 (20,000 元/2.11%) 預警與美股海外所得 (100萬申報/750萬免稅額) 稅階進度引擎。

---

## 🛠️ 實作要點
1. **外匯損益拆解引擎** (`src/engine/fxBreakdown.ts`)：
   - 股票本體損益 (TWD)：`shares * (currentPriceUSD - avgCostUSD) * currentFxRate`
   - 外匯匯差損益 (TWD)：`totalCostUSD * (currentFxRate - costFxRate)`
   - 確保：`assetGainTWD + fxGainTWD === totalUnrealizedPnLTWD` (零精度誤差)。
2. **稅務合規預警引擎** (`src/engine/taxComplianceEngine.ts`)：
   - `checkTwNhiTaxAlert(dividendRecord | receivableDividend)`：若單筆現金股利 $\ge \text{NT\$} 20,000$，標註觸發 2.11% 補充保費與預估扣費。
   - `calculateOverseasIncomeProgress(trades, currentYear, exchangeRate)`：統計當年度美股已實現價差與已領股息合計，計算 100 萬申報門檻與 750 萬最低稅負進度百分比。
3. **測試驅動開發 (TDD)**：
   - 編寫 `src/engine/fxBreakdown.test.ts` 與 `src/engine/taxComplianceEngine.test.ts`。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 美股本體與匯差拆解之和與台幣總損益 100% 精確相等。
- [ ] 二代健保單筆 $\ge 20,000$ 判定精準。
- [ ] 海外所得門檻跨年度統計精確，百分比與警戒狀態正確。
