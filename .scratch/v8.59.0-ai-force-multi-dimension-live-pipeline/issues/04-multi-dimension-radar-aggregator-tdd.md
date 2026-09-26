# 04 — Card 03 多維度判讀：總合成器與等級判定 (TDD)

**What to build:**
在 `src/engine/multiDimensionRadarEngine.ts` 匯出 `calculateMultiDimensionRadar()` 主函式：
1. **聚合 6 軸分數**：
   - 呼叫 Ticket 01~03 之 6 個子函式。
   - 計算 `overallScore = Math.round((institutional + trend + chips + liquidity + volatility + momentum) / 6)`。
2. **綜合等級判定 (`overallGrade`)**：
   - `>= 80`: `'A'`
   - `>= 65`: `'B'`
   - `>= 50`: `'C'`
   - `< 50`: `'D'`
3. **安全邊界與回退**：
   - 當傳入之 `candles` 長度不足 5 根時，回傳預設 50 分中性數值，確保絕不回傳 `NaN`。

**Blocked by:** Ticket 01, Ticket 02, Ticket 03

**Status:** completed

- [x] 正確聚合 6 軸分數並產出符合 `MultiDimensionRadarData` 契約之物件
- [x] 綜合評分 >= 80 正確對應等級 'A'
- [x] 綜合評分 < 50 正確對應等級 'D'
- [x] 空資料或邊界輸入時具備防呆機制
- [x] 單元測試 100% 綠燈
