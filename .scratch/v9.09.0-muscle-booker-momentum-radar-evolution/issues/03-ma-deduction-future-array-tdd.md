# 03 — 均線扣抵望遠鏡未來 3 日陣列均值預判 (MA Deduction Array TDD)

**What to build:**
升級 `calculateMaDeduction`，解決現行僅用單日 20 天前價格比對產生的「近視鏡假翻揚」嚴重盲點：
1. 取出未來 3 日即將扣抵的歷史 K 線陣列：`candles.slice(len - 22, len - 19)`。
2. 計算未來 3 日扣抵的最高價格與平均價格：
   - 只有當現價高於未來 3 天即將扣抵的最高值時，才判定均線具備持續助漲動能 (`ma20Slope: 'UP'`)。
   - 若未來 3 天將扣抵歷史高價天花板，且現價低於扣抵均值，判定為均線即將下彎壓頂 (`ma20Slope: 'DOWN'`)。
3. 撰寫單元測試覆蓋「扣抵低檔助漲翻揚」與「扣抵天價即將下彎壓頂」的預判邏輯。

**Blocked by:** Ticket 02

**Status:** open

- [x] 升級 `calculateMaDeduction` 抓取未來 3 日扣抵價格陣列
- [x] 依未來 3 日扣抵均值與極值動態判定 `ma20Slope`
- [x] 在回傳物件中擴充 `futureDeductions: number[]` 供 UI 預測展示
- [x] 編寫單元測試驗證扣抵高低檔情境下的翻揚/下彎準確性

