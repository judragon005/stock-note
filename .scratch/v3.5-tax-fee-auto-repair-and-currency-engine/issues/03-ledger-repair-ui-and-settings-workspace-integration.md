# Ticket #3: [UI/UX] 歷史帳本一鍵智慧修復橫幅與設定工作台看板整合

- **狀態**: TODO
- **規格書**: [SPEC-0018](../../../docs/specs/0018-tax-fee-auto-repair-and-currency-engine.md)
- **架構決策**: [ADR-0018](../../../docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)

## 任務清單
- [ ] 在歷史交易帳本與設定工作台中，若檢測到異常稅費紀錄，顯示發光提示橫幅與 `[🛠️ 一鍵智慧拆分修復]` 按鈕。
- [ ] 點擊修復時執行 `repairLedgerTaxAndFee`，即時更新 state 並持久化至 LocalStorage，跳出修復成功 Toast（提示修正了 X 筆交易）。
- [ ] 在 `SettingsWorkspace.tsx` 與 `FrictionCenterModal.tsx` 中完整展示拆分後的台股已繳證交稅、二代健保、美股 30% 預扣稅與真實券商折讓省下金額。
- [ ] 執行全量 `npm test` 與 `npm run build` 驗證。
