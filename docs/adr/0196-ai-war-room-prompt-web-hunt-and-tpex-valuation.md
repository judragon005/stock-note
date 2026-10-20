# 0196 ADR: AI 主力戰情室外聯提示詞受控聯網獵犬協議、上櫃資券與官方 PE/PB 湖倉管線

## 狀態 (Status)
`APPROVED` (2026-10-20)

## 關聯規格與任務 (Context & Specs)
- **規格書：** [`docs/specs/0196-ai-war-room-prompt-web-hunt-and-tpex-valuation-pipeline-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0196-ai-war-room-prompt-web-hunt-and-tpex-valuation-pipeline-spec.md)
- **前置 ADR：** ADR 0181, ADR 0194, ADR 0195
- **關聯 Issue：** #292

## 決策背景 (Context)
在以 4979 華星光（上櫃）與 3260 威剛（上櫃）進行 AI 主力戰情室實盤演練時，發現四大關鍵斷點：
1. **外聯 LLM 幻覺與時空漂移**：外部 AI 常將基準時間倒退至 2024~2025 年、採信陳舊財報，或聯網搜尋到未證實內容覆蓋本地確定性量價數據。
2. **缺乏即時結論與標準化實戰契約**：生成之提示詞長篇大論，缺乏第一行直覺燈號與進場/目標/停損/失效 3 欄式點位表，且缺少對週期股循環高峰的風險質詢。
3. **上櫃 (TPEx) 融資融券與信用交易缺口**：既有管線僅抓取 TWSE 上市資券，導致上櫃標的融資融券欄位為空或零。
4. **官方 PE / PB / 殖利率未沉澱於 SQLite**：既有 Card 21 估值卡仰賴外部即時 API 動態計算，無每日盤後全市場快照。

## 架構決策 (Decision)

### 1. 2026 時空錨點與受控聯網獵犬協議 (Web Hunt Protocol)
- 在 Master Prompt 頂部注入 `<temporal_grounding_anchor>`，鎖定世界基準時間為 2026 年，提供錨定日期與盤中時間戳。
- 注入 `<web_retrieval_instructions>`：
  - 觸發條件：僅允許在資料包含【待同步】或 N/A 欄位時啟動聯網補充。
  - 白名單來源：MOPS、TWSE、TPEx、Yahoo 股市、權威財經日報。
  - 效期自證：搜尋到之訊息必須為 2026 年，舊文強制無效。
  - SSOT 本地最高優先級：禁止覆蓋本提示詞提供的當前現價、均線價格、箱型支撐與主力 VWAP 成本。
  - 預估與實績強制隔離：機構推估值必須明確標註【法人推估（未實現）】。

### 2. 輸出格式契約升級與 Token 門禁壓縮
- `<output_format>` 強化：
  - 第一行唯一指令：必須為 🟢 建議建立部位 / 🟡 觀望等待確認 / 🔴 嚴禁進場 三者之一。
  - 實戰作戰點位表：3 欄式 Markdown 表格（進場防守位、反彈目標價、保命停損價、依據、失效條件）。
  - 下檔暴雷風險質詢：強制點名當前最致命的 2 個暴雷點。
- 精煉六頂思考帽文字，將 Master Prompt 嚴格控制在 4,500 tokens 門禁之內。

### 3. TPEx 官方 OpenAPI 全市場融資融券同步
- 介接 TPEx 官方 OpenAPI：`https://www.tpex.org.tw/openapi/v1/tpex_mainboard_margin_balance`。
- 實作 `parseTpexMargin`，每日盤後全市場整包同步，補齊上櫃標的之融資融券餘額與券償增減。

### 4. TWSE / TPEx 每日官方 PE / PB / 殖利率沉澱與 SQLite 快取
- 建立 `tw_valuation_daily` 資料表（`symbol`, `date`, `pe`, `pb`, `dividend_yield`, `updated_at`）。
- 介接 TWSE BWIBBU 與 TPEx PERATIO OpenAPI，每日盤後存入 SQLite，並整合至 `tw_market_summary.json`。

### 5. 戰情室單季財報 EPS/毛利貫通與籌碼特徵深化
- 非阻塞調用 `loadOrFetchFinancialReport`，提取最新單季 EPS 與毛利率注入戰情室報表。
- 在 `aiForcePromptAdapter` 計算外資與投信佔 20 日均量比率（`foreignRatio20D`、`trustRatio20D`）。
- 實作盤中量 `<= 0` 時回退標記前一交易日收盤量之機制（`intradayVolumeNote`）。

## 後果與影響 (Consequences)
- **正面效益**：
  - 戰情室 Prompt 複製至 ChatGPT/Claude/DeepSeek 時，徹底杜絕 2024~2025 年時空幻覺與野雞資訊干擾。
  - 上櫃股票（如 4979、3260）獲得完整的官方資券與 PE/PB 估值支援。
  - 輸出契約保證 0 秒獲取唯一方向燈號與精準實戰點位。
- **維護代價**：
  - 後端每日定時排程需同步維護 TPEx OpenAPI，若端點改版需仰賴單元測試及時預警。
