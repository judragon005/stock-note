# Ticket #2: [UI/UX] 頂部折讓率快速設定面板與 100% 像素級對帳看板驗證

- **狀態**: Completed
- **GitHub Issue**: [#92](https://github.com/judragon003/-/issues/92)
- **規格書**: [SPEC-0012](../../../docs/specs/0012-broker-fee-discount-and-cost-basis-alignment.md)
- **架構決策**: [ADR-0012](../../../docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)

## 任務清單
- [x] 在 `src/utils/storage.ts` 中實作 `loadBrokerFeeDiscountFromStorage` 與 `saveBrokerFeeDiscountToStorage`。
- [x] 在 `src/components/Header.tsx` 實作折讓率選擇切換（1.0 全額牌告 / 0.6 6折 / 0.28 2.8折 / 自訂），支援即時聯動。
- [x] 在 `src/App.tsx`、`SummaryCards.tsx`、`HoldingsTable.tsx` 串接並驗證總覽看板數值：
  - 庫存總市值：`13,126,007`
  - 總付出成本：`11,141,644`
  - 損益試算：`1,984,363` (`▲ 17.81%`)
- [x] 執行端到端驗證與 `npm test`，確保 100% 綠燈與 0 錯誤。
