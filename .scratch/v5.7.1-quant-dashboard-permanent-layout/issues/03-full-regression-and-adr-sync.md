# Ticket #03: 全量回歸測試與 ADR 架構決策同步 (Full Regression & ADR Sync)

- **母票券**: [issue-0042.md](issue-0042.md)
- **版本**: v5.7.1
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `docs/adr/0042-permanent-quant-dashboard-and-event-layout.md`
  - `npm test` & `npm run build`

---

## 任務描述
1. 執行全量單元測試 `npm test` 確保 100% 通過。
2. 執行 `npm run build` 確保 TypeScript 編譯與生產打包 0 錯誤。
3. 撰寫 ADR 架構決策記錄 `docs/adr/0042-permanent-quant-dashboard-and-event-layout.md`。
4. 更新子任務票券與主票券狀態為 `RESOLVED`。

---

## 驗收條件
- [ ] 全專案單元測試全數綠燈。
- [ ] 生產打包構建無錯誤。
- [ ] ADR 文檔歸檔完畢。
