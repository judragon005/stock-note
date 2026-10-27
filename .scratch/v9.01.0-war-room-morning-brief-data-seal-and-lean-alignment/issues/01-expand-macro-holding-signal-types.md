# 01 — 擴充 MacroHoldingSignalInput 型別納入部位權重與成本結構 (Expand Macro Holding Signal Types)

**Parent:** Spec 0204 (Ticket 01)

**What to build:**
在 `src/types/macro.ts` 中擴充 `MacroHoldingSignalInput` 介面。目前該型別僅有 `symbol`, `name`, `action`, `stopLossPrice`, `targetPrice`，缺少持倉股數、買進成本、現價、持股權重百分比與損益百分比。這導致外部 AI 無法換算具體應賣張數。擴充型別以支援後續持股風控表與實體調倉計算。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 在 `src/types/macro.ts` 中擴充 `MacroHoldingSignalInput`：
  ```typescript
  export interface MacroHoldingSignalInput {
    symbol: string;
    name?: string;
    action: 'BUY' | 'AVOID' | 'SELL' | 'HOLD';
    stopLossPrice?: number;
    targetPrice?: number;
    // --- 0204 實戰風控擴充 ---
    shares?: number;               // 持有股數 (如 2000 股 = 2 張)
    costBasis?: number;            // 平均買進成本
    currentPrice?: number;         // 最新市價
    marketValueTWD?: number;       // 部位總市值 (TWD)
    weightPercent?: number;        // 佔帳戶總資產權重百分比 % (例如 8.5%)
    unrealizedPnlPercent?: number; // 未實現損益百分比 % (例如 -4.2%)
    boxTop?: number;               // 三日箱頂價格
    boxBottom?: number;            // 三日箱底價格
  }
  ```
- [ ] 保持舊有可選屬性向下相容，不破壞既有單元測試。
- [ ] 執行 `npm test src/engine/macroAdvisorEngine.test.ts` 確保型別定義乾淨無報錯。
