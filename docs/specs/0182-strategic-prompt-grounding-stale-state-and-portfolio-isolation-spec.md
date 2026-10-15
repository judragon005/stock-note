# 0182 Spec: 外聯 AI 提示詞幽靈狀態阻斷、在庫庫存雙態分流與全維度特徵對齊規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0182
* **標題：** 外聯 AI 提示詞幽靈狀態阻斷、在庫庫存雙態分流與全維度特徵對齊
* **關聯 Issue：** [Issue #249](https://github.com/judragon005/stock-note/issues/249)
* **關聯架構決策：** 待建立 `docs/adr/0182-strategic-prompt-grounding-and-portfolio-isolation.md`
* **規格狀態：** `DRAFT` (審查通過，準備進入 TDD 任務執行)
* **版本：** V1.0
* **建立日期：** 2026-10-15

---

## 2. 背景與動機 (Background & Motivation)

在 Spec 0181 完成將「智策提示詞中樞」物理遷移至主力戰情室後，經過在外部大模型（ChatGPT-4o）對個股「華邦電 (2344)」的實盤一鍵複製壓力測試，AI 紅隊與實戰稽核抓出了系統中存在的多項嚴重資料缺陷與邏輯矛盾：

1. **幽靈狀態殘留（Stale State Ghosting）**：
   - 華邦電股價平常為 20~30 元，但在提示詞中卻顯示為 **165 元**。
   - 經深入排查，發現原因在於 `AiForceDashboardView.tsx` 於標的切換時使用了 `setReport(prev => ({ ...prev, symbol }))`，導致上一檔標的（系統預設之 0050，收盤價 165 元）的價格與籌碼殘留在新標的身上，造成嚴重的資料嫁接污染。
2. **持倉假設錯位（In-Position vs Zero-Position）**：
   - 系統無條件將「現價」直接當作使用者的「持股成本」，強迫外部 AI 進行 -3% / -5% 保本停損清算。
   - 若使用者明明是「空手觀望」或「在席成本極低（波段獲利中）」，AI 卻一律發出「保本已破、立刻停損」的烏龍警示，完全無法給出進場建倉或移動停利策略。
3. **籌碼單日誤標為 20 日累計（1D vs 20D Confusion）**：
   - 適配器將單日買賣超（如外資 -37,021 張、三大法人 -45,318 張）直接塞入名為 `20D`（近20日累計）的欄位中，被具備連網查核能力的外部大模型當場識破數據失真。
4. **特徵漏接與全量 N/A（Data Truncation）**：
   - 月營收 YoY、本益比 PE、主力 VWAP、箱型支撐壓力、董監質押率等在報表中已有的資料，轉接至 Prompt 時被完全留空，導致多個關鍵標籤輸出為 `N/A`。
   - 均線系統（MA20/MA60）硬編碼寫死為現價，排列寫死為 `ENTANGLED`。
5. **產業屬性與市場微觀結構真空**：
   - 華邦電為景氣循環股（Cyclical），但 Prompt 未傳入此標籤，導致 AI 落入「營收創高應追價」的循環山頂估值陷阱。
   - 缺乏明確單位（「張」vs「股」）、缺乏台股 ±10% 漲跌停限制、處置股與注意股狀態脫鉤。

本規格書旨在從根源徹底解決上述問題，打造華爾街頂級機構標準的 Grounded AI Prompt 生成水線。

---

## 3. 核心設計原則與防禦護欄 (Core Principles & Guardrails)

### 3.1 幽靈狀態阻斷與加載守門 (Anti-Stale & Loading Guard)
* **立即原子重置**：當切換查詢標的時，立即將 `report.marketBar.currentPrice` 與 `chipsSummary` 清空為 `undefined` 或待命狀態，絕不繼承 `prev` 之任何舊數據。
* **加載複製攔截**：當 `isLoading === true` 或 `isDataPending === true` 時，提示詞複製按鈕必須鎖定為 Disabled（呈現 `⏳ 數據同步校準中...`），嚴禁複製未完成回補的半成品或殘留數據。

### 3.2 庫存全自動雙態分流 (Portfolio Dual-Mode Isolation)
系統依據全域 `holdings` 自動查找當前標的：
* **態樣 A：在庫持倉模式 (`IN_POSITION`)**
  - 跨券商加權計算真實買進成本 (`avgCost`) 與含稅費保本價 (`breakevenPrice`)。
  - 輸出未實現損益率 (`unrealizedPnLPercent`) 與持有天數。
  - 防線轉為「保本防守線」與「移動停利線」。
* **態樣 B：空手觀望模式 (`ZERO_POSITION`)**
  - 明確宣告 `holding_status="ZERO_POSITION"`，無持有成本。
  - 指令強制要求 AI 轉為評估「當前是否適合建倉、回測支撐位與潛在風報比」，嚴禁發布停損清算命令。

### 3.3 籌碼時態與明確計量單位 (Precision Chips & Unit Grounding)
* **單日與 20 日明確分離**：區分 `<institutional_net_1d>` 與由日 K 歷史聚合計算之 `<institutional_net_20d>`。
* **明確計量單位**：台股所有籌碼與量能強制標註 `unit="張 (1,000股)"`，成交金額標註 `unit="新台幣億元"`；美股標註 `unit="股 (Shares)"`。

### 3.4 景氣循環股與市場微觀結構對齊 (Cyclical & Microstructure Alignment)
* **週期股警示**：整合 `industryGate.ts`，若標的為景氣循環股，強制注入 `<industry_characteristics is_cyclical="true">`，黑帽思考帽強制質詢是否處於循環高峰。
* **微觀結構注入**：注入當日漲跌停價 (`<price_limits limit_up="..." limit_down="..." />`)、處置/注意股票狀態、當沖比率與借券賣出餘額。

### 3.5 ETF 與個股動態分類 (Dynamic ETF Look-Through)
* 拔除 `isEtf: false` 硬編碼，透過 `isEtfSymbol(symbol)` 自動判定。
* 若為 ETF，啟動成分股穿透、追蹤誤差 (TD) 與費用率 (TER)；若為個股，啟動財務三表、營收與董監質押。

### 3.6 零信任輸出契約 (Zero-Trust Output Contract)
* 修改 Prompt 的 `<output_format>`：
  - **第 0 步**：強制要求 AI 先執行「【資料真實性與時態海關稽核】」，若發現數據矛盾或過期，第一時間提出警示。
  - **第 1 步**：輸出 Actionable Matrix 與實戰執行 Checkpoint。

---

## 4. 詳細工程與功能規格 (Detailed Engineering Specifications)

### 4.1 戰情室狀態重置與加載防禦 (`AiForceDashboardView.tsx` & `WarRoomPromptCard.tsx`)
1. **重置邏輯優化**：
   在 `loadDataForSymbol` 啟動時：
   ```typescript
   setReport((prev) => ({
     ...createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket),
     symbol: targetSymbol,
     name: resolvedName,
     market: targetMarket,
   }));
   ```
   徹底杜絕 `...prev` 帶來的舊標的價格與籌碼殘留。
2. **複製按鈕狀態守門**：
   `WarRoomPromptCard` 新增 `isLoading?: boolean` 與 `isDataPending?: boolean`。
   在載入中或數據待命狀態下，按鈕禁用並呈現視覺微反饋。
3. **複製失敗容錯**：
   若剪貼簿降級依然失敗，自動展開 Prompt 預覽抽屜，並提示手動複製。

### 4.2 戰情室適配器深度映射 (`src/engine/aiForcePromptAdapter.ts`)
1. **庫存雙態計算**：
   - 篩選 `holdings.filter(h => h.symbol === symbol)`。
   - 計算總持股、加權平均成本、保本價。若股數為 0 則判定為 `ZERO_POSITION`。
2. **日 K 特徵真實驗算**：
   - 從日 K candles 計算真實 MA20、MA60、均線多空糾結排列 (`BULLISH` / `BEARISH` / `ENTANGLED`) 以及 20 日均量比。
3. **湖倉基本面與微觀數據補齊**：
   - 映射月營收 YoY / MoM、本益比 PE、主力 VWAP 與箱型區間。
   - 注入處置/注意狀態、當沖率、借券賣出、漲跌停價格。
   - 整合 `isCyclicalIndustry(symbol)` 注入週期股標記。
   - 動態辨識 `isEtfSymbol(symbol)`。

### 4.3 提示詞引擎雙態結構升級 (`src/engine/strategicPromptEngine.ts`)
1. **`<action_pivots>` 雙態 XML 模板**：
   - `IN_POSITION`：輸出真實買進成本、保本線、移動停利線、保守停損線。
   - `ZERO_POSITION`：輸出當前市價、假設建倉回測支撐價、目標價、風報比，並嚴禁停損清算。
2. **單位屬性全量標準化**：
   - `<volume_shares unit="張">`、`<foreign_net_shares_1d unit="張">` 等。
3. **輸出契約前置「第 0 步資料稽核」**。

---

## 5. 驗收條件與測試規範 (Acceptance Criteria & TDD)

| 編號 | 驗收項目 | 驗證標準 | 測試檔案 |
| :--- | :--- | :--- | :--- |
| **AC-01** | 標的切換零幽靈殘留 | 切換標的（如 0050 ➔ 2344）時，新標的之 `currentPrice` 絕不殘留 0050 之 165 元 | `AiForceDashboardView.test.tsx` |
| **AC-02** | 載入中禁止複製 | 當 `isLoading === true` 時，複製按鈕處於 `disabled` 狀態且提示「同步校準中」 | `WarRoomPromptCard.test.tsx` |
| **AC-03** | 庫存雙態分流 - 在席持倉 | 當標的在 `holdings` 中時，Prompt 輸出 `status="IN_POSITION"`、真實成本與未實現損益率 | `aiForcePromptAdapter.test.ts`<br>`strategicPromptEngine.test.ts` |
| **AC-04** | 庫存雙態分流 - 空手觀望 | 當標的無持倉時，Prompt 輸出 `status="ZERO_POSITION"`，無成本且指令禁止發出停損命令 | `aiForcePromptAdapter.test.ts`<br>`strategicPromptEngine.test.ts` |
| **AC-05** | 籌碼單日與 20 日分離 | Prompt 明確包含 `<institutional_net_1d>` 與 `<institutional_net_20d>`，絕不將單日誤標為 20 日 | `aiForcePromptAdapter.test.ts`<br>`strategicPromptEngine.test.ts` |
| **AC-06** | 籌碼與量能單位標記 | 籌碼與量能標籤均攜帶 `unit="張"` 或 `unit="股"`，杜絕大模型單位歧義警告 | `strategicPromptEngine.test.ts` |
| **AC-07** | 基本面與營收零 N/A | 在有湖倉資料下，Prompt 內之本益比、月營收 YoY、主力 VWAP 不再輸出為 `N/A` | `aiForcePromptAdapter.test.ts` |
| **AC-08** | 均線真實驗算 | MA20/MA60 與趨勢排列由真實日 K 算出，絕非 hardcode 之現價與 ENTANGLED | `aiForcePromptAdapter.test.ts` |
| **AC-09** | 景氣循環股標籤 | 華邦電 (2344) 產生之 Prompt 必須包含 `is_cyclical="true"` 與週期股黑帽質詢 | `strategicPromptEngine.test.ts` |
| **AC-10** | ETF 自動辨識 | 輸入 0050 時，`audit.isEtf` 為 `true` 並啟用成分股穿透模板 | `aiForcePromptAdapter.test.ts` |

---

## 6. 工單分解與任務規劃 (Task Breakdown)

* **Ticket 01**：`AiForceDashboardView.tsx` 標的切換狀態重置與 `WarRoomPromptCard.tsx` 載入守門。
* **Ticket 02**：`aiForcePromptAdapter.ts` 庫存加權計算與雙態分流 (`IN_POSITION` vs `ZERO_POSITION`)。
* **Ticket 03**：`aiForcePromptAdapter.ts` 籌碼單日/20日拆解、均線真實驗算與景氣循環股注入。
* **Ticket 04**：`aiForcePromptAdapter.ts` 基本面營收、VWAP、處置股與市場微觀結構補齊。
* **Ticket 05**：`strategicPromptEngine.ts` 雙態 XML 模板重構、計量單位標準化與輸出契約升級。
* **Ticket 06**：全量單元測試、E2E 整合驗證、ADR 建檔與交接手冊同步。
