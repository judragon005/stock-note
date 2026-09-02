# 003 — storage-inspector-unit-tests-and-e2e-verification

**What to build:**
為 `SettingsWorkspace.tsx` 與本地儲存檢視器 UI 編寫單元測試，驗證指標渲染、配額格式化顯示、隱私徽章及快取清除互動，並完成全專案 `npm test` 與 `npm run build` 驗證。

**Blocked by:** 001, 002

**Status:** closed

- [x] 編寫或擴充 `SettingsWorkspace.test.tsx` 覆蓋「本地數據與儲存空間總覽」面板渲染與按鈕互動
- [x] 驗證邊界案例（如無痕模式下 `navigator.storage.estimate` 回傳未定義時的優雅降級）
- [x] 執行全量 `npm test`（100% 通過，0 failures）
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤
