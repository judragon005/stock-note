# Spec 0182: 外聯 AI 提示詞幽靈狀態阻斷、在庫庫存雙態分流與全維度特徵對齊 (Issue #249)

## 1. 概述
經過對華邦電 (2344) 實盤一鍵複製的外部大模型（ChatGPT-4o）壓力測試與深水區審查，本迭代從根源解決 7 大致命數據缺陷與邏輯矛盾：
1. **阻斷幽靈狀態殘留**：徹底修復 `AiForceDashboardView` 標的切換時 `...prev` 導致的上一檔標的（如 0050 之 165 元）價格與籌碼污染。
2. **在庫庫存雙態分流**：自動比對全域 `holdings`，持倉者帶真實買進成本與保本價（`IN_POSITION`），空手者帶建倉指引與風報比（`ZERO_POSITION`），絕不對空手標的發布烏龍停損命令。
3. **籌碼時態與單位精確對齊**：徹底拆分單日買賣超 (`1D`) 與 20 日累計 (`20D`)，所有數值強制攜帶計量單位（`unit="張"`、`unit="股"`）。
4. **均線與基本面真實驗算**：拔除寫死之現價與 `ENTANGLED`，由日 K 精算真實 MA20/MA60，補齊月營收 YoY、本益比 PE 與主力 VWAP。
5. **景氣循環股與市場微觀結構**：整合 `industryGate.ts` 自動標註週期股防範高峰估值陷阱，注入台股 ±10% 漲跌停價格、處置/注意狀態與當沖率。
6. **ETF 自動動態分流**：拔除 `isEtf: false` 硬編碼，自動啟用成分股穿透與跟蹤偏離。
7. **零信任輸出契約升級**：要求外部 AI 第 0 步先審查數據真實性與時效性。

---

## 2. 細粒度原子工單清單 (Atomic 20 Tickets)

### 模組 A：戰情室狀態重置與加載防禦 (War Room State & Loading Guard)
- [ ] **Ticket 01**: [AiForceDashboardView 標的切換時立即原子重置 marketBar 與 chipsSummary，杜絕 ...prev 幽靈數據殘留](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/01-reset-stale-state-on-symbol-switch.md)
- [ ] **Ticket 02**: [WarRoomPromptCard 接入 isLoading 與 isDataPending 狀態，加載期間禁用複製按鈕並顯示「同步校準中」](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/02-loading-guard-for-copy-button.md)
- [ ] **Ticket 03**: [WarRoomPromptCard 剪貼簿複製失敗時自動展開 Prompt 抽屜並提供手動複製指引與紅色 Toast](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/03-clipboard-fallback-auto-drawer.md)

### 模組 B：在庫庫存雙態分流與跨帳戶成本計算 (Portfolio Dual-Mode Isolation)
- [ ] **Ticket 04**: [擴充 strategicPrompt.ts 之 InvestorContext 與 StrategicFactDigest 支援 IN_POSITION 與 ZERO_POSITION](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/04-extend-types-for-in-and-zero-position.md)
- [ ] **Ticket 05**: [aiForcePromptAdapter 實作跨帳戶多筆持倉加權成本 (avgCost)、保本價 (breakevenPrice) 與未實現損益率計算](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/05-adapter-multi-account-cost-weighted-calc.md)
- [ ] **Ticket 06**: [aiForcePromptAdapter 實作空手標的自動標註為 ZERO_POSITION，指令嚴禁發布停損命令](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/06-adapter-zero-position-marking.md)
- [ ] **Ticket 07**: [aiForcePromptAdapter 支援脫敏模式與非脫敏模式之成本精確度輸出分流](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/07-adapter-desensitization-cost-modes.md)

### 模組 C：籌碼時態細化與計量單位標準化 (Chips Temporal & Unit Grounding)
- [ ] **Ticket 08**: [aiForcePromptAdapter 拆分最新單日買賣超 (1D) 與日 K 累積之近 20 日三大法人買賣超 (20D)](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/08-adapter-separate-1d-and-20d-chips.md)
- [ ] **Ticket 09**: [strategicPromptEngine 為所有籌碼與成交量標籤強制注入 unit="張"、unit="股" 與 unit="億元"](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/09-prompt-engine-explicit-unit-tags.md)
- [ ] **Ticket 10**: [aiForcePromptAdapter 補齊千張大戶 (1000張)、400張大戶與散戶 (10張以下) 之完整集保籌碼動態](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/10-adapter-complete-tdcc-shareholders-flow.md)

### 模組 D：均線真實驗算與基本面湖倉映射 (MA True Math & Lakehouse Fundamentals)
- [ ] **Ticket 11**: [aiForcePromptAdapter 拔除 hardcode 現價與 ENTANGLED，從日 K 真實驗算 MA20、MA60、排列趨勢與 20 日均量比](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/11-adapter-real-ma-and-volume-ratio.md)
- [ ] **Ticket 12**: [aiForcePromptAdapter 映射月營收 YoY、MoM、歷史新高標記與本益比 PE](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/12-adapter-revenue-and-pe-ratio-mapping.md)
- [ ] **Ticket 13**: [aiForcePromptAdapter 映射主力 VWAP 成本線與箱型支撐/壓力位](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/13-adapter-main-vwap-and-box-levels.md)

### 模組 E：市場微觀結構與景氣循環股對齊 (Microstructure & Cyclical Alignment)
- [ ] **Ticket 14**: [整合 industryGate.ts，自動標註景氣循環股 (is_cyclical="true")，黑帽思考帽注入高峰估值陷阱質詢](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/14-cyclical-stock-tag-and-black-hat-defense.md)
- [ ] **Ticket 15**: [aiForcePromptAdapter 注入當日台股 ±10% 漲跌停價格、處置/注意股票狀態與當沖比率](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/15-adapter-price-limits-and-disposition-status.md)
- [ ] **Ticket 16**: [aiForcePromptAdapter 整合 isEtfSymbol，全自動分流 ETF 成分股穿透與個股財務三表](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/16-adapter-dynamic-etf-classification.md)

### 模組 F：提示詞引擎雙態 XML 模板重構 (Prompt Engine XML Dual-Mode)
- [ ] **Ticket 17**: [strategicPromptEngine 重構 <action_pivots>：持倉模式輸出防守停損/移動停利；空手模式輸出建倉風報比與回測支撐](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/17-prompt-engine-action-pivots-dual-mode.md)
- [ ] **Ticket 18**: [strategicPromptEngine 升級 <output_format>：強制前置「【第 0 步：資料真實性與時態海關稽核】」](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/18-prompt-engine-output-format-step-zero.md)

### 模組 G：全量 TDD 單元測試、迴歸與文檔閉環 (Full TDD, Regression & Doc Sync)
- [ ] **Ticket 19**: [編寫與更新 aiForcePromptAdapter.test.ts、strategicPromptEngine.test.ts 與 AiForceDashboardView.test.tsx](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/19-comprehensive-unit-tests-upgrade.md)
- [ ] **Ticket 20**: [全量 1,600+ 項測試與 TypeScript 0 錯誤驗證，同步 ADR 0182、CONTEXT.md 與手冊](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/20-full-regression-and-doc-sync.md)

---

## 3. 關聯規格與架構文檔
* **Spec 0182:** [docs/specs/0182-strategic-prompt-grounding-stale-state-and-portfolio-isolation-spec.md](file:///d:/APP/股票紀錄/docs/specs/0182-strategic-prompt-grounding-stale-state-and-portfolio-isolation-spec.md)
