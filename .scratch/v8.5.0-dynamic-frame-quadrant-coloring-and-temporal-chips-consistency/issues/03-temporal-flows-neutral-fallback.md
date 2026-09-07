# 任務 03: 時序歷史流向數據缺損平滑 Fallback

- **狀態**: `completed`
- **優先級**: P1
- **完成說明**: baseFlow fallback 已修正為 0，避免在資料未命中時偽造下跌股票的倒貨負向位移。
- **目標**:
  1. 在 `ChipsWorkspace.tsx` 中，若 `twseData` 缺損，`baseFlow` 不以 `(todaysPnLPercent)/5` 倒貨偽造，改採中立零軸平滑推移。
  2. 確保真實法人資料加載前，標的平穩落在中軸，不隨意墜入第三象限。
