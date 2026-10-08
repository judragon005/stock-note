# 0171. 技術債批次清理與架構收斂：SQLite 斷點檢查點複合狀態索引與金鑰管理員視圖解耦

- **狀態 (Status)**: 已採納 (Accepted)
- **日期 (Date)**: 2026-10-08
- **決策者 (Deciders)**: 專案架構團隊
- **關聯規格 (Spec)**: [0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager.md](../specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager.md)
- **關聯任務 (Issue)**: #193
- **關聯技術債**: [Debt 0041](../debts/0041-sync-checkpoints-composite-index-optimization.md) (RESOLVED), [Debt 0045](../debts/0045-unified-api-key-manager-subcomponent-decomposition.md) (RESOLVED)

---

## 1. 背景與脈絡 (Context & Problem Statement)

在專案演進至 v8.82.0 過程中，累積了兩項處於 `OPEN` 狀態的架構技術債：
1. **資料庫檢索效能隱憂 (Debt 0041)**：
   在美股與全市場斷點續傳機制中，`sync_checkpoints` 僅以 `(market, status)` 建立索引，未覆蓋日期欄位。美股與台股標的規模擴張時，依據日期與狀態過濾待同步標的之查詢無法實現覆蓋索引掃描。
2. **單一前端視圖過度膨脹 (Debt 0045)**：
   統一金融 API 金鑰管理員承載了全域 Proxy 通道配置、多供應商金鑰池、多金鑰輪替展開面板、Web Crypto 256-bit 本地加密與單鍵測活冷卻狀態等大量邏輯，全部收斂在單一超過 1,000 行的元件檔案中，違背單一職責原則 (SRP)。

---

## 2. 決策內容 (Decision Drivers & Strategy)

### 2.1 SQLite 斷點檢查點複合狀態索引優化 (Debt 0041)
- 於 `scripts/market-sync/sqlite-db-core.cjs` 追加複合狀態索引：
  ```sql
  CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_lookup ON sync_checkpoints(market, status, last_success_date);
  ```
- 於 `src/engine/sqliteLakehouseCore.test.ts` 加入單元測試驗證，確保 `EXPLAIN QUERY PLAN` 命中複合索引，使狀態與日期檢索在萬級標的規模下維持 $O(1)$ 常數時間效能。

### 2.2 金鑰管理員視圖元件模組化解耦 (Debt 0045)
- 依據單一職責原則 (SRP) 拆解子元件：
  1. **`GlobalProxyConfigCard.tsx`**：負責自訂反向代理伺服器 (Proxy URL) 端點輸入與儲存操作。
  2. **`ApiKeyProviderCard.tsx`**：負責單一供應商的說明資訊、SEC EDGAR 免 Key 指南、主要作用金鑰輸入、輪替備援金鑰新增表單、金鑰清單展示、探針健康燈號與單鍵防連點測活操作。
  3. **`UnifiedApiKeyManager.tsx`**：作為輕量化狀態調度容器，管理金鑰池資料持久化、測活冷卻排程與外部變更通知，行數由 1,014 行縮減至 390 行。
- 主元件之公開 Props (`initialApiKeys`, `onApiKeysChange`) 與匯出常數 (`PROVIDER_CONFIGS`, `DISPLAYED_PROVIDERS`) 保持 100% 向後相容。

### 2.3 技術債看板閉環 (Debt Tracker Closure)
- 將 Debt 0041 與 Debt 0045 狀態更新為 `RESOLVED`。
- 技術債看板 (`docs/debts/README.md`) 達成 **0 OPEN Debts** 里程碑。

---

## 3. 狀態與影響 (Consequences & Status)

### 正向影響 (Positive)
- ✅ 萬檔標的查詢效能保障：資料庫狀態與日期檢索完全利用覆蓋索引。
- ✅ 前端代碼結構清晰易讀：單一巨石視圖拆解為高內聚、低耦合的呈現元件與容器元件。
- ✅ 零功能與體驗退化：Dark Glassmorphism 樣式與互動行為 100% 保持一致。
- ✅ 達成專案 0 未結技術債 (0 OPEN Debts) 里程碑。
- ✅ 全專案 205 個測試檔、1,502 個測試 100% 綠燈，TypeScript 0 錯誤。
