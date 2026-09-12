# 09 — Industry Gate & Cyclical Guard Engine

**What to build:**
實作產業屬性判定與隔離閘門模組 `src/engine/industryGate.ts`。
1. 識別金融保險業（台股 28XX 或產業標籤含有 Financials/Banking），自動停用負債比與存貨週轉指標，改以 ROE、ROA、淨利年增率與配息評估，徹底杜絕假陽性垃圾警報。
2. 識別強週期景氣循環類股（航運、記憶體、鋼鐵、塑化），當單季獲利達歷史高峰時強制觸發「景氣高點反轉警語」，防範倒後鏡追高。

**Blocked by:** 01-financial-types-and-schema.md

**Status:** ready-for-agent

- [x] 實作 `isFinancialIndustry(symbol: string, sector?: string): boolean`
- [x] 實作 `isCyclicalIndustry(symbol: string, sector?: string): boolean`
- [x] 實作針對金融業指標的動態遮罩與權重重分配
- [x] 單元測試驗證中信金 (2891) 不觸發負債比警報、長榮 (2603) 高峰觸發週期警語
