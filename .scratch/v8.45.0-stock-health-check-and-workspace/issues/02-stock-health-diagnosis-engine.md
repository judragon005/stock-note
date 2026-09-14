# 02 — 股票健診純運算引擎與 21 項指標 TDD 單元測試 (Stock Health Diagnosis Engine & TDD)

**What to build:**
實作 `src/utils/stockHealthDiagnosis.ts` 純運算診斷引擎與 `src/utils/stockHealthDiagnosis.test.ts` 測試套件。
嚴格覆蓋：
1. **排除地雷股健診 (6 項)**：FCF 5 年 3 年正、FCF 5 年平均正、CFO/淨利比 5 年 3 年 > 100%、CFO/淨利比 5 年平均 > 100%、DSO/DIO 同期比對，以及金融股自動豁免。
2. **定存股健診 (5 項)**：近一年殖利率 > 6%、近五年殖利率 > 6%、連續五年配息、配息發放率 5 年 3 年 > 50%、5 年平均 > 50%。
3. **成長股健診 (4 項)**：毛利 YoY > 0、營業利益 YoY > 0、稅前淨利 YoY > 0、稅後淨利 YoY > 0。
4. **便宜股健診 (6 項)**：PE 5 年區間最低 20%、PE 低於 5 年歷史中位數、PB 5 年區間最低 20%、PB 低於 5 年歷史中位數、殖利率指標連動。

**Blocked by:** Ticket 01

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #55

- [x] 先紅 (Red)：撰寫 `stockHealthDiagnosis.test.ts`，測試 4 大健診 21 項指標極限邊界與豁免
- [x] 後綠 (Green)：實作 `computeStockHealthDiagnosis()` 純運算函式
- [x] 支援金融股自動豁免（`industryAttribute === 'FINANCIALS'`）
- [x] 支援數據不足時的自適應判定（歷史不滿 5 年的降級與等比折算）
- [x] 單元測試 100% 綠燈通過
