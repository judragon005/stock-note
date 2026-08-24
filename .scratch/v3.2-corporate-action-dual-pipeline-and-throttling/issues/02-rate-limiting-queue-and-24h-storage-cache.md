# Ticket #2: [Engine/Security] 受控節流限速佇列與 24 小時實體快取防禦機制

- **狀態**: Completed
- **規格書**: [SPEC-0015](../../../docs/specs/0015-corporate-action-dual-pipeline-and-rate-limiting.md)
- **架構決策**: [ADR-0015](../../../docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)

---

## 任務目標 (Objective)
在公司行動掃描引擎中引入嚴格的頻率限制 (Throttling) 與 24 小時 LocalStorage 實體快取，徹底防止大批量交易發送高頻並行請求觸發遠端 API 的 HTTP 429 限制或 IP 封鎖。

---

## 實作範圍 (Scope)
1. **並行與節流佇列 (`src/engine/corporateActionScanner.ts`)**：
   - 設定並行度限制 `concurrency: 2`。
   - 每個標的查詢後加入 150ms 節流延遲 (Jittered Delay)。
   - 實作單次請求 4 秒超時熔斷保護。
2. **24 小時實體快取 (`STOCK_TRACKER_CA_CACHE_V1`)**：
   - 成功抓取之標的歷史除權息事件存入 LocalStorage，TTL 設定為 24 小時。
   - 再次開啟掃描時優先讀取快取（Cache-First），0 外部網路請求。
   - 支援 `forceRefresh` 一鍵清空快取重新抓取。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 386 筆交易掃描時平滑發送請求，絕不觸發 429 錯誤。
- [ ] 第二次掃描相同標的時直接從快取載入，耗時 < 100ms。
