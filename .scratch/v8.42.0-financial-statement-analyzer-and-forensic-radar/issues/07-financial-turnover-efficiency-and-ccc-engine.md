# 07 — Turnover Efficiency & Cash Conversion Cycle (CCC) Engine

**What to build:**
實作營運效率計算模組 `src/engine/financialTurnoverEngine.ts`。季度化計算應收帳款週轉天數 (DSO)、存貨週轉天數 (DIO) 與現金轉換週期 ($CCC = DSO + DIO - DPO$)。追蹤近 8 季的週轉天數變動趨勢，作為塞貨與滯銷的領先指標。

**Blocked by:** 01-financial-types-and-schema.md

**Status:** ready-for-agent

- [x] 實作季度化 DSO、DIO 與 CCC 純計算函式
- [x] 實作連續 4~8 季天數變動率檢驗（例如 DSO 連續上升 > 20 天）
- [x] 當 CCC 為負數時標註「具備強大上下游議價話語權」優質特徵
- [x] 單元測試驗證零存貨服務業、零應收現銷模式的邊界容錯
