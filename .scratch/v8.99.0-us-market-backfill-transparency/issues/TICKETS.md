# Issue #266 任務細緻拆解 (Micro-Tickets Breakdown)

本任務集對齊 Issue [#266](https://github.com/judragon005/stock-note/issues/266)、[Spec 0186](../../../docs/specs/0186-us-market-backfill-transparency-lakehouse-alignment-and-eperm-resilience-spec.md) 與 [ADR 0186](../../../docs/adr/0186-us-market-backfill-transparency-lakehouse-alignment-and-eperm-resilience.md)，依據**切片原則（Vertical Slice & KISS）** 將美股歷史回補透明度透視、斷點庫存對齊與 Windows EPERM 韌性強化拆分為 **4 個獨立可驗收的 Micro-Tickets**，落實 TDD 紅-綠-重構循環。


---

## Ticket 清單總覽

| 票券編號 | 類型 | 模組標題 | 影響範圍 | 驗收標的 | 狀態 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Ticket 01** | `IO/OS` | `saveJsonAtomic` Windows EPERM 退避重試與安全覆寫 | `scripts/market-sync/market-sync-core.cjs` | 增加 5 次自旋退避重試，若重命名持續被鎖定則安全降級為 copy+unlink 或覆寫，杜絕 EPERM 崩潰 | ✅ **已完成** |
| **Ticket 02** | `Engine/Lakehouse` | 美股全回補狀態擴充在庫標的統計 | `scripts/market-sync/backfill-full-market-history.cjs` | 透過 `sync_checkpoints` 索引查詢美股已成功同步之在庫數（< 5ms），賦予 `us.totalInLakehouse` | ✅ **已完成** |
| **Ticket 03** | `UI/UX` | 回補控制台美股標的卡片語意透視化 | `src/components/MarketScheduleHubSection.tsx` | 展示美股在庫標的數（如 `1,448 檔`）與 `⚡ 快取/斷點在庫` 標籤，有增量時呈現 `(+X 新增)` | ✅ **已完成** |
| **Ticket 04** | `Test/Verification` | 單元測試擴充與全專案回歸驗證 | `src/components/MarketScheduleHubSectionBackfill.test.tsx` | 覆蓋 `totalInLakehouse` 渲染邏輯，`npm test` 100% 綠燈，`npm run build` 0 錯誤 | ✅ **已完成** |


---

## 各 Ticket 細部規格

### Ticket 01: `saveJsonAtomic` Windows EPERM 退避重試與安全覆寫
- **目標**：在 `scripts/market-sync/market-sync-core.cjs` 中強化 `saveJsonAtomic` 防禦力。
- **實作規範**：
  - 暫存檔名加入隨機後綴避免撞名。
  - 捕捉 `EPERM` 與 `EBUSY`，進行最多 5 次退避延遲。
  - 退避後仍受阻則以 `fs.copyFileSync` + `fs.unlinkSync` 或安全覆寫兜底。

### Ticket 02: 美股全回補狀態擴充在庫標的統計
- **目標**：在 `scripts/market-sync/backfill-full-market-history.cjs` 的 `backfillGlobalStatus.us` 新增 `totalInLakehouse` 與 `skippedCount`。
- **實作規範**：
  - 美股回補結束或狀態更新時，執行極速索引查詢：
    ```sql
    SELECT count(*) AS n FROM sync_checkpoints WHERE market = 'US' AND status = 'SUCCESS';
    ```
  - 將計數同步至 `backfillGlobalStatus.us.totalInLakehouse`。

### Ticket 03: 回補控制台美股標的卡片語意透視化
- **目標**：在 `src/components/MarketScheduleHubSection.tsx` 中對齊美股卡片呈現邏輯。
- **實作規範**：
  - 在卡片數值呈現上：若 `us.totalInLakehouse > 0` 優先展示 `${us.totalInLakehouse} 檔`；若當次有新增（`us.successCount > 0`），以小字呈現 `(+${us.successCount} 新增)`。
  - 卡片下方增加提示文字或 Badge：`⚡ 快取/斷點在庫 ${us.totalInLakehouse} 檔`。

### Ticket 04: 單元測試擴充與全專案回歸驗證
- **目標**：更新與新增相關測試，確保向後相容與正確性。
- **驗收標的**：
  - `src/components/MarketScheduleHubSectionBackfill.test.tsx` 驗證美股在庫標的展示。
  - 執行 `npm test` 與 `npm run build` 確保全量通過。
