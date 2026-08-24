# Ticket #2: [Types/Storage] API Key 設定型別定義與隔離持久化機制

- **狀態**: Completed
- **規格書**: [SPEC-0016](../../../docs/specs/0016-settings-workspace-and-api-key-configuration.md)
- **架構決策**: [ADR-0016](../../../docs/adr/0016-settings-workspace-and-api-key-configuration.md)

---

## 任務目標 (Objective)
定義 `ApiKeysConfig` 型別，並實作安全隔離的 LocalStorage 存取工具函式。

---

## 實作範圍 (Scope)
1. **型別定義 (`src/types/stock.ts`)**：
   - 定義 `ApiKeysConfig`（包含 `finmindToken`, `fmpApiKey`, `alphaVantageKey`, `customProxyUrl`）。
2. **儲存管理 (`src/utils/storage.ts` & `storage.test.ts`)**：
   - 實作 `loadApiKeysConfig()` 與 `saveApiKeysConfig()`。
   - 儲存鍵值：`STOCK_TRACKER_API_KEYS_V1`。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 支援讀取與保存四組金鑰設定。
- [ ] 單元測試 100% 覆蓋。
