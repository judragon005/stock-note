# 06 — 持倉成本防線、交易初衷 (intent) 差異化體檢與全市場持股專屬光環

**Parent:** #418 (Spec 0217: 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級規格)

**What to build:**
升級持倉體檢與星圖泡泡表現層：
1. 將 `HoldingPosition` 的 `avgCost`、`unrealizedPnLPercent`、`portfolioWeightPercent`、`intent` (`DIVIDEND` vs `SWING`) 與 `isBagHolding` 注入泡泡屬性。
2. 在全市場焦點模式下，為使用者自持標的繪製金色雙環外圈與 `★ 持股` 角標。
3. 在 Tooltip 頂部展示持倉防線膠囊：`部位權重 % | 成本均價 | 未實現損益 %`。
4. 意圖感知診斷：`DIVIDEND` 存股部位落入左下賣超區時，顯示「🌱 存股回檔（殖利率提升，可評估左側佈局）」；`SWING` 波段部位水下套牢且法人倒貨時，顯示「🚨 波段套牢+主力棄守（嚴防凹單）」。

**Blocked by:** 03 — 座標映射統一、Y 軸分母保護與時序「象限躍遷 (Quadrant Crossover)」轉折捕捉, 05 — 前端三級瀑布流真實資料管線與 100% Zero-Mock 假資料清洗

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 全市場模式下能一眼辨認自有持股與外部股票。
- [ ] 存股標的落入賣超區不再彈出恐慌停損文案，波段凹單標的精確拉響警報。
- [ ] 泡泡半徑在持倉模式 100% 依 `holdingValueTwd` 決定，徹底杜絕高價零股變巨球缺陷。
- [ ] `smartMoneyEngine.test.ts` 新增意圖感知診斷測試並 100% 綠燈。

