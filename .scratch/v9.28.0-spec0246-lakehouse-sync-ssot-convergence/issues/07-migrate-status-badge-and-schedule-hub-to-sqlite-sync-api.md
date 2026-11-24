# 07 — 頂部同步狀態徽章與排程管理控制台遷移至 SQLite 同步狀態 API (Migrate 1)

**Parent:** #607 (Spec 0246)

**What to build:** 作為 Expand–Contract 遷移第二階段之一（Migrate 1），將頂部全域同步狀態徽章與排程管理控制台全面切換為直接消費 `/api/market/sync-status` 之 SQLite 單一事實來源，呈現分軌最新結算日、缺口狀態、同步進行中指示與手動觸發回饋，完全解除兩者對靜態 JSON 市場快取的讀取依賴。

**Blocked by:** 06 — 統一同步狀態 API 契約擴充與中介層追趕／手動回補合流 (Expand)

**Status:** done

- [x] 頂部同步狀態徽章顯示之台／美最新資料日期、健康燈號與缺口狀態完全來自 `/api/market/sync-status`
- [x] 排程管理控制台完整呈現四軌水位線狀態、缺口清單與背景同步進度，不再讀取靜態市場快取 JSON
- [x] 當後端不可用或離線時，元件優雅降級顯示連線狀態且不拋出未捕捉例外
- [x] Seam 2 狀態徽章與排程面板單元測試 100% 通過
