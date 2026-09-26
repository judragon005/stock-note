# 08 — 多標的動態切換迴歸測試、ADR 0146 與領域文檔同步

**What to build:**
1. 在 `aiForceDashboardEngine.test.ts` 擴充測試：
   - 驗證強勢股（多頭排列、法人大買）與弱勢股（破線、法人連賣）在 03 多維度判讀、13 市場情緒、14 AI 信心度呈現顯著數據差異（不再卡在 56 分與 C 級）。
2. 執行 `npm test` 確保 100% 綠燈通過。
3. 執行 `npm run build` 確保 0 TypeScript 編譯錯誤。
4. 撰寫 ADR `docs/adr/0146-ai-force-multi-dimension-sentiment-confidence-live-pipeline.md` 並同步更新 `CONTEXT.md`。

**Blocked by:** Ticket 07

**Status:** completed

- [x] 強勢股 vs 弱勢股多標的動態差異化單元測試通過
- [x] `npm test` 100% 綠燈
- [x] `npm run build` 0 錯誤
- [x] ADR 0146 與 `CONTEXT.md` 同步完成
