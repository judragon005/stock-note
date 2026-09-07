# 任務 03: 美股時序軌跡 CMF 注入與淨流向金額修復

- **狀態**: `completed`
- **優先級**: P0
- **完成說明**: 美股 netFlowAmount 已修正為 cmf * 1000000 * price，且時序軌跡動態注入 cmf 與金額。
- **目標**:
  1. 修復 `ChipsWorkspace.tsx` 持倉模式中美股 `netFlowAmount` 計算，改採 `cmf * volume * currentPrice * factor`，不再乘以 `twseData?.totalNetShares`。
  2. 在美股 `historicalDailyFlows` 注入動態 `cmf`，使時序播放時 VT 能動態呈現真實的機構資金走勢。
