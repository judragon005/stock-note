# 09 — Actionable Trade Matrix Core Data Builder

**What to build:** 
整合前述運算結果，實作 `buildActionableTradeMatrix`。將當前價格、第一壓力帶（減碼區）、次級阻力位（續強觀察）、短線動態防守（ATR 吊燈或 20MA 取高者）、結構底線（箱底或支撐帶）組合成結構化的實戰交易階梯物件 `ActionableTradeMatrix`。

**Blocked by:** 04 — Wilder ATR(14) & Chandelier Dynamic Trailing Exit Engine, 05 — Key Level Proximity Clustering Algorithm

**Status:** ready-for-agent

- [x] 型別定義新增 `ActionableTradeMatrix`、`TradeLevel` (含價格、名稱、理由、與現價距離%)
- [x] 實作純函式 `buildActionableTradeMatrix`
- [x] 單元測試驗證階梯價位排序合理性與防呆邊界
