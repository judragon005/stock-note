# 01 — 修復公司行動庫與歷史外匯快取統計指標解析

**What to build:** 
修正 `getStorageInspectorStats` 與 `storage.ts` 對公司行動庫（`corporateActions`）與歷史外匯（`historicalFx`）的快取解析邏輯：
1. 公司行動資料庫：正確自 LocalStorage 快取 `{ [symbol]: { events, timestamp } }` 提取標的集合（計算為 61 檔）並展平所有事件計算總筆數，徹底解決 `0 檔 (61 筆)` 矛盾。
2. 歷史外匯匯率：將以日期為鍵之匯率表記為 1 個幣別對（USD/TWD），並將歷史天數正確累加為匯率資料點數（如 4,529 點），徹底解決 `4529 對 (0 點)` 錯誤。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `db.ts` 正確解析 LocalStorage 與 IndexedDB 中的 `corporateActions` 標的數與總事件筆數
- [x] `db.ts` 與 `storage.ts` 正確解析 `historicalFx` 的幣別對數量 (1 對) 與歷史匯率數據點數 (N 點)
- [x] 雙軌回退 (IndexedDB / LocalStorage) 保持邏輯對稱與型別安全
