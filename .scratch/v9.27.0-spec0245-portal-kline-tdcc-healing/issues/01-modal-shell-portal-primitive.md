# 01 — 全域視口傳送彈窗原語 (ModalShell) 與互動護欄

**Parent:** #605 (Spec 0245)

**What to build:** 建立零外部依賴之共用彈窗外殼原語 `ModalShell`，於瀏覽器環境透過頂層 Portal 掛載至 `document.body`（SSR 測試環境安全直出），統一提供全視口置中遮罩、毛玻璃卡片容器、鍵盤 `Escape` 關閉、背景遮罩點擊關閉、背景捲動鎖定與卸載還原、`closeLocked` 防誤關保護及無障礙對話框語意 (`role="dialog"` / `aria-modal="true"`)。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 開啟時渲染全域置中遮罩與毛玻璃卡片容器，並標記 `role="dialog"` 與 `aria-modal="true"`
- [ ] `isOpen` 為 `false` 時不掛載任何節點，關閉或卸載時完整還原背景捲動狀態
- [ ] `closeLocked` 為 `false` 時按下 `Escape` 或點擊遮罩外層即觸發 `onClose`；點擊對話框內容區不穿透關閉
- [ ] `closeLocked` 為 `true` 時鎖定 `Escape` 與遮罩點擊關閉，保護進行中的非同步操作
- [ ] 於靜態標記渲染測試環境（無 DOM 瀏覽器容器）可無錯渲染，且外部行為測試 100% 通過
