# Issue 02: 實作 4 階被動收入自由度里程碑與連續線性插值演算法

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `drip`, `milestones`, `precision`

## 任務說明
1. 在 `src/engine/dripCompoundingEngine.ts` 中實作里程碑判定：
   - 內建 4 大階梯：
     - Tier 1（基礎水電雜支）：月領 NT$ 10,000 (年領 12 萬)
     - Tier 2（基礎日常開銷）：月領 NT$ 30,000 (年領 36 萬)
     - Tier 3（寬裕生活品質）：月領 NT$ 60,000 (年領 72 萬)
     - Tier 4（財務自由 FIRE）：月領 NT$ 100,000 (年領 120 萬)
     - Tier Custom（使用者自訂月支出目標）
   - 連續線性插值演算法：
     - 若月被動收入在第 $t-1$ 年至第 $t$ 年跨越目標金額，計算連續精確小數年：
       $$\text{Year} = (t - 1) + \frac{T - \text{Income}_{t-1}}{\text{Income}_t - \text{Income}_{t-1}}$$
     - 分別計算 Cash Out 達成年與 DRIP 達成年。
     - 計算提早達成年數 `yearsSaved`。
     - 若至期末皆未達成，安全回傳 `null`。
2. 擴充單元測試 `src/engine/dripCompoundingEngine.test.ts`：
   - 驗證線性插值在不同增長率下的精確小數點數值（例如 7.4 年）。
   - 驗證當初始資產極大時（當前已達成），`isCurrentlyAchieved: true` 且 `yearsSaved: 0`。
   - 驗證在超高目標（永不達標）情境下安全返回 `null`。
