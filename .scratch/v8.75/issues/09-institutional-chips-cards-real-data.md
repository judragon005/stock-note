# 09 — 08 法人行為計量卡與籌碼卡片 250 日真實數據連動

**What to build:** `InstitutionalFlowCard` 串接真實 250 日三大法人買賣超，繪製長天期雙軸直方柱與累積折線圖；`ChipsSummaryCard` 支援真實土洋合買/對作判斷與趨勢火花線。

**Blocked by:** 05 — 湖倉歷史籌碼與資券 API 端點聚合輸出, 06 — 報表引擎徹底拔除 5 根 Mock 日 K 與硬編碼假數值

**Status:** closed

- [x] 升級 `InstitutionalFlowCard.tsx`，支援真實 250 日法人柱狀圖繪製與折線累計
- [x] 升級 `ChipsSummaryCard.tsx` 火花線與買賣標籤，拔除硬編碼假數值
- [x] 撰寫測試驗證 250 日法人數據連動無 NaN、無破圖
