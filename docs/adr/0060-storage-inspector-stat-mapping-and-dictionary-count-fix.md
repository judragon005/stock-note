# 0060. Storage Inspector 快取統計指標解構與字典計數對齊修復

日期: 2026-09-01

## 狀態 (Status)

已接受 (Accepted)

## 背景 (Context)

在系統「設定 (Settings)」工作區之「2. 行情與市場快取 (LocalStorage / IndexedDB 雙軌檢視器)」中，出現了以下三處嚴重數據矛盾與統計錯誤：
1. **公司行動資料庫 (corporateActions)**：畫面顯示 `0 檔 (61 筆)`，出現標的數為 0 但筆數為 61 的邏輯衝突。
2. **歷史外匯匯率 (historicalFx)**：畫面顯示 `4529 對 (0 點)`，將 4,529 個歷史日期誤判為 4,529 個幣別對，且歷史點數累加為 0。
3. **台美股官方字典 (stockDictionary)**：卡片僅顯示靜態內建之 `600 檔`，忽略了增量同步之 2,750 檔，與下方字典庫面板顯示之 `3,350 檔` 不一致。

## 決策 (Decision)

1. **公司行動快取解析重構**：
   - 識別 LocalStorage `STOCK_TRACKER_CA_CACHE_V1` 之結構 `{ [symbol]: { events: RawCorporateEvent[], timestamp: number } }`。
   - 提取所有 symbol 鍵以計算真實涵蓋標的數（61 檔），並展平所有事件計算真實總筆數。
2. **歷史外匯儲存對稱性與資料點修正**：
   - 修正 `saveHistoricalFxToStorage` 與 `getStorageInspectorStats` 的資料結構映射。
   - 將日期映射之匯率表記為 `1 對 (USD/TWD)` 幣別對，並將日期總天數正確累加為 `historicalFxDataPoints`。
3. **字典庫統計口徑統一**：
   - 在 `MarketCacheStats` 介面中新增 `stockDictionaryTotalCount` 欄位。
   - 快取卡片 2 統一綁定 `stockDictionaryTotalCount`（3,350 檔），與字典庫管理面板完全一致。

## 後果 (Consequences)

- **正面影響**：
  - 快取檢視器各項指標完全反映真實數據，徹底消除數字打架與語意矛盾。
  - 雙軌回退與 IndexedDB 主路徑保持 100% 結構對稱性與型別安全。
  - 既有測試集與新增測試 100% 綠燈通過，TypeScript 0 錯誤。
- **後續維護**：
  - 雙軌快取檢視器之公開介面 `getStorageInspectorStats` 納入防禦性迴歸測試。
