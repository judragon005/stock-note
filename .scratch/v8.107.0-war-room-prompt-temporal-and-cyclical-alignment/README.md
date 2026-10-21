# Spec 0194 本地鏡像：戰情室外聯提示詞時態一致性、景氣循環判定與法人風控對齊

關聯 GitHub Issue: https://github.com/judragon005/stock-note/issues/288

## 核心規格與決策
- 需求規格說明書：[docs/specs/0194-war-room-prompt-temporal-and-cyclical-alignment-spec.md](../../docs/specs/0194-war-room-prompt-temporal-and-cyclical-alignment-spec.md)
- 架構決策紀錄：[docs/adr/0194-war-room-prompt-temporal-and-cyclical-alignment.md](../../docs/adr/0194-war-room-prompt-temporal-and-cyclical-alignment.md)
- 分流標籤：`enhancement`, `ready-for-agent`
- 當前狀態：實作完成 (`completed`)，測試 100% 綠燈，打包通過

## 任務票券清單 (Tickets Index)

| 編號 | 檔案 | 狀態 | 阻擋依賴 (Blocked by) |
| :--- | :--- | :--- | :--- |
| **01** | [01-cyclical-symbols-adata-phison.md](issues/01-cyclical-symbols-adata-phison.md) | `completed` | None |
| **02** | [02-intraday-volume-consistency-adapter.md](issues/02-intraday-volume-consistency-adapter.md) | `completed` | None |
| **03** | [03-temporal-isolation-and-pending-disclaimer.md](issues/03-temporal-isolation-and-pending-disclaimer.md) | `completed` | None |
| **04** | [04-deterministic-stop-loss-status.md](issues/04-deterministic-stop-loss-status.md) | `completed` | None |
| **05** | [05-sbl-foreign-borrowing-dimension.md](issues/05-sbl-foreign-borrowing-dimension.md) | `completed` | None |
| **06** | [06-war-room-prompt-e2e-regression.md](issues/06-war-room-prompt-e2e-regression.md) | `completed` | 01, 02, 03, 04, 05 |
