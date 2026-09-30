# 06 — 儀表板整合驗證與全量端到端回歸 (End-to-End Regression & Integration)

**What to build:**
整合驗證輸入 0050 分析後的整體介面連動、K 線時間方向、雷達與甜甜圈視覺放大、以及 Row 6 等高佈局，確保全單元測試與 TypeScript 編譯 100% 綠燈無回歸問題。

**Blocked by:** 01-symbol-pipeline-sync-and-resilient-fallback, 02-kline-temporal-direction-fix, 03-card-03-radar-magnification, 04-card-11-donut-gauges-expansion, 05-card-18-equal-height-and-bento-layout

**Status:** ready-for-agent

- [x] 執行 `npm test` 確保所有單元測試 100% 通過
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤
- [x] 驗證 18 張卡片佈局與視覺細節與使用者需求 100% 對齊
