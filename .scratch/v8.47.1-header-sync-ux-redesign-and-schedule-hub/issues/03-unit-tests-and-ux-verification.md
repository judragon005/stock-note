# 03 — 單元測試與 UX 互動驗證 (Unit Tests & UX Interaction Verification)

**What to build:**
為新重構的狀態晶片與設定中心排程面板編寫單元測試。驗證 `MarketSyncStatusBadge` 在各種同步狀態（完全未同步、部分同步、全同步）下的渲染與彈窗開啟關閉行為；驗證複製剪貼簿輔助函式的正確性。

**Blocked by:** Ticket 01, 02

**Status:** ready-for-agent

- [ ] 撰寫/更新 `src/components/MarketSyncStatusBadge.test.ts`，驗證精簡膠囊的渲染與點擊互動
- [ ] 驗證複製指令按鈕能正確觸發剪貼簿 API 或回退處理
- [ ] 測試毛玻璃彈窗的 ESC 鍵與關閉按鈕事件響應
