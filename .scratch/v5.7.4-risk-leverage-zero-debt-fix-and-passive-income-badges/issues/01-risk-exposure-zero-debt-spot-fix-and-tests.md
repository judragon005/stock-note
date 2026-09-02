# 原子票券 #01: 淨槓桿零負債現貨保護引擎修復與 TDD 單元測試

- **父層主票券**: [issue-0045.md](issue-0045.md)
- **狀態**: `RESOLVED`
- **分流狀態 (Triage Status)**: `ready-for-agent`
- **負責目標**: `src/engine/riskExposureEngine.ts`, `src/engine/riskExposureEngine.test.ts`


---

## 🎯 任務內容與驗收縫隙 (Test Seam)

1. **核心計算修復**：
   - 當 `totalDebtTWD === 0` 時：
     - 若 `totalAvailableCashTWD <= 0`（純記交易未補入金），將 NAV 視為足額現貨持有市值（$\text{NAV} = \text{totalStockValueTWD}$），槓桿固定輸出為 `1.00x`，風險等級為 `CONSERVATIVE`（穩健無槓桿），杜絕誤判為 `99.99x 極度危險`。
     - 若 `totalAvailableCashTWD > 0`，正常計算 $\text{NAV} = \text{股票現值} + \text{現金}$，$\text{Net Leverage} \le 1.00x$。
   - 當 `totalDebtTWD > 0` 且 $\text{NAV} \le 0$ 時，維持 `99.99x` 與 `HIGH_RISK` 資不抵債警告。
2. **單元測試 (TDD)**：
   - 在 `src/engine/riskExposureEngine.test.ts` 中新增：
     - 測試案例：零借貸負債、現金為負（未補入金）、美股現貨持有，預期 `netLeverage === 1.0` 且 `riskTier === 'CONSERVATIVE'`。
     - 測試案例：零借貸負債、現金為正，預期 `netLeverage < 1.0`。
     - 測試案例：有借貸負債且資不抵債，預期 `netLeverage === 99.99` 且 `riskTier === 'HIGH_RISK'`。
