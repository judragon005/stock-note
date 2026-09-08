# Ticket #1: 宏觀指標快照、個人防護盾模型與財經行事曆 (Macro Models & Portfolio Shield)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `Macro` · `WarRoom` · `PortfolioShield` · `Engine`
- **關聯 PRD**：[docs/specs/0094-macro-war-room-and-ai-advisor-spec.md](../../../docs/specs/0094-macro-war-room-and-ai-advisor-spec.md)
- **優先級**：`P2`

---

## 1. 任務目標
1. 建立 `src/types/macro.ts`，定義 `MacroIndicatorSnapshot`、`MacroPortfolioShield`、`UpcomingCatalyst`、`AiMorningBriefDirective` 等型別。
2. 實作個人防護盾試算函式 `calculatePortfolioMacroShield`，自持倉、現金餘額、借貸與再平衡中提煉防守指標。
3. 實作財經行事曆倒數計算函式 `calculateUpcomingCatalysts`。

## 2. 驗收標準
- [ ] 型別定義完整且清晰。
- [ ] 正確計算現金防護比例、質押維持率健康度、配置偏離度。
- [ ] 單元測試驗證行事曆倒數與防護盾指標精度。
