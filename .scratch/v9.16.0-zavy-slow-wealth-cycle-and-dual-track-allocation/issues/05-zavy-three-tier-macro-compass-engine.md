# Ticket 05: Zavy 三級總經週期羅盤引擎實作

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 建立 `src/engine/zavySlowWealthEngine.ts`：
   - 定義 `ZavyCycleStage`、`ZavyMacroCompass` 等型別契約。
   - 內建至 2026/10 稽核基準庫（台灣 PMI 新訂單/存貨、美國 ISM PMI 新訂單/存貨、失業金、通膨）。
   - 實作 `evaluateMacroCompass` 純函式：解讀 30 年通膨/生產力潮汐、7-10 年商業週期、2-4 年製造業庫存週期；對照「台灣小車 vs 美國大卡車」領先傳導，並標示 `As-Of` 逾期提示。

## Acceptance criteria
- [x] 單元測試驗證製造業擴張期、分歧期與收縮期之正確定調。
- [x] 嚴格區分客戶存貨與製造商存貨，杜絕數據混淆。
