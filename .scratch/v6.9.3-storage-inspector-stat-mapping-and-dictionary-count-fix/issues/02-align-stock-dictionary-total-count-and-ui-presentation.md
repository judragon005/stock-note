# 02 — 統一股票字典庫統計顯示口徑與 UI 綁定

**What to build:** 
在 `MarketCacheStats` 介面與 `getStorageInspectorStats` 中提供全量收錄標的數 `stockDictionaryTotalCount`，並更新 `SettingsWorkspace.tsx` 中的「2. 行情與市場快取」卡片呈現：
1. 將台美股官方字典的顯示數值對齊下方字典庫的總收錄數（例如 `3,350 檔`）。
2. 確保在自訂增量同步後，快取卡片與字典庫面板數據 100% 一致無歧義。

**Blocked by:** 01 — 修復公司行動庫與歷史外匯快取統計指標解析

**Status:** completed

- [x] `MarketCacheStats` 擴充 `stockDictionaryTotalCount` 欄位
- [x] `getStorageInspectorStats` 回傳正確的總標的數、官方數與增量數
- [x] `SettingsWorkspace.tsx` 快取卡片 2 綁定 `stockDictionaryTotalCount` 並正確渲染
