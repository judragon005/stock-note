# Ticket #2: 雙軌制 AI 智慧作戰方針決策引擎 (Deterministic AI Advisor Engine)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `AI-Advisor` · `Macro` · `RuleEngine` · `Prompt`
- **關聯 PRD**：[docs/specs/0094-macro-war-room-and-ai-advisor-spec.md](../../../docs/specs/0094-macro-war-room-and-ai-advisor-spec.md)
- **優先級**：`P2`

---

## 1. 任務目標
1. 實作離線確定性專家規則系統 `generateAiMorningBrief`：
   - 整合 VIX 位階、殖利率倒掛、個人現金購買力防禦度、質押維持率與資產配置偏離度。
   - 輸出四字定調（如 `【防禦蓄勢・分批低接】`、`【獲利調節・拉高現金】`、`【極端避險・嚴守防線】`、`【安全巡航・維持紀律】`）。
   - 輸出宏觀診斷、防護盾評語與具體執行清單。
2. 實作 `buildLlmPromptPayload`，生成符合 Gemini / Claude 的標準結構化 JSON Payload。
3. 撰寫單元測試覆蓋多種典型與極端市場情境。

## 2. 驗收標準
- [ ] 確定性專家規則系統 100% 離線可用且無幻覺。
- [ ] 測試涵蓋極度恐慌+低現金、極度恐慌+高現金、市場亢奮過熱、常態平穩等場景。
- [ ] 100% 通過單元測試，TypeScript 0 錯誤。
