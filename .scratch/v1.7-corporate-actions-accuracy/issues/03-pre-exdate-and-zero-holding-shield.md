# Ticket #3: [Engine] 實作除權息 T-1 基準日收盤判定與零持股平倉安全守護

- **狀態**: Completed
- **PRD**: [PRD v1.7](../../docs/specs/v1.7_corporate_actions_and_trades_cleaning_spec.md)
- **GitHub Issue**: [#76](https://github.com/judragon003/-/issues/76)

## 任務清單
- [x] 依證券法規，除權除息計算以除權基準日前一日 $(T-1)$ 收盤在倉為基準。
- [x] 實作零持股平倉安全守護 (Zero-Holding Shield)，最新在倉為 0 股者自動標記歷史配股為已結清。
- [x] 歷史平倉標的（5312 寶島科、3056 富華新、1808 潤隆、2884 玉山金、2371 大同）100% 保持 0 股。
- [x] 通過單元測試驗證。
