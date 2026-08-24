# Ticket #1: [Data/Model] 券商帳戶實體定義、主流券商範本庫與平滑自動遷移引擎 (TDD)

- **狀態**: Completed
- **規格書**: [SPEC-0013](../../../docs/specs/0013-multi-broker-account-and-friction-cost-engine.md)
- **架構決策**: [ADR-0013](../../../docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)

## 任務清單
- [ ] 在 `src/types/stock.ts` 中新增 `BrokerAccount`、`USFeeType` 與 `FrictionSummary` 介面定義，並在 `TradeRecord` 加入可選的 `accountId?: string`。
- [ ] 在 `src/utils/storage.ts` 中建立主流券商範本字典 `DEFAULT_BROKER_PRESETS`（包含國泰 2.8 折、永豐 2 折、富邦 1.8 折、元大 6 折、美股免手續費、美股複委託等）。
- [ ] 在 `src/utils/storage.ts` 中實作 `loadBrokerAccountsFromStorage`、`saveBrokerAccountsToStorage` 與 `getAccountById`。
- [ ] 實作平滑自動遷移：當載入既有交易時，若缺少 `accountId`，自動歸屬至預設台股或美股帳戶，確保歷史資料 100% 完整相容。
- [ ] 撰寫單元測試 `src/utils/storage.test.ts` 驗證帳戶讀寫、預設範本與自動遷移。
