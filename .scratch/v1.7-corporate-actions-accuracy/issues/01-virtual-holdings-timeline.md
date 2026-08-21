# Ticket #1: [Engine] 實作虛擬時序動態配股推進器 (Virtual Holdings Timeline) 與多次配股動態累加計算

- **狀態**: Completed
- **PRD**: [PRD v1.7](../../docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md)
- **GitHub Issue**: [#74](https://github.com/judragon003/-/issues/74)

## 任務清單
- [x] 於 `src/engine/corporateActionScanner.ts` 中實作虛擬時序副本 `virtualTrades`。
- [x] 遍歷歷史事件時，將未入帳之除權配股與分割即時寫入時序副本。
- [x] 確保 2890 永豐金歷年除權配股（2023配200、2024配275、2025配850）精確累加 1,325 股。
- [x] 通過單元測試驗證。
