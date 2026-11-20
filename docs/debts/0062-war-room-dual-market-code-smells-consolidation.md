# Debt 0062: 主力戰情室雙市場重構衍生之 Fowler Code Smells 收斂清單

- **狀態 (Status)**: `RESOLVED`（已於 Spec 0240 / Issue #594 Wave 1 完整清償並植入架構適應度守門測試）
- **優先級 (Priority)**: `P3`
- **發現來源**: `/code-review` 雙軸審查回饋（Spec 0239 / Issue `#592`）
- **標籤**: `Refactor` · `CleanCode` · `DRY` · `AiForceDashboard` · `MarketSync`

---

## 1. 改善項目明細

1. **Duplicated Code — 後端共用 DDL 與美股點號別名正規化**：
   - [scripts/market-sync/us-fundamentals-ingestion.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/us-fundamentals-ingestion.cjs#L136-L158) 複製了 `sqlite-db-core.cjs` 之 `corporate_action_calendar` 完整 DDL；建議統一改由 `sqlite-db-core.cjs` 匯出單一建表函式。
   - `vite-market-middleware.cjs`（`buildSymbolAliases`）、`us-fundamentals-ingestion.cjs`（`normalizeYahooSymbol`）、`sec-edgar-proxy.cjs`（`normalizeUsTickerCandidates`）三處各自實作美股點號/連字號別名正規化；建議抽離至 `scripts/market-sync/market-sync-core.cjs` 共用。
2. **Duplicated Code — 前端漲跌色彩主題極性 Helper**：
   - 多張卡片（`ForecastConeCard`、`TdccDistributionCard`、`MonthlyRevenueCard`、`VwapCostStructureCard`、`TaskPanels` 等 7+ 處）重複撰寫 `colorTheme === 'international' ? '#10b981' : '#ef4444'`；建議抽為單一純函式 `resolveDirectionalPalette(colorTheme, market)`。
3. **Type Escape & Mysterious Name — `aiForcePromptAdapter.ts`**：
   - [src/engine/aiForcePromptAdapter.ts](file:///d:/APP/股票紀錄/src/engine/aiForcePromptAdapter.ts#L337-L356) 使用 `as unknown as number | undefined` 強塞 `null`，且 `bigHolderRatioChange1000` 與 `bigHolderRatioChange400` 均指向同一 `tdcc?.change4WeeksRatio`；建議放寬目標介面型別為 `number | null | undefined` 並釐清 400 張與 1000 張大戶欄位來源。
4. **Divergent Change — 巨石檔案拆解**：
   - [scripts/market-sync/vite-market-middleware.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/vite-market-middleware.cjs)（1,483 行）與 [src/engine/aiForceDashboardEngine.ts](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts)（2,538 行）持續膨脹，建議下期將按需回補路由與美股組裝子流程拆為獨立模組。
