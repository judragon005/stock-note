# 03 — 股利聚合全量勾稽驗證、對帳提示升級與全系統綠燈 CI

**What to build:** 
驗證 2025 年度台股含泰銘之應發毛額精確為 625,508 元，實領淨額精確為 615,480 元；在首張 KPI 卡片的對帳提示中完整呈現含泰銘全量永豐金大戶投口徑說明；執行全量單元測試確保 100% 綠燈，發起 Pull Request 並完成 CI 驗證與主幹合併。

**Blocked by:** 01 — Header 自封閉即時走動台北交易時鐘與市價更新時間解耦, 02 — 9927 泰銘官方發放日定錨 (2025-12-01) 與永豐金/元大台灣50數據校準

**Status:** ready-for-agent

- [x] 於 `src/engine/dividendAggregator.test.ts` 驗證校正後的 2025 年度台股毛額 (625,508) 與實領淨額 (615,480)。
- [x] 於 `src/components/DividendLogView.tsx` 更新對帳提示文本，呈現全量含泰銘勾稽邏輯。
- [x] 執行 `npm test`（100% 綠燈，973 測試）與 `npm run build`（TypeScript 0 錯誤）。
- [x] 發起 PR 關聯 Issue #87，待 CI 通過後 Squash and Merge。


