# Spec 0181: 個股深度提示詞物理遷移至主力戰情室、外聯 AI 防幻覺定錨與極簡作戰中樞 (Issue #243)

## 1. 概述
本迭代徹底落實職責分離與 KISS 原則：
1. 徹底拔除「個股深度分析」頂部佔位的提示詞面板，還原其 100% 純粹的財務報表與法務估值。
2. 將智策提示詞外聯職責平滑遷移至「主力戰情室」最底層，作為即時量化作戰的終局輸出中樞。
3. 在字串模板層導入「時態分割宣告」、「前端算術代勞」、「客觀反討好紅隊」與「台美雙軌隔離」，徹底封死外部 AI 的時空錯亂與計算幻覺。
4. 提供兩階段剪貼簿降級、微引導狀態與可折疊高對比預覽抽屜。

---

## 2. 細粒度原子工單清單 (Atomic 19 Tickets)

### 模組 A：個股深度分析純粹化 (StockAnalysis Cleanup)
- [x] **Ticket 01**: [StockAnalysisWorkspace 徹底移除 StrategicPromptPanel 引用與 JSX 渲染](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/01-remove-prompt-panel-jsx.md)
- [x] **Ticket 02**: [StockAnalysisWorkspace 清理提示詞專用狀態與冗餘特徵計算](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/02-cleanup-stock-analysis-prompt-digest-state.md)
- [x] **Ticket 03**: [StockAnalysisWorkspace.ui.test.tsx 單元測試斷言更新與純粹性驗收](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/03-stock-analysis-ui-test-update.md)

### 模組 B：主力戰情室轉接層與資料適配器 (Data Adapter & Facade)
- [x] **Ticket 04**: [擴充智策提示詞特徵型別契約：支援戰情室即時量價與籌碼特徵](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/04-strategic-prompt-types-expansion.md)
- [x] **Ticket 05**: [實作 aiForceToPromptDigestAdapter 資料轉接器](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/05-implement-ai-force-prompt-adapter.md)
- [x] **Ticket 06**: [編寫 aiForceToPromptDigestAdapter 專用單元測試](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/06-ai-force-prompt-adapter-unit-test.md)

### 模組 C：防幻覺字串工程與算術代勞 (Grounding Prompt Engine)
- [x] **Ticket 07**: [實作前端確定性算術核心：預先計算停損價位與風報比目標價](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/07-precalculated-price-pivots-math-engine.md)
- [x] **Ticket 08**: [提示詞模板注入時態分割宣告標籤：盤中即時 vs 昨日盤後結算](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/08-temporal-grounding-tags-injection.md)
- [x] **Ticket 09**: [提示詞模板注入客觀反討好紅隊指令與下檔風險審判](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/09-anti-sycophancy-red-team-directive.md)
- [x] **Ticket 10**: [提示詞模板實作台美雙軌自動隔離邏輯 (US Market Isolation)](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/10-us-market-dual-track-isolation.md)
- [x] **Ticket 11**: [提示詞引擎全維度單元測試升級 (strategicPromptEngine.test.ts)](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/11-strategic-prompt-engine-unit-tests.md)

### 模組 D：戰情室底層卡片 UI 與剪貼簿互動 (UI & Interaction)
- [x] **Ticket 12**: [實作 WarRoomPromptCard 緊湊深色毛玻璃卡片組件骨架](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/12-war-room-prompt-card-skeleton.md)
- [x] **Ticket 13**: [實作兩階段安全剪貼簿複製器與失敗降級機制 (Clipboard Fallback)](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/13-two-phase-clipboard-fallback.md)
- [x] **Ticket 14**: [實作一鍵複製 2 秒成功微引導與動態狀態反饋](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/14-copy-micro-feedback-and-timer.md)
- [x] **Ticket 15**: [實作抽屜式可折疊高對比結構化 Prompt 預覽器](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/15-prompt-collapsible-preview-drawer.md)
- [x] **Ticket 16**: [AiForceDashboardView 底層掛載集成與 Sticky 吸附列避讓樣式](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/16-ai-force-dashboard-mount-and-sticky-avoidance.md)
- [x] **Ticket 17**: [戰情室底層卡片集成測試：跨 5 大任務視圖常駐驗收](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/17-ai-force-dashboard-card-integration-test.md)

### 模組 E：全量迴歸與文檔治理 (Full Regression & Sync)
- [x] **Ticket 18**: [全量自動化單元測試 100% 綠燈與 TypeScript 0 錯誤驗證](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/18-full-test-and-typecheck-regression.md)
- [x] **Ticket 19**: [領域文檔同步：更新 CONTEXT.md、README.md 與 ADR/Spec 閉環](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/19-domain-doc-and-spec-sync.md)

---

## 3. 關聯規格與架構文檔
* **Spec 0181:** [docs/specs/0181-strategic-prompt-war-room-relocation-and-grounding-spec.md](file:///d:/APP/股票紀錄/docs/specs/0181-strategic-prompt-war-room-relocation-and-grounding-spec.md)
* **ADR 0181:** [docs/adr/0181-strategic-prompt-war-room-relocation.md](file:///d:/APP/股票紀錄/docs/adr/0181-strategic-prompt-war-room-relocation.md)
