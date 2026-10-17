# 02 — 美股機構級信用金絲雀指標 (HY OAS & CDS 違約保險指數)

**Parent:** #283

**What to build:**
擴充美股機構級信用利差與違約互換風控金絲雀（High Yield OAS 利差與 CDS/CDX 違約保險指數），讓投資人於流動性緊縮與債務違約危機爆發前夕提前預警。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 擴充 `MacroIndicatorSnapshot`，新增欄位：
  - `creditSpreadOAS?: number` (高收益債期權調整利差 %，如 3.5%)
  - `cdsInsuranceIndex?: number` (CDS/CDX 債券違約保險指數點數，如 65)
  - `cdsRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'`
- [ ] `src/engine/macroAdvisorEngine.ts` 實作信用利差與違約風控位階解析函數 `evaluateCreditRisk(oas?: number, cds?: number)`。
- [ ] 當 OAS > 5.0% 或 CDS > 100 時，判定為 `HIGH` 或 `CRITICAL` 警戒。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證不同信用利差區間之風控位階與邊界相容性（無資料時優雅回退為預設值）。
