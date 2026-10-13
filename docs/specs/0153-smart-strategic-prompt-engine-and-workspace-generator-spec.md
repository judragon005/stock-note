# 0153 Spec: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書 (Issue #135)

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0153
* **標題：** 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器
* **關聯 Issue：** [Issue #135](https://github.com/judragon005/stock-note/issues/135)
* **關聯架構決策：** [ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)
* **規格狀態：** `IN_DEVELOPMENT` (正式開工)
* **版本：** V1.0 (對齊個股大師 V12.0 與 ETF 大師 V3.0 Agentic 決策體系)
* **建立日期：** 2026-10-13

---

## 2. 背景與痛點剖析 (Background & Problem Statement)

專案自 V8.65 至 V8.87 完成了 SQLite 本地湖倉（Lakehouse）、AI 主力戰情室、7 步深度投研與財務健診 21 項量化指標之架構演進。然而，在投資人利用外部前沿大型語言模型（如 Claude 3.7 Sonnet、GPT-4o、Gemini 2.5 Pro）進行深度覆盤與人機協同決策時，面臨四大核心瓶頸：

1. **數據源斷層與複製繁重**：投資人須在多個頁籤間手動拼湊股價、三大法人、集保大戶比、月營收與技術指標，過程破碎且容易漏掉關鍵指標。
2. **Token 預算爆炸與注意力渙散 (Lost in the Middle)**：若直接將全量歷史日 K 與未經處理的 JSON 傾倒給外部 LLM，Token 常超過 20,000，引發大海撈針效應與嚴重幻覺。
3. **確認偏誤與缺少逆向批判**：傳統提示詞多偏向「這檔股票好不好」，缺乏如「六頂思考帽」中黑帽（魔鬼代言人/紅隊）的嚴苛質詢機制。
4. **個股與 ETF 混淆問題**：直接將個股分析模組（三大報表、董監質押）套用至 ETF 標的，產出無效荒謬的提示詞。

---

## 3. 核心設計原則與三大護欄 (Core Principles & Guardrails)

### 3.1 零信任數據海關 (Zero-Trust Customs Protocol)
* **收盤定錨與時間戳**：注入的數據必須包含 `anchorTradingDate`、`isSettled`（是否正式收盤）、`verificationTimestamp`。
* **零偽造原則 (Zero-Mock Policy)**：數值缺位時輸出 `N/A (未提供)`，嚴禁硬編碼造假數字。

### 3.2 Token 預算嚴格守門 (Strict Token Budget Guard)
* **特徵語意壓縮層 (Synthesis Layer)**：將原始數值序列濃縮成「高密度客觀事實陳述」（例如：「*近20日成交均量 3,450張，今日爆量 2.8倍*」）。
* **預算上限**：
  * 單維度提示詞 / 單頂思考帽：**嚴格控制在 < 1,200 tokens**。
  * Master 全量智策投研提示詞：**嚴格控制在 < 4,500 tokens**。

### 3.3 零隱私外洩與脫敏機制 (Privacy & Desensitization Guard)
* **純前端運算 (Client-Side Synthesis)**：數據提取與組裝 100% 於瀏覽器本地端進行，零個人持倉外洩風險。
* **部位脫敏開關 (Desensitization Switch)**：預設開啟。隱去個人持倉金額與絕對股數，僅輸出客觀市場量化指標；若使用者選擇包含持倉，亦僅以「佔總投資部位比例 %」呈現。

---

## 4. 資產類別自適應分流 (Asset-Class Adaptive Routing)

引擎底層透過 `isEtfSymbol()` 實施自動分流，對齊兩大官方旗艦級分析架構：

```
                ┌─── [個股 Equity] ───> 《個股分析大師 V12.0》智策模型
輸入標的 Symbol ─┤
                └─── [ETF 基金] ────> 《ETF 分析大師 V3.0》智策模型
```

### 4.1 個股分析架構（對齊《個股分析大師核心模板 V12.0》）
1. **宏觀與催化劑 (Macro & Catalyst)**：WACC 利率敏感度、10Y-2Y 美債利差、CNN 恐懼貪婪指數、重要催化事件。
2. **好生意 (Good Business)**：產業天花板、CR4/CR8 市場集中度、競爭格局（完全競爭/壟斷競爭/寡頭/完全壟斷）。
3. **好公司 (Good Company)**：護城河、月營收成長性 (YoY/MoM/創歷史新高)、毛利率、營業利益率、ROE/ROA、自由現金流 (FCF)、董監事質押率與申報轉讓。
4. **好價格 (Good Price)**：20日主力 VWAP 成本與現價乖離率、肌肉書僮箱頂/箱底防線、安全邊際評估。
5. **六頂思考帽實戰策略**：白帽、紅帽、黑帽、黃帽、綠帽、藍帽完整思維鏈。

### 4.2 ETF 分析架構（對齊《ETF 分析大師核心模板 V3.0》）
1. **動態權重感知**：
   * 市值型（35% 指數品質 / 20% 基金治理 / 35% 成本效率 / 10% 實戰決策）
   * 股息型（20% 指數品質 / 10% 基金治理 / 40% 成本效率 / 30% 實戰決策）
   * 主題型（45% 指數品質 / 15% 基金治理 / 25% 成本效率 / 15% 實戰決策）
   * 債券型（30% 指數品質 / 20% 基金治理 / 30% 成本效率 / 20% 實戰決策）
2. **指數品質**：編制機構、加權方式（市值加權/等權重/股息加權）、成分股篩選邏輯與再平衡頻率。
3. **基金治理與規模**：AUM 資產規模、歷史軌跡、流動性。
4. **成本效率與跟蹤**：總費用率 (TER)、追蹤偏離 (TD)、市價折溢價 (Premium/Discount)、配息組成與收益平準金。
5. **穿透透視 (Look-Through)**：前十大成分股持股權重、單一產業集中度曝險。

---

## 5. 六頂思考帽決策框架 (Six Thinking Hats Protocol)

在 Master 提示詞與專屬分頁中，將投資思維分解為六大獨立心智標籤：

1. **⚪ 白帽 (White Hat - 客觀事實)**：
   * 注入：當前收盤價、成交筆數、均線位階、月營收年增率、集保大戶持股比例變化。
   * 指令：不允許任何主觀臆測，僅確認事實與已驗證數據。
2. **🔴 紅帽 (Red Hat - 直覺情緒)**：
   * 注入：市場恐懼貪婪評分、散戶融資增減、當沖比例。
   * 指令：評估市場氛圍是否過熱、散戶群眾心理直覺與恐慌程度。
3. **⚫ 黑帽 (Black Hat - 魔鬼代言人 / 紅隊質詢)**：
   * 注入：跌破均線壓力、董監高質押風險、業外收益比率過高、本益比歷史頂部、主力出貨跡象。
   * 指令：嚴厲審查下檔風險，列出導致這筆投資產生毀滅性虧損的所有致命弱點。
4. **🟡 黃帽 (Yellow Hat - 核心價值與催化劑)**：
   * 注入：營收創歷史新高、主力成本支撐、獲利成長預期、降息受惠題材。
   * 指令：客觀分析上檔獲利空間與商業模式的核心競爭優勢。
5. **🟢 綠帽 (Green Hat - 非對稱創新配置)**：
   * 注入：波動度 ATR、部位配置權重、箱底防禦策略。
   * 指令：設計不對稱風險報酬的進場路徑（如分批金字塔建倉、對沖避險方案）。
6. **🔵 藍帽 (Blue Hat - 元認知與執行紀律)**：
   * 注入：保本停損點、移動停利線、單一標的上限風控警戒。
   * 指令：制定明確的進出場清單，何時該冷靜停看聽，何時觸發硬性停損。

---

## 6. 語意 XML 標籤規範 (Semantic Prompt Layout)

採用「語意 XML 外框 + Markdown 內部排版」，完美相容 Claude 3.7、GPT-4o 與 Gemini 2.5：

```xml
<investment_decision_prompt version="1.0" system="SmartStrategyEngine">
  <system_role>
    你是一位擁有 20 年華爾街對沖基金經驗的資深量化投資總監兼風控長。
    你精通「個股價值與成長鑑識」與「ETF 穿透式資產配置」，並嚴格執行「六頂思考帽決策框架」與「Agentic 反思驗證」。
  </system_role>

  <data_customs_audit>
    <!-- 注入零信任數據海關：時間戳、市場、收盤定錨狀態、真實性宣告 -->
  </data_customs_audit>

  <fact_sheet asset_type="EQUITY|ETF">
    <!-- 注入特徵壓縮層之結構化數據（行情、籌碼、營收、宏觀、穿透成分） -->
  </fact_sheet>

  <investor_context desensitized="true">
    <!-- 注入投資人偏好與部位比例（預設脫敏） -->
  </investor_context>

  <six_thinking_hats_instruction>
    <!-- 引導外部 LLM 依照 白、紅、黑、黃、綠、藍帽依序分析 -->
  </six_thinking_hats_instruction>

  <agentic_reflection_gate>
    <!-- 強制外部 LLM 在輸出結論前自我批判：利多是否已被黑帽否定？目標價是否有安全邊際？ -->
  </agentic_reflection_gate>

  <output_format>
    <!-- 結論先行 (Actionable Conclusion)：綜合評級、防守價位、操作建議矩陣 -->
  </output_format>
</investment_decision_prompt>
```

---

## 7. 系統架構與檔案契約 (Architecture & File Topology)

```
src/
├── types/
│   └── strategicPrompt.ts                  # [NEW] 智策提示詞型別契約
├── engine/
│   ├── strategicPromptDigest.ts            # [NEW] 特徵萃取與語意壓縮層 (Token Guard)
│   ├── strategicPromptDigest.test.ts       # [NEW] 壓縮層單元測試
│   ├── strategicPromptEngine.ts            # [NEW] 多維提示詞與六頂思考帽組裝引擎
│   └── strategicPromptEngine.test.ts       # [NEW] 提示詞組裝單元測試
└── components/
    └── analysis/
        ├── StrategicPromptPanel.tsx        # [NEW] 前端多維提示詞一鍵複製與預覽面板
        ├── StrategicPromptPanel.test.tsx   # [NEW] 前端面板渲染與複製測試
        └── StockAnalysisWorkspace.tsx      # [UPDATE] 整合嵌入 StrategicPromptPanel
```

---

## 8. 驗收標準 (Acceptance Criteria)

1. **分流正確性**：
   * 輸入普通個股（如 `2330` 或 `NVDA`），產出《個股大師 V12.0》商業模式、營收與三大報表提示詞。
   * 輸入 ETF（如 `0050` 或 `SPY`），產出《ETF 大師 V3.0》指數品質、動態權重、成本效率與成分穿透提示詞。
2. **Token 嚴格受控**：
   * 單一思考帽 / 單維度 Prompt 實測 Token < 1,200。
   * Master 全量 Prompt 實測 Token < 4,500。
3. **零信任海關與脫敏**：
   * 導出的 XML 必定包含完整 `data_customs_audit` 標籤與交易日定錨資訊。
   * 預設開啟脫敏，導出內容零真實帳戶資金與持倉金額。
4. **六頂思考帽獨立複製**：
   * 前端面板支援一鍵複製 Master 全量 Prompt，亦支援單鍵複製「黑帽批判」、「白帽數據」等獨立章節。
5. **品質與健康度**：
   * `npm test` 測試通過率 100%。
   * `npm run build` TypeScript 檢查 0 錯誤。
