# 子任務 #03: 全量回歸測試、ADR 架構決策與領域文檔同步 (Regression & ADR Sync)

- **所屬迭代**: v5.7.2
- **狀態**: `RESOLVED`
- **分流標籤**: `ready-for-agent`
- **關聯主票券**: [issue-0043.md](issue-0043.md)
- **目標檔案**:
  - `docs/adr/0043-quant-metrics-interactive-diagnosis-and-tooltips.md`
  - `docs/specs/0043-quant-metrics-interactive-diagnosis-and-tooltips.md`

---

## 🎯 任務目標

1. 執行全量單元測試 `npm test`，確保 100% 綠燈通過。
2. 執行 `npm run build`，確保 TypeScript 0 錯誤且無構建警告。
3. 建立 ADR 架構決策記錄 `docs/adr/0043-quant-metrics-interactive-diagnosis-and-tooltips.md`。
4. 更新相關狀態標記為 `RESOLVED`。

---

## 📋 驗收條件

- [ ] `npm test` 全數通過。
- [ ] `npm run build` 構建成功。
- [ ] ADR 0043 文檔撰寫完備。
