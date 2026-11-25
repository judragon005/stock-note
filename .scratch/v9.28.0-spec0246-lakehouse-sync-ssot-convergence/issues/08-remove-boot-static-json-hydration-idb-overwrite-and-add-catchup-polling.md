# 08 — 移除應用程式開機靜態 JSON 巨檔水合與 IndexedDB 單根覆寫，升級全域追趕完成自動輪詢 (Migrate 2)

**Parent:** #607 (Spec 0246)

**What to build:** 作為 Expand–Contract 遷移第二階段之二（Migrate 2），移除應用程式啟動時對過期靜態市場快取 JSON（逾 5 MB）的下載與循序覆寫本地 IndexedDB 250 日歷史 K 線快取之破壞性水合流程；並升級全域追趕掛鉤，使其在偵測到背景追趕進行中（`isCatchingUp`）時於受控間隔輪詢同步狀態，待追趕完成後自動廣播刷新前端資料視圖。

**Blocked by:** 06 — 統一同步狀態 API 契約擴充與中介層追趕／手動回補合流 (Expand)

**Status:** done

- [x] 應用程式開機流程不再發起靜態 JSON 市場快取請求，亦不再以單根舊報價覆寫既有 IndexedDB 歷史 K 線
- [x] 當追趕 API 回報背景追趕進行中時，追趕掛鉤自動輪詢 `/api/market/sync-status` 直至完成（具超時上限與卸載清理）
- [x] 背景追趕完成並補齊缺口後，前端自動觸發狀態更新與畫面刷新，使用者無需手動重整
- [x] Seam 2 開機與追趕掛鉤單元測試 100% 通過
