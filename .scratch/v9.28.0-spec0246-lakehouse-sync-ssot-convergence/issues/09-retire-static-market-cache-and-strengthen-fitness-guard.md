# 09 — 靜態 JSON 市場快取正式退場與架構適應度靜態守門強化 (Contract)

**Parent:** #607 (Spec 0246)

**What to build:** 作為 Expand–Contract 收尾階段（Contract），確認全前端無任何殘留消費者後，正式移除過期靜態 JSON 市場快取讀寫管線與依賴，修正靜態伺服器對 JSON 資產改用禁止永久快取之標頭（杜絕 `immutable` 一年期快取鎖死），並在架構適應度靜態守門測試中植入永久禁令，防止靜態市場快取讀寫或單根 IndexedDB 覆寫於未來迭代回流。

**Blocked by:** 07 — 頂部同步狀態徽章與排程管理控制台遷移至 SQLite 同步狀態 API (Migrate 1)、08 — 移除應用程式開機靜態 JSON 巨檔水合與 IndexedDB 單根覆寫，升級全域追趕完成自動輪詢 (Migrate 2)

**Status:** done

- [x] 前端程式碼庫與同步流程不再引用或依賴過期靜態市場快取 JSON 檔案
- [x] NAS 靜態伺服器對 JSON 資源不再回傳 `max-age=31536000, immutable` 標頭，確保動態資源不被瀏覽器永久鎖死
- [x] 架構適應度靜態守門新增規則，若前端再度引入靜態市場快取讀取或開機單根覆寫 IndexedDB 立即紅燈攔截
- [x] Seam 1 架構守門與伺服器快取標頭測試 100% 通過
