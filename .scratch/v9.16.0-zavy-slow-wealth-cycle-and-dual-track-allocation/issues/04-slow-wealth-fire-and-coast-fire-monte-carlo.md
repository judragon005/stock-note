# Ticket 04: 慢富 30 倍年支出、Coast-FIRE 與蒙地卡羅順序風險

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 擴充 `src/engine/monteCarloFireEngine.ts`：實作 `calculateSlowWealthFireMetrics` 純函式，輸出 30 倍年支出目標（`3.33%` 提領率）、Coast-FIRE 滑行退休今日門檻，以及純股現況 vs 股債金防彈衣組合之前 10 年順序風險破產率對比。
2. 重構 `src/components/FirePlanningWorkspace.tsx`：將真實現金餘額注入，消除 `50_000` 元硬編碼。

## Acceptance criteria
- [x] 正確計算 30 倍年支出與 Coast-FIRE 所需今日啟動資金。
- [x] 雙軌蒙地卡羅模擬正確展示防彈衣資產在初期大跌時對破產率的壓制效果。
- [x] 消除 FIRE 頁面 50,000 元硬編碼。
