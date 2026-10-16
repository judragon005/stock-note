# Spec 0189 實作任務總表 (Tickets Overview)

關聯規格：[Spec 0189](../../docs/specs/0189-smart-gap-backfill-and-zero-delay-cache-spec.md)
關聯 Issue：[#273](https://github.com/judragon005/stock-note/issues/273)
功能分支：`feature/273-smart-gap-backfill-and-zero-delay-cache`

| 票券編號 | 標題 | 依賴 (Blocked by) | 狀態 | 檔案 |
| :--- | :--- | :--- | :---: | :--- |
| **Ticket 01** | 台股湖倉水位線與缺口自動探測核心 (`detectTwDateGaps`) | None | `closed` | [`01-detect-tw-date-gaps.md`](issues/01-detect-tw-date-gaps.md) |
| **Ticket 02** | 真·零延遲快取跳過與 ETA 時間權重校準 (Zero-Delay Cache Skip) | None | `closed` | [`02-zero-delay-cache-skip-and-eta.md`](issues/02-zero-delay-cache-skip-and-eta.md) |
| **Ticket 03** | 總控引擎與中介層端點自適應回補整合 (`days=auto` & 美股日常增量) | Ticket 01, Ticket 02 | `closed` | [`03-backfill-all-auto-and-us-daily.md`](issues/03-backfill-all-auto-and-us-daily.md) |
| **Ticket 04** | 排程中心控制台 UI 顆粒度升級與智慧補缺預設 (`MarketScheduleHubSection`) | Ticket 03 | `closed` | [`04-ui-schedule-hub-granularity.md`](issues/04-ui-schedule-hub-granularity.md) |
| **Ticket 05** | 端到端全量驗收、文檔同步與交付閉環 | Ticket 01, 02, 03, 04 | `closed` | [`05-e2e-verification-and-handoff.md`](issues/05-e2e-verification-and-handoff.md) |
