# Ticket #02: 股票名稱解析引擎與 IndexedDB 本地快取

## 🎯 任務目標
建立 `src/engine/stockNameResolver.ts` 與升級 `src/utils/storage.ts`，實現全域 `resolveOfficialSecurityName` 動態查詢、雙向檢索 `searchStockSuggestions` 與 IndexedDB `stockDictionary` 持久化儲存。

---

## 🛠️ 實作要點
1. **升級 `resolveOfficialSecurityName(symbol, fallbackName)`**：
   - 優先讀取 IndexedDB / 記憶體快取中的自訂/同步字典。
   - 次優先讀取 `STATIC_STOCK_DICTIONARY`。
   - 若為美股且無中文，回退至官方英文簡稱。
   - 最後回退至 `fallbackName` 或原始 `symbol`。
2. **實作雙向檢索函式 `searchStockSuggestions(query, market, limit)`**：
   - 支援以代碼開頭/包含、中文名稱包含、英文名稱包含進行評分與排序。
   - 支援依市場 (TW / US / ALL) 進行精確過濾。
3. **IndexedDB 快取與自訂持久化**：
   - 在 `src/utils/db.ts` 新增 `stockDictionary` object store。
   - 支援 `saveCustomStockName(symbol, name, market)` 記住使用者自訂名稱。
4. **TDD 測試**：
   - 建立 `src/engine/stockNameResolver.test.ts` 驗證解析順序、雙向檢索與自訂儲存行為。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] `stockNameResolver.test.ts` 測試案例 100% 通過。
- [ ] 支援以代碼 (如 `2330`) 或中文關鍵字 (如 `台積`) 檢索出正確建議清單。
- [ ] 全站呼叫 `resolveOfficialSecurityName` 時可正確解析全量台美股繁中名稱。
