# 子任務票券 #10: 全量回歸測試、ADR 歸檔與技術債看板同步 (Full Regression & Debt Docs Sync)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `docs/debts/README.md`
  - `docs/debts/0002-trade-plan-and-discipline-review.md`
  - `docs/debts/0016-stop-loss-take-profit-alerts-and-risk-badges.md`
  - `docs/debts/0010-benchmark-comparison-and-quant-metrics.md`
  - `docs/adr/0041-trade-discipline-risk-alerts-and-quant-benchmark.md`

---

## 🎯 任務目標
1. 執行全專案單元測試 `npm test`（確保 100% 通過）與 `npm run build`（TypeScript 0 錯誤）。
2. 建立架構決策紀錄 `docs/adr/0041-trade-discipline-risk-alerts-and-quant-benchmark.md`。
3. 更新 `docs/debts/README.md` 看板，將技術債 #0002、#0016、#0010 標記為 `RESOLVED` 並連結至 ADR #0041。
4. 更新主票券 `issue-0041.md` 與各子票券狀態為 `RESOLVED`。

---

## 驗收標準
- [ ] 全套自動化測試綠燈通過，無任何回歸問題。
- [ ] 文檔與技術債看板完成 100% 同步更新。
