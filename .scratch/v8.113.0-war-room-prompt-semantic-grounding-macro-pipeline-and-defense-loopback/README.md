# v8.113.0 任務規劃：戰情室外聯提示詞語意防護、宏觀資券管線穿透與實戰決策閉環 (Spec 0200)

- **版本目標**：v8.113.0
- **關聯規格**：[Spec 0200](../../docs/specs/0200-war-room-prompt-semantic-grounding-macro-pipeline-and-defense-loopback-spec.md)
- **GitHub 關聯 Issue**：[#312](https://github.com/judragon005/stock-note/issues/312)
- **分流標籤**：`ready-for-agent`

## 任務清單與狀態

| 票券編號 | 標題 | 狀態 | 負責檔案 |
| :--- | :--- | :---: | :--- |
| **Ticket 01** | 宏觀數據中介層附掛與資券餘額非 null 回溯演算法 | `completed` | `scripts/market-sync/vite-market-middleware.cjs`<br>`src/engine/marketCacheLoader.ts` |
| **Ticket 02** | 提示詞語意防護、真脫敏修復與 XML 純淨修剪 | `completed` | `src/engine/strategicPromptEngine.ts`<br>`src/engine/aiForcePromptAdapter.ts` |
| **Ticket 03** | 外部 AI 回流協議規範與正則防呆抽取引擎 | `completed` | `src/engine/strategyPinEngine.ts`<br>`src/engine/strategyPinEngine.test.ts` |
| **Ticket 04** | 戰情室一鍵貼入解析器、策略釘選卡片與歷史勝率榜 | `completed` | `src/components/aiForceDashboard/WarRoomPromptCard.tsx`<br>`src/types/strategyPin.ts` |
