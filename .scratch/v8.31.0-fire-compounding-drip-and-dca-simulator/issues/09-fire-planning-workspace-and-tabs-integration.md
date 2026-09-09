# Issue 09: 開發 FIRE 退休與複利工作台主面板並整合工作台導航

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `ui`, `workspace`, `navigation`, `integration`

## 任務說明
1. 建立 `src/components/FirePlanningWorkspace.tsx`：
   - **頂部 4 大核心 KPI 看板**：
     - 🎯 預估自由達成年（DRIP vs Cash Out 提早年數）
     - ⚡ 股息複利增益倍數（Multiplier 與多賺金額）
     - 🛡️ 30 年退休存活率（蒙地卡羅成功率與安全提領率 SWR）
     - ⚠️ 未來 30 天 DCA 交割防透支狀態（安全充裕 vs 紅燈資金缺口）
   - **3 大子分頁切換**：
     - 子分頁 1：📈 DRIP 複利滾雪球與里程碑階梯
     - 子分頁 2：🎲 蒙地卡羅 FIRE 模擬與錐形圖
     - 子分頁 3：📅 定期定額 DCA 排程與交割防透支
   - **參數調節抽屜面板**：
     - 每月定投金額、年化增值率、股息殖利率、DGR、通膨率、年支出生活費。
2. 整合工作台標籤頁與主應用：
   - 在 `src/components/WorkspaceTabs.tsx` 中加入 `fire` 頁籤（🏖️ 退休與複利飛輪）。
   - 在 `src/App.tsx` 中掛載 `FirePlanningWorkspace`，注入既有持倉、現金帳本與波動率數據。
3. 嚴格對齊全站深色 Glassmorphism 風格與中英雙語懸停 Tooltips。
