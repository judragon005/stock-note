# 01 — 擴充關鍵財經催化劑型別契約與多維度標記 (src/types/macro.ts)

**Parent:** #281

**What to build:**
擴充 `UpcomingCatalyst` 型別與類別定義，納入券商與法人關注之衝擊度、目標市場、關聯標的與使用者自訂標記：
1. `CatalystCategory` 納入 `'CENTRAL_BANK' | 'INFLATION' | 'EMPLOYMENT' | 'EARNINGS_DIVIDEND' | 'DERIVATIVE_SETTLEMENT' | 'CUSTOM'`。
2. `UpcomingCatalyst` 新增欄位：
   - `impact: 'HIGH' | 'MEDIUM' | 'LOW'` (衝擊度等級)
   - `targetMarket?: 'ALL' | 'TW' | 'US'` (影響市場)
   - `symbol?: string` (關聯個股，如 2330.TW)
   - `isCustom?: boolean` (是否為使用者自訂手動新增)
   - `sourceUrl?: string` (官方來源外鏈，如 TWSE 或 MOPS)
3. 確保 `calculateUpcomingCatalysts()` 在計算天數時能完整保留上述擴充欄位並維持向後相容。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 導出完整的 `CatalystCategory`、`CatalystImpact` 與更新後的 `UpcomingCatalyst` 介面。
- [ ] `calculateUpcomingCatalysts()` 能處理帶有 `impact` 與 `targetMarket` 之事件物件且型別檢查 0 報錯。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證擴充屬性在計算倒數天數時無損透傳。
