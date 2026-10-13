# ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃

## 狀態
已通過 (ACCEPTED / IN_DEVELOPMENT) - 2026-10-13

## 關聯規格
- [Spec 0153: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md)
- [Issue #135](https://github.com/judragon005/stock-note/issues/135)

---

## 背景與問題 (Context)
在專案演進至 V8.87 後，系統已具備完善的本地 SQLite 湖倉、主力戰情室、宏觀顧問與 21 項財務健診指標。然而，在將這些內部數據橋接至外部先進大型語言模型（Claude 3.7、GPT-4o、Gemini 2.5 Pro）進行深度覆盤與人機協同決策時，面臨：
1. **未經壓縮的原始歷史數據造成 Token 爆炸與 LLM 注意力渙散**。
2. **個股與 ETF 混用同一套分析邏輯**，導致 ETF 被詢問三大報表與董監質押等荒謬矛盾。
3. **缺乏反向批判機制**，容易落入投資人的確認偏誤。

---

## 決策核心架構 (Decision Drivers & Architecture)

### 1. 標的屬性自適應雙軌分流 (Asset-Class Adaptive Routing)
- 底層透過 `isEtfSymbol()` 實施分流：
  - **個股 (Equity)**：對齊《個股分析大師核心模板 V12.0》，專注於宏觀 WACC 感測、好生意 (CR4/CR8)、好公司 (三大報表/杜邦分析)、好價格 (主力 VWAP/安全邊際)。
  - **ETF**：對齊《ETF 分析大師核心模板 V3.0》，專注於動態權重感知（市值型/股息型/主題型/債券型）、指數品質、基金治理、成本效率 (TER/TD/折溢價) 與穿透式持倉透視 (Look-Through)。

### 2. 特徵精煉語意壓縮層 (Synthesis & Token Guard)
- 嚴禁直接 dump 陣列與原始 JSON。建立專屬壓縮層 `synthesizeStockDigest()`，將數值序列濃縮為客觀特徵陳述。
- **Token 預算限制**：
  - 單維度 / 單頂思考帽 Prompt：`< 1,200 tokens`。
  * Master 全量投研 Prompt：`< 4,500 tokens`。

### 3. 六頂思考帽決策體系 (Six Thinking Hats Protocol)
- 在提示詞中建立結構化思考標籤：
  - ⚪ 白帽：客觀數據事實（無主觀臆測）。
  - 🔴 紅帽：市場情緒與群眾恐慌直覺。
  - ⚫ 黑帽：魔鬼代言人與紅隊批判（致命風險與破位點）。
  - 🟡 黃帽：核心價值與催化劑。
  - 🟢 綠帽：非對稱創新策略與替代配置。
  - 🔵 藍帽：元認知、停損停利與風控執行紀律。

### 4. 零信任數據海關 (Zero-Trust Customs Protocol)
- 提示詞頭部注入 `<data_customs_audit>`，強制標明 `anchorTradingDate`、`settlement_status`、`verificationTimestamp`。
- 嚴格落實 Zero-Mock Policy，缺失數據標示 `N/A`，杜絕任何硬編碼造假。

### 5. 零隱私外洩與部位脫敏 (Privacy & Zero Secret Leakage)
- 全流程純前端客戶端組裝，零金鑰與財務資料外流。
- 預設啟用脫敏模式，隱去真實帳戶金額與持股數，僅保留客觀量化指標。

---

## 後果評估 (Consequences)

### 正面影響 (Positive)
- **極致決策深度**：直接賦能外部頂級 LLM 扮演對沖基金等級的風控長與分析師。
- **高性價比與注意力集中**：嚴格控制在 4,500 tokens 以內，杜絕 Lost in the Middle，回覆品質顯著提升。
- **體驗流暢**：支援 Master 一鍵複製，亦支援針對特定思考帽（如黑帽魔鬼代言人）單鍵抽離複製。

### 需遵循約束 (Constraints)
- 數據提取層必須與專案 SQLite 湖倉保持契約同步。
- 跨市場降級處理：美股標的在無法人與集保數據時，平滑降級為換手率與量價動能。
