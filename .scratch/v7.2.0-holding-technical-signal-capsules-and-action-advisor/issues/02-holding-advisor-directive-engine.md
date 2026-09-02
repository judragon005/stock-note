# Issue 02: 持股操作建議專家矩陣與建議文字生成引擎 (Holding Action Advisor Engine)

- **狀態**：`COMPLETED`
- **優先級**：`P1`
- **對應規格**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../../../docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)
- **標籤**：`ready-for-agent` · `Engine` · `Advisor` · `TDD`

---

## 1. 任務目標
1. 實作 `src/engine/holdingAdvisorEngine.ts`：
   - 封裝 `evaluateHoldingActionDirective(signals: HoldingSignal[], indicators?: TechnicalIndicators): HoldingActionDirective`。
   - 計算訊號加權總分 $\text{Score} = \sum \text{Signal.weight}$。
   - 依據加權評分與特定形態（如超賣窒息、多頭排列、均線跌破、高檔爆量）產出四字定調（如 `【強勢續抱】`、`【逢高減碼】`、`【超跌留意】`、`【盤整觀望】`、`【嚴設停損】`）與客觀紀律性具體操作指南。
   - 預留 `buildAiAdvisorPromptPayload(holding, signals, directive)` 輔助函式供未來 AI 深度解讀調用。
2. 編寫 `src/engine/holdingAdvisorEngine.test.ts`：
   - 測試多頭強勢、空頭破位、超跌反彈、震盪盤整等各種情境輸出是否精確無誤。

---

## 2. 驗收標準
- [ ] `holdingAdvisorEngine.test.ts` 測試案例 100% 通過。
- [ ] 無訊號或訊號不足時輸出中性觀望評定，不拋出錯誤。
