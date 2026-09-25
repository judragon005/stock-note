# 02 — 頂部即時行情總覽 Bar 與狀態警示呼吸燈

**What to build:**
實作頂部深藍色行情總覽列，展示今日收盤價、漲跌額、漲幅百分比、成交量（張）、成交筆數、開盤價、最高價、最低價、最新交易日、資料筆數，以及左側 4 大系統狀態警示燈號（AI SCAN ACTIVE、MAIN FORCE TRACKING、MARKET STATUS、VOLATILITY ALERT）。

**Blocked by:**
01 — 核心型態定義與工作區導航註冊

**Status:** completed

- [x] 依據標的與最新交易日，正確渲染開高低收量與筆數
- [x] 支援台股紅漲綠跌或美股反向之動態配色規則
- [x] 正確渲染 4 大狀態呼吸燈與徽章樣式
- [x] 單元測試覆蓋行情解析與數值格式化邏輯
