# Subtask 01: P1-01 加權平均持股天數與 P1-02 浮點剩餘差額扣除法

- **父任務**：[issue-0036.md](issue-0036.md)
- **狀態**：`READY_FOR_DEV`
- **分流標籤**：`ready-for-agent`
- **優先級**：`P1`

## 任務目標
1. 於 `src/engine/lotEngine.ts` 的 `MOVING_AVERAGE` 賣出沖銷邏輯中：
   - 計算賣出時在庫在席所有 Lots 之加權平均買進日與加權持有天數 $\bar{D} = \text{round}\left( \sum \frac{S_i}{S_{total}} \times D_i \right)$。
   - `disposal.buyDate` 設為包含加權資訊之描述，`holdingDays` 賦值 $\bar{D}$，`isLongTerm` 依 $\bar{D} \ge 365$ 精確判定。
2. 修正 Lot 比例扣減：
   - 前 $k-1$ 個 Lot 依比例扣除，最後一個在席 Lot 採用「剩餘差額法 (`soldShares - sumPrevDeducted`)」，確保扣減總和 100% 等於實際賣出股數，消除浮點誤差。
