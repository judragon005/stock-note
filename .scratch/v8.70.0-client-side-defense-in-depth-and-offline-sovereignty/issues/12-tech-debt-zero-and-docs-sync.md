# 12 — 全專案技術債清零與 ADR/文檔同步驗收 (Tech Debt Zero & Docs Sync)

**What to build:** 
完成本次所有安全與離線加固後的全面閉環驗收。更新技術債追蹤看板 `docs/debts/README.md`，將專案最後僅存的 3 個技術債（Debt #0033, #0034, #0023）正式標記為 `RESOLVED`；同步產出架構決策記錄 ADR 0157；確保全專案測試 100% 綠燈與生產打包 0 錯誤。

**Blocked by:** 05-index-html-csp-meta-tag, 06-vite-security-headers, 08-pwa-service-worker, 11-settings-ui-integration

**Status:** ready-for-agent

- [x] 更新 `docs/debts/README.md`，將 Debt #0033、#0034、#0023 狀態切換為 `RESOLVED`，宣告技術債歸零
- [x] 同步更新 `docs/debts/0033-*.md`、`0034-*.md`、`0023-*.md` 內文狀態與解決方案連結
- [x] 撰寫架構決策記錄 `docs/adr/0157-client-side-defense-in-depth-and-offline-sovereignty.md`
- [x] 執行 `npm test` 確保既有 1,293+ 個測試與新增測試 100% 通過
- [x] 執行 `npm run build` 驗證 TypeScript 0 錯誤與 Vite 產物完整性
