# Issue 06: 主力戰情室主引擎湖倉資料整合與美股微觀量價指標計算

- **層級**: 核心引擎 / 美股微觀結構
- **關聯規格**: Spec 0237 Ticket 6 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 於 `src/engine/aiForceDashboardEngine.ts` 接收並聚合 `sblBalance`、`marginBalanceChange`、`pledge`、`etfNav` 與 `corporateActions`。
2. 拔除 `createDefaultAiForceReport` 寫死之假法人張數與 Card 20 ETF 假 420 億模板。
3. 計算美股微觀量價 4 大指標 (`usMicroMetrics`: RVOL, VWAP Bias, MFI, ATR) 與 10 日 OBV Sparkline。
