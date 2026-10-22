# ADR 0201: 戰情室外部 AI 多智囊團並行回流、模型去重覆蓋與法人風控共識防線架構 (Multi-AI Syndicate Loopback & Consensus Defense)

## 狀態 (Status)
**已接受 (Accepted)** - 對應 PR [#319](https://github.com/judragon005/stock-note/pull/319) & PR [#320](https://github.com/judragon005/stock-note/pull/320) (關聯 Issue #318)

## 上下文與問題陳述 (Context & Problem Statement)
在 Spec 0200 實作戰情室外部 AI 回流機制後，系統僅支援單一外部 AI 裁決釘選。當使用者貼入新裁決時，既有紀錄會被無差別覆蓋。
但在真實法人與散戶實戰中，投資者往往會同時向多家頂級模型（Claude 3.5 分析籌碼、Perplexity 查核最新法說新聞、ChatGPT 進行宏觀推演）獲取作戰計畫。
缺乏「多模型並存與對比」帶來以下隱患：
1. **模型名稱語意發散**：各 AI 模型回傳名稱格式不一（如 `Claude 3.5 Sonnet` 與 `claude-3-5-sonnet-20241022`），若以原始字串作為鍵值，會造成同模型去重覆蓋失效、列表膨脹碎片化。
2. **法人風控存活偏差 (Survival Bias)**：當不同 AI 給出高低不一的停損價時，投資者極易產生心理凹單（例如跌破 Claude 保守停損線時，自我安慰 ChatGPT 寬鬆防線還沒破）。
3. **戰績歸屬與勝率榜失真**：舊版結案一刀切刪除，無法精確將戰績獨立歸屬給特定模型。
4. **存儲升級相容性風險**：LocalStorage 若由單一物件直接轉為陣列，舊版使用者開啟時會引發 `TypeError` 白屏崩潰。

## 架構決策 (Decision Drivers & Architecture)
嚴格遵守 KISS 原則（拒絕過度工程、拒絕引入繁複微服務、零資料庫遷移成本），採純前端第一性原理架構：

1. **模型名稱語意正規化 (`normalizeAiModelName`)**：
   - 建立正規表達式字典，將常見變體自動標準化映射至 `Claude 3.5 Sonnet`, `ChatGPT-4o`, `Perplexity`, `Gemini 1.5 Pro`，未知模型保留清洗後字串，去重覆蓋率 100%。
2. **多模型並存與同名覆蓋 (`savePinnedStrategy`)**：
   - 儲存結構以 `symbol + normalizedModel` 為唯一識別。同名模型自動以後者覆蓋更新舊版；不同模型並列儲存於陣列中。
3. **全域正則批次抽取 (`parseLoopbackContentBatch`)**：
   - 使用 `/```(?:json)?\s*([\s\S]*?)\s*```/g` 全域掃描，單次貼入長文即可批次解析多個合法 AI 裁決代碼塊。
4. **雙軌向下相容讀取 (`getPinnedStrategies`)**：
   - 在 LocalStorage 讀取層封裝 Adapter，若讀出 Legacy 單一物件自動包裹為長度為 1 之陣列，保證 100% 向下相容、零白屏崩潰風險。
5. **最嚴格保命停損優先警報 (`evaluateMultiStrategyTriggers`)**：
   - 盤中即時評估取有效模型中最高停損價（`Math.max(...stopLosses)`）作為第一道保命防線，跌破立刻報警並指名發起模型，徹底封死主觀凹單。
6. **極簡共識與分歧指標**：
   - 計算停損點落差比率：$<2\%$ 標註為「🛡️ 智囊團共識防線」；$>5\%$ 標註為「⚡ 智囊團分歧警告 (建議縮小部位)」。
7. **單卡結案與全隊一鍵結案**：
   - 每張模型卡片具備獨立 `WIN` / `LOSS` 按鈕，精確累積智囊團勝率榜；清倉時提供「全隊達標」與「全隊停損」一鍵全員結案。
8. **緊湊條列排版 (Compact UI)**：
   - 單行高度約 38px，提取樣式 Tokens（`SYNDICATE_ROW_STYLE`, `OUTCOME_BTN_WIN_STYLE`），高密度呈現，不遮擋上方技術線圖。

## 後果與影響 (Consequences)
- **正面影響 (Positive)**：
  - 投資者可在戰情室同時獲得多模型智囊團的點位交叉驗證與分歧度預警。
  - 防範人性心理凹單，強制嚴格紀律執行。
  - 勝率榜真實反映各模型的預測實力。
  - 零後端成本、零 migration 損壞。
- **負面影響 (Negative)**：
  - 若使用者貼入無效格式或模型過多（超過 5 家以上），需依賴緊湊條列清單滾動呈現。
