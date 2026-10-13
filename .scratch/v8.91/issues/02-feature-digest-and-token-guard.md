# 02 — 特徵語意壓縮層與 Token 守門引擎 (Ticket 02)

**Parent Issue:** #135
**Parent Spec:** [Spec 0153: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md)
**Parent ADR:** [ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)

**What to build:**
建立 `src/engine/strategicPromptDigest.ts` 與 `src/engine/strategicPromptDigest.test.ts`：
1. **SSOT 數據萃取**：
   - 整合 `daily_candles`、`tw_institutional_chips`、`tw_tdcc_distribution`、`tw_monthly_revenue`、`macro_sentiment_daily`、`corporate_action_calendar`。
   - 串接 `vwapCostEngine`、`muscleBookerEngine`、`financialReportService`、`lookThroughEngine`。
2. **語意特徵壓縮演算法 (`synthesizeStockDigest`)**：
   - 將數百根 K 線壓縮成「均線排列形態、20日均量比、爆量長上影標記」。
   - 將集保表格壓縮成「大戶增減趨勢、散戶人數變化」。
   - 將營收壓縮成「連續增長月數、是否創歷史新高」。
3. **跨市場平滑降級**：
   - 台股：完整三大法人、集保、月營收。
   - 美股：自動降級為換手率、MFI、OBV、SEC EDGAR 財報季度連續性，標註法人數據 N/A。
4. **Token 估算器 (`estimateTokenCount`)**：
   - 中英混合精準 Token 計算（中文約 1.5~2 tokens/字，英文約 0.75 token/單字）。

**Blocked by:** Ticket 01 (型別定義)

**Status:** ready-for-agent

- [ ] `strategicPromptDigest.ts` 實作完成。
- [ ] `strategicPromptDigest.test.ts` 100% 綠燈，覆蓋台股、美股、普通個股與 ETF 的數據壓縮。
- [ ] 驗證未提供數據時遵循 Zero-Mock Policy 輸出 `N/A`。
