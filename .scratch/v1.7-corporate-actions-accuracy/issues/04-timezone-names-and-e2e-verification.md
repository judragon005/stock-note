# Ticket #4: [Data & Test] 全量交易資料時區校準 (UTC+8) 與端到端全量驗收測試

- **狀態**: Completed
- **PRD**: [PRD v1.7](../../docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md)
- **GitHub Issue**: [#77](https://github.com/judragon003/-/issues/77)

## 任務清單
- [x] 全量 590+ 筆交易資料採用 `Asia/Taipei` (UTC+8) 轉換為台灣本地真實交易日期。
- [x] 校正標的官方正式名稱（009816 凱基台灣TOP50、00403A 主動統一升級50）。
- [x] 執行端到端生命週期模擬：純手動匯入 ➔ 智慧掃描 ➔ 21 檔持股 + 5 檔平倉標的 100% 通過。
- [x] 全量 81 個單元測試綠燈通過。
