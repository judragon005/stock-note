# 07 — DividendLogView 頂層頁面整合、操作閉環與真實 DOM 整合門禁

**What to build:** 將 ExDividendRadarCard 正式掛載至 DividendLogView.tsx（月度長條圖上方），與既有「一鍵入帳」及「公司行動掃描」無縫接軌；在 DividendLogView.test.ts 建立最高階真實 DOM 測試，達成全域 npm test 100% 綠燈與 npm run build 0 型別錯誤。

**Blocked by:** 05 — 開發獨立 ExDividendRadarCard 緊湊時序清單卡片元件 (#570), 06 — 實作跨午夜自愈更新、60d/90d 視窗切換與響應式流動佈局 (#571)

**Status:** ready-for-agent
**GitHub Issue:** #572

- [ ] 將 ExDividendRadarCard 掛載至 DividendLogView.tsx 適當佈局位置
- [ ] 於 DividendLogView.test.ts 建立最高階真實 DOM 整合測試
- [ ] 達成 npm test 100% 通過與 npm run build 0 型別錯誤
