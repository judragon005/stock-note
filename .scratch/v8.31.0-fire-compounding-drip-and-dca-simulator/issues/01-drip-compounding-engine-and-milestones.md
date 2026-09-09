# Issue 01: 實作 DRIP 股利再投資複利滾雪球與被動收入里程碑引擎 (dripCompoundingEngine)

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `dividend`, `drip`, `quant`

## 任務說明
1. 建立 `src/engine/dripCompoundingEngine.ts`：
   - 定義 `DRIPProjectionPoint`、`PassiveIncomeMilestone`、`DRIPSimulationConfig` 型別。
   - 實作雙軌對比模型：
     - **情境 A（單利提領 / Cash Out）**：持股數固定，年股息全數提領，市值隨資本利得率增長。
     - **情境 B（DRIP 股息再投資）**：每年稅後股息以當期預估市價全額買進股份（支援小數點碎股），股份逐年指數放大。
     - 計算複利乘數 `compoundingMultiplier` ($NAV_{\text{DRIP}} / NAV_{\text{CashOut}}$)。
   - 實作 4 階被動收入自由度里程碑階梯：
     - Lv.1 基礎生活補貼 (月領 1 萬)
     - Lv.2 基礎生活開銷 (月領 3 萬)
     - Lv.3 寬裕品質生活 (月領 6 萬)
     - Lv.4 財務自由 FIRE (月領 10 萬)
     - 計算兩種情境各自達成年份與 DRIP 提早年數 (`yearsSaved`)。
2. 編寫完整單元測試 `src/engine/dripCompoundingEngine.test.ts`：
   - 驗證單利提領 vs DRIP 複利曲線分歧計算。
   - 驗證自訂年化資本增值率、自訂股息成長率 (DGR) 與追加定期定額投入。
   - 確保 100% 綠燈覆蓋。
