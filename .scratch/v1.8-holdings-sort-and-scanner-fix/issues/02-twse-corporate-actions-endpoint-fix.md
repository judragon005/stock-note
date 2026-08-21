# Ticket #2: [Scanner] 校正台灣證交所 OpenAPI 端點職責並建立無效減資安全閘門

- **狀態**: Completed
- **GitHub Issue**: [#81](https://github.com/judragon003/-/issues/81)
- **規格書**: [SPEC-0009](../../docs/specs/0009-holdings-natural-sorting-and-twse-scanner-fix.md)
- **架構決策**: [ADR-0009](../../docs/adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)

## 任務清單
- [x] 於 `src/engine/corporateActionScanner.ts` 中修正 `fetchTWSECapitalReductions`，移除對除權除息預告表 `TWT48U_ALL` 的誤調用。
- [x] 於 `fetchTWSEDividends` 中正確解析 `TWT48U_ALL` 的現金股利與股票股利資訊。
- [x] 建立安全過濾防線：過濾所有變更股數為 0 且金額為 0 之減資事件，防止 9927 泰銘產生 2026-10-01 假減資。
- [x] 撰寫單元測試 `src/engine/corporateActionScanner.test.ts`，驗證 9927 在智慧掃描時不會產出 2026-10-01 減資退款事件。
