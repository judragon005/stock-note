# 002 — settings-workspace-local-storage-inspector-ui

**What to build:**
在 `src/components/SettingsWorkspace.tsx` 的資料庫與儲存管理區塊中，升級構建「本地數據與儲存空間總覽 (Local Storage Inspector)」卡片群。包含：頂部「🔒 100% 本地隱私與離線存儲保證」資安徽章、磁碟容量使用率進度條（MB/GB）、三大維度（核心個人資產、行情市場快取、系統備份與偏好）詳細數據統計與操作按鈕（單項快取清除、重新同步、整庫備份）。

**Blocked by:** 001

**Status:** closed

- [x] 在 `SettingsWorkspace.tsx` 整合 `getLocalStorageInspectionStats()` 載入本地數據指標
- [x] 實作「🔒 100% 本地隱私與離線存儲保證」資安徽章與說明文案
- [x] 實作儲存配額健康進度條（Usage vs Quota, 百分比計算與狀態燈）
- [x] 實作三大分類卡片網格（核心資產、行情快取、系統快照）與明細數據展示
- [x] 綁定快取清除互動邏輯（帶載入反饋與自動重新整理統計）
