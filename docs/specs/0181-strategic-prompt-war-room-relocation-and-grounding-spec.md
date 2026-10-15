# 0181 Spec: 個股深度提示詞物理遷移至主力戰情室、外聯 AI 防幻覺定錨與極簡作戰中樞規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0181
* **標題：** 個股深度提示詞物理遷移至主力戰情室、外聯 AI 防幻覺定錨與極簡作戰中樞
* **關聯 Issue：** [Issue #243](https://github.com/judragon005/stock-note/issues/243)
* **關聯架構決策：** [ADR 0181: 智策提示詞外聯職責遷移至主力戰情室與防幻覺定錨架構](file:///d:/APP/股票紀錄/docs/adr/0181-strategic-prompt-war-room-relocation.md)
* **規格狀態：** `COMPLETED` (全量實作完成，單元測試與構建 100% 綠燈)
* **版本：** V1.0
* **建立日期：** 2026-10-15

---

## 2. 背景與動機 (Background & Motivation)

在目前的系統架構中，「智策多維提示詞引擎 (`StrategicPromptPanel`)」被嵌入於「個股深度分析 (`StockAnalysisWorkspace.tsx`)」的頂部。經過多輪深度探討與檢視，此設計存在以下結構性矛盾：

1. **職責搶佔與認知干擾**：
   「個股深度分析」的核心職責為企業三大財務報表剖析、法務會計檢驗、杜邦分析與內在價值估值。巨大的提示詞面板置於頁面頂部，嚴重稀釋了基本面研讀的專注度，產生反客為主的視覺干擾。
2. **決策動線斷裂**：
   使用者需要複製「一鍵外聯 AI 提示詞」的高頻場景，通常發生在觀察完「主力戰情室」的即時量價、三大法人籌碼、融資券與動態訊號之後。將提示詞置於個股分析頁，造成操作動線跨分頁撕裂。
3. **外部 AI 的幻覺威脅**：
   使用者複製提示詞貼到外部線上 AI（如 ChatGPT、Claude、DeepSeek）進行推演時，外部 AI 常因缺乏即時數據、時空錯亂（將昨日盤後結算誤當盤中現況）、算術能力低下、以及迎合使用者的「討好偏見 (Sycophancy)」，產出極度危險的交易幻覺。
4. **堅持 KISS 原則，拒絕過度工程化**：
   拒絕建立過於複雜的「多模型方言切換器」、「龐大歷史快照資料庫」或「多層巢狀時間尺度切換器」。透過最精準、代碼量最少、零額外負擔的**高濃度通用模板與前端算術代勞**，在字串層面徹底封死幻覺邊界。

---

## 3. 核心設計原則與防禦護欄 (Core Principles & Guardrails)

### 3.1 職責單一與介面純粹化 (Single Responsibility)
* **個股深度分析**：徹底移除提示詞面板，回歸 100% 純粹的財務報表、估值模型與基本面體檢。
* **主力戰情室**：承接「外聯 AI 戰情提示詞中樞」職責，置於頁面最底層，作為即時量化指標轉化為外部深度推演的最後一哩路。

### 3.2 時態分割防幻覺協議 (Temporal Grounding Protocol)
* 提示詞必須明確宣告資料的「有效時間戳」與「市場時態分割」：
  - **盤中即時 (Intraday Live)**：當前市價、漲跌幅、盤中即時均線、當日成交量。
  - **盤後結算 (Settled EOD)**：三大法人買賣超、融資融券、借券賣出（昨日或前一交易日結算）。
  - **週末結算 (Settled Weekly)**：TDCC 集保千張大戶比例。
* 明文嚴禁外部 AI 混淆時態，禁止將昨日買超推論為今日盤中即時護盤。

### 3.3 前端精確算術代勞 (Frontend Deterministic Calculation)
* LLM 普遍算術脆弱。提示詞中的關鍵風險點（如 -3% 保守停損價、-5% 支撐防守價、1:2.5 風報比目標價）**由前端 TypeScript 引擎計算精準數值後直接填入**，禁止要求外部 AI 自行做浮點數乘除。

### 3.4 反討好紅隊指令 (Anti-Sycophancy Directive)
* 提示詞中明文注入風控官角色，嚴禁迎合使用者偏多心態，強制挑出當前標的最致命的 2~3 個下檔破綻與嚴格失效條件。

### 3.5 台美股雙軌自動隔離 (Dual-Market Isolation)
* 依據標的市場 (`market === 'US'` vs `'TW'`) 自動切換：
  - **台股**：包含三大法人、融資券、集保、10% 漲跌停微觀規範與 0.585% 交易摩擦成本扣除。
  - **美股**：自動剃除三大法人與資券欄位，切換為美股機構持倉（13F）、動能與無漲跌停流動性提醒。

---

## 4. 詳細工程與功能規格 (Detailed Engineering Specifications)

### 4.1 個股分析瘦身 (StockAnalysisWorkspace Refactor)
1. 從 `src/components/analysis/StockAnalysisWorkspace.tsx` 徹底移除 `<StrategicPromptPanel />` 的引用與渲染。
2. 移除該檔案中僅為供應該面板而計算之冗餘狀態，降低組件重渲染負擔。

### 4.2 戰情室底層掛載 (AiForceDashboardView Integration)
1. **佈局位置**：
   - 掛載於 `AiForceDashboardView.tsx` 中，位於各任務視圖下方、底部吸附式 `TaskViewsSwitcher` 的**上方**。
   - 容器設定 `marginBottom: '16px'`，預留呼吸空間，絕不遮擋或與吸附列發生重疊。
2. **視圖覆蓋**：
   - 提示詞卡片作為全域戰情決策工具，在 5 大任務視圖（綜合、技術警示、KD+MA、MACD、原始資料）切換時**始終保留在底層**，使用者隨時滾動到底皆可複製。
3. **緊湊卡片視覺 (Compact War Room Card)**：
   - 預設維持高密度深色毛玻璃卡片（`--bg-card`, border: `var(--border-color)`）。
   - 核心控制項：
     - 主按鈕：`[ ⚡ 一鍵複製 AI 戰情提示詞 ]`。
     - 脫敏膠囊：`[x] 隱藏個人持股金額 (已脫敏 🛡️)`。
     - 摺疊按鈕：`[ 檢視結構化 Prompt 預覽 (v13.5) ]`。
   - 複製反饋：點擊後按鈕立即變為 `✅ 已複製！可直接按 Ctrl+V 貼入 ChatGPT / Claude`，維持 2 秒後自動還原。

### 4.3 提示詞引擎精煉 (strategicPromptEngine.ts)
1. 在提示詞組裝中整合主力戰情室的即時資料 (`reportContext` 或 `quote` + `institutional` + `chips`)。
2. 注入 XML 格式之 `<market_time_dimension>`、`<price_limits>`、`<pre_calculated_pivots>` 與 `<output_contract>`。
3. 支援兩階段剪貼簿安全降級機制（優先使用 `navigator.clipboard.writeText`，若失敗則降級為 `document.execCommand('copy')`）。

---

## 5. 驗收條件與測試規範 (Acceptance Criteria & TDD)

| 編號 | 驗收項目 | 驗證標準 | 測試檔案 |
| :--- | :--- | :--- | :--- |
| **AC-01** | 個股深度分析純粹化 | `StockAnalysisWorkspace` 內不包含 `StrategicPromptPanel` 及其相關文本 | `StockAnalysisWorkspace.ui.test.tsx` |
| **AC-02** | 主力戰情室底層渲染 | `AiForceDashboardView` 底部成功渲染「AI 戰情提示詞」卡片與一鍵複製按鈕 | `AiForceDashboardView.test.tsx` |
| **AC-03** | 時態與防幻覺宣告 | 產出的 Prompt 文本包含基準日、盤中即時與昨日盤後結算區隔聲明 | `strategicPromptEngine.test.ts` |
| **AC-04** | 精確算術預先計算 | 產出的 Prompt 文本包含前端算好的停損價格（非 LLM 算術） | `strategicPromptEngine.test.ts` |
| **AC-05** | 台美股雙軌隔離 | 當 `market === 'US'` 時，生成的 Prompt 絕不含「三大法人」與「融資券」字樣 | `strategicPromptEngine.test.ts` |
| **AC-06** | 跨任務視圖持久存在 | 切換至 `TASK_2`、`TASK_3` 時，提示詞卡片依然渲染於底部 | `AiForceDashboardView.test.tsx` |
| **AC-07** | 剪貼簿一鍵複製反饋 | 點擊複製按鈕成功觸發複製，並呈現「已複製」微引導文字 | 單元測試 / 模擬驗證 |

---

## 6. 技術債與後續追蹤 (Technical Debt & Follow-up)

* 本實作完全秉持 KISS 原則，無新增之未償技術債。
* 既有 `Debt #0037`（7步深度投研彈窗）與本功能各自獨立，後續可平滑共用相同的特徵壓縮層。
