# 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊

**Parent:** #592 (Spec 0239)
**What to build:** 作為全站雙市場主題統一重構之 **Expand** 階段，以向後相容方式擴展全數 21 張卡片與 `TaskPanels` 接受選用 `colorTheme` 與 `market` 屬性並自 `AiForceDashboardView` 統一透傳；重構 `TaskViewsSwitcher` 徹底解除內部 `TermTooltip` 呼叫 `stopPropagation()` 所造成的點擊分頁死鎖；補齊 `aiForceGlossary` 全部缺漏詞條（`tdccDistribution`, `usInstitutionalHoldings`, `etf`, `revenue`）並使 `diagnoseMainForceCost` 等動態診斷支援幣別（`元` vs `USD`）。
**Blocked by:** 08 — 雙市場總經隔離與美股核心評分數學解鎖 (Card 02 / 05 / 09 / 11 / 12 / 14 / 16 / 18), 09 — 引擎算術一致性 (VWAP / RSI / 估值雙分位 / PromptAdapter) 與 ARINC 661 零幻覺載入閘門
**Status:** ready-for-agent

- [ ] 點擊 `TaskViewsSwitcher` 任一分頁按鈕之文字或圖示（`TASK_1`~`TASK_5`），100% 觸發 `onChangeTab` 切換頁籤，且獨立資訊圖示仍可開啟詞彙解說 Tooltip；角標與詞彙表統一為 `21 模組`。
- [ ] `AiForceDashboardView` 將 `resolvedColorTheme` 與 `market` 透傳至所有 21 張卡片與 4 大 `TaskPanels` 視圖，既有未傳入新 props 之單元測試 100% 維持綠燈。
- [ ] `aiForceGlossary` 包含 `tdccDistribution`、`usInstitutionalHoldings`、`etf`、`revenue` 等全站被引用詞條，且所有卡片引用之 `termId` 100% 命中詞典無退化；動態價格診斷依市場區分 `元` 與 `$`。
