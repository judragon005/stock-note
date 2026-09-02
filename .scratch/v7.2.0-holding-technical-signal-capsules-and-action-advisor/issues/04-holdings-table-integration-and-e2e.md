# Issue 04: 持股清單整合、歷史行情資料流串接與端到端驗收 (Holdings Table Integration & E2E)

- **狀態**：`COMPLETED`
- **優先級**：`P1`
- **對應規格**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../../../docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)
- **標籤**：`ready-for-agent` · `Integration` · `UI` · `E2E`

---

## 1. 任務目標
1. 整合資料流：
   - 擴充 `HoldingPosition` 或封裝 Hook，結合 IndexedDB 歷史日 K 線資料計算技術指標與訊號標籤。
2. 整合 `HoldingsTable.tsx`：
   - 在每檔持股代號與名稱下方嵌入 `HoldingSignalCapsules`。
   - 在表格展開詳情中，呈現完整操作指引卡片與技術指標摘要面板。
3. 全系統驗證：
   - 執行 `npm test` 確保全專案所有測試 100% 通過。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。

---

## 2. 驗收標準
- [ ] 持股清單中每檔具備歷史 K 線之標的均能精確呈現多色警示膠囊。
- [ ] 點擊或 Hover 膠囊可檢視對應數值（如 5日均線、KD 值）。
- [ ] 完整執行 `npm test` 綠燈無報錯。
- [ ] 完整執行 `npm run build` 成功建置。
