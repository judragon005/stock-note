# Ticket 03: 外部 AI 回流協議規範與正則防呆抽取引擎

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0200](../../../docs/specs/0200-war-room-prompt-semantic-grounding-macro-pipeline-and-defense-loopback-spec.md)
- **關聯 Issue**：#312

## 任務目標
1. 在提示詞生成末尾注入 `<loopback_protocol_directive>`，強制外部 AI 在長文結尾輸出標準 JSON 代碼塊（包含 `symbol`, `aiModel`, `verdict`, `stopLoss`, `takeProfit`, `trendReversal`, `validityDays`）。
2. 新增核心純函數引擎 `src/engine/strategyPinEngine.ts`：
   - 實作 `parseLoopbackContent`：即使傳入包含數千字 Markdown 的整篇回答，亦能以容錯正則秒級抽取標準 JSON。
   - 實作 `sanitizePriceNumber`：提純 `153.46元`、`$167.7` 等夾帶中英文符號的髒字元。
   - 實作 `evaluatePinStatus`：檢驗策略是否過期（預設 5 天）、是否觸碰停損或突破翻多點。
   - 實作 LocalStorage 儲存、更新與歷史 20 筆勝率記錄管理邏輯。
3. 撰寫 `src/engine/strategyPinEngine.test.ts` 達到 100% 覆蓋率。
