# Spec 0188 實作任務總表 (Tickets Overview)

關聯規格：[Spec 0188](../../docs/specs/0188-full-market-all-history-lakehouse-and-preload-decoupling-spec.md)
關聯 Issue：[#271](https://github.com/judragon005/stock-note/issues/271)
功能分支：`feature/271-lakehouse-full-history-and-preload`

| 票券編號 | 標題 | 依賴 (Blocked by) | 狀態 | 檔案 |
| :--- | :--- | :--- | :---: | :--- |
| **Ticket 01** | 湖倉索引補強與入庫深度解耦 | None | `closed` | [`01-storage-depth-and-indexing.md`](issues/01-storage-depth-and-indexing.md) |
| **Ticket 02** | 歷史修剪器安全封印 | Ticket 01 | `closed` | [`02-retention-pruning-neutralization.md`](issues/02-retention-pruning-neutralization.md) |
| **Ticket 03** | 中介層 API 動態 Limit 查詢與預載視窗對齊 | Ticket 01 | `closed` | [`03-api-dynamic-limit-and-preload.md`](issues/03-api-dynamic-limit-and-preload.md) |
| **Ticket 04** | 大盤基準 SPY/TAIEX 假數據拔除 | Ticket 03 | `closed` | [`04-zero-mock-benchmark-spy-taiex.md`](issues/04-zero-mock-benchmark-spy-taiex.md) |
| **Ticket 05** | 歷史淨值回推與除權息 Lakehouse-First 本地優先 | Ticket 03 | `closed` | [`05-lakehouse-first-routing.md`](issues/05-lakehouse-first-routing.md) |
| **Ticket 06** | 雙軌回補 UI 進度分離與看門狗尾盤自動補漏 | Ticket 01 | `closed` | [`06-backfill-resilience-and-ux.md`](issues/06-backfill-resilience-and-ux.md) |
