# Ticket #04: 設定頁官方清單一鍵同步、全量回歸與交接文檔

## 🎯 任務目標
實作 `src/engine/stockDictionarySync.ts` 串接臺灣證券交易所 (TWSE) 與櫃買中心 (TPEx) 官方 OpenAPI 清單同步，在 `SettingsWorkspace.tsx` 整合管理面板，完成全量單元測試驗收與交接手冊同步。

---

## 🛠️ 實作要點
1. **官方 OpenAPI 同步引擎 (`stockDictionarySync.ts`)**：
   - 實作 `syncOfficialTaiwanStockList()` 抓取 TWSE 與 TPEx 上市/上櫃最新清單。
   - 解析股票代碼與中文名稱，批次寫入 IndexedDB `stockDictionary`。
   - 提供容錯降級（網路超時或失敗時給予友善提示，不中斷既有功能）。
2. **設定頁整合 (`SettingsWorkspace.tsx`)**：
   - 新增「股票名稱官方字典管理」卡片。
   - 呈現目前收錄檔數（台股/美股/自訂）、最後更新時間。
   - 提供「一鍵同步臺灣證交所與櫃買中心官方清單」按鈕，含 Loading 狀態與結果 Toast。
   - 提供「重設字典快取」按鈕。
3. **回歸測試與文檔同步**：
   - 執行 `npm test` 確保 100% 綠燈通過。
   - 執行 `npm run build` 確保 TypeScript 0 錯誤。
   - 同步更新 `CONTEXT.md` 與 `README.md`。

---

## 🧪 驗收條件 (Acceptance Criteria)
- [ ] 設定頁成功呈現字典統計數據與同步按鈕。
- [ ] 模擬同步 API 呼叫可正確更新 IndexedDB 並刷新統計數量。
- [ ] 全專案單元測試 100% 通過，TypeScript 構建 0 錯誤。
