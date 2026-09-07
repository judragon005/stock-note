# Issue #0090-03: 整合 fetchWithCORSProxy 與既有測試綠燈驗證 (Integration & Zero-Regression)

- **標籤**：`ready-for-agent` · `Integration` · `Refactor` · `Verification`
- **對應規格**：[PRD #0090](../../../docs/specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md)
- **優先級**：`P1`

---

## 任務描述
1. 將 `ClientRequestScheduler` 全域單例整合進 `src/engine/priceFetcher.ts` 的 `fetchWithCORSProxy`。
2. 確保每次發出外部網路請求時，皆透過排程器自動進行 Domain 萃取、Token 消耗、並發槽位占用與 429 熔斷偵測。
3. 導出全域單例與指標查詢介面，方便 DevTools 或後續戰情室面板監控。
4. 執行全量 `npm test` 與 `npm run build`，確保 0 錯誤與 0 回歸。

## 驗收條件 (Acceptance Criteria)
- [ ] `fetchWithCORSProxy` 呼叫時自動受排程器保護。
- [ ] 全專案單元測試 100% 通過，TypeScript 編譯零錯誤。
