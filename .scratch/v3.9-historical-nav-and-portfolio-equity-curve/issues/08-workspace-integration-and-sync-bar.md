# 08 — 工作區整合、同步狀態面板與端到端驗收 (Workspace Integration & Sync Status Bar)

**What to build:** 在主畫面新增專屬「資產成長 (Portfolio Growth)」分頁標籤，整合歷史日 K 下載進度條（如「已同步 12/12 檔標的歷史日 K」）、手動重新同步按鈕與離線快取狀態指示，並完成全域 `npm test` 與 `npm run build` 驗收。

**Blocked by:** 07 — 資產成長折線圖 UI 元件與互動 Tooltip

**Status:** ready-for-agent

- [ ] 在 `WorkspaceTabs.tsx` 與主導航中新增「資產成長 (Portfolio Growth)」分頁
- [ ] 整合日 K 同步進度條、手動更新按鈕與最後同步時間指示
- [ ] 新增或編輯交易與出入金時，自動連動重算歷史淨值序列
- [ ] 全域單元測試 100% 通過 (`npm test`)
- [ ] TypeScript 0 錯誤編譯通過 (`npm run build`)
