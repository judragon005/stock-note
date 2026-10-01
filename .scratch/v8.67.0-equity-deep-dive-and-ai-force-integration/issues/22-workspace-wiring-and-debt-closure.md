# 22 — 戰情室與持倉入口掛載、全量驗收與技術債看板清償

**What to build:** 
1. 在主力戰情室頂部工具列掛載「🔍 7 步投研」入口按鈕，點擊彈出 `EquityDeepDiveModal`。
2. 在持倉清單 (`HoldingsTable.tsx`) 動作選單掛載「🔍 7 步投研」快捷選項，一鍵帶入庫存代碼。
3. 執行全量 `npm test` 與 `npm run build`，確保 100% 綠燈與 0 型別錯誤。
4. 更新 `docs/debts/README.md`，將 `Debt #0037`、`Debt #0040`、`Debt #0039` 狀態從 `OPEN` 變更為 `RESOLVED`，並標註關聯 Spec 0156。

**Blocked by:** 21 — 沉浸式 7 步投研全螢幕彈窗主元件

**Status:** ready-for-agent

- [ ] 主力戰情室與在庫持倉雙向入口按鈕可正常喚出彈窗
- [ ] 全量單元測試 100% 通過
- [ ] TypeScript 編譯無錯誤
- [ ] `docs/debts/README.md` 看板狀態同步更新
