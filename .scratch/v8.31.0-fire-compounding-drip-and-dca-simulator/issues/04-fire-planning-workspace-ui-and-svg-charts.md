# Issue 04: 實作 FIRE 退休與複利飛輪工作台介面與原生 SVG 圖表 (FirePlanningWorkspace)

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `workspace`, `svg`, `fire`

## 任務說明
1. 建立 `src/components/FirePlanningWorkspace.tsx`：
   - 頂部 KPI 卡片看板：
     - 🎯 財務自由達成年（DRIP 模式 vs 提領模式）
     - ⚡ 股息複利增益倍數（Multiplier）
     - 🛡️ 蒙地卡羅退休存活率（30 年成功率）
     - ⚠️ 未來 30 天 DCA 扣款防透支狀態標籤
   - 原生 SVG 雙軌曲線對比圖表（DRIP 模式 vs Cash Out 模式資產曲線）。
   - 原生 SVG 蒙地卡羅百分位數資產錐形圖 (Fan Chart, P10~P90 擴散陰影區間)。
   - 未來 30 天 DCA 扣款排程清單與帳戶餘額警示條。
   - 互動式參數滑桿/輸入框：每月定投額、預期年化報酬率、通膨率、生活費目標。
2. 整合工作台導航：
   - 更新 `src/components/WorkspaceTabs.tsx`，加入 `fire` 標籤頁（🏖️ 退休與複利飛輪）。
   - 更新 `src/App.tsx` 串接 `FirePlanningWorkspace` 並傳遞持倉、現金餘額與波動率數據。
3. 驗證 UI 自適應主題與極致 Glassmorphism 視覺風格。
