# Ticket #2: [Engine] 實作台股現金減資整數換發 (Floor New Ratio) 演算法與縮減股數精確化

- **狀態**: Completed
- **PRD**: [PRD v1.7](../../docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md)
- **GitHub Issue**: [#75](https://github.com/judragon003/-/issues/75)

## 任務清單
- [x] 依台股集保結算規定，現金減資換發新股採向下取整 (`Math.floor`)。
- [x] 縮減股數公式精確為 `sharesHeld - Math.floor(sharesHeld * (1 - reductionRatio))`。
- [x] 泰銘 (9927) 10,000 股現金減資 71.72% 精確扣減 2,829 股（換發 7,171 股）。
- [x] 通過單元測試驗證。
