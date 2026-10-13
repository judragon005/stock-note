# Ticket 05: 全市場實機數據庫結算推進與全量回歸審核

## 1. 權責範圍 (Scope)
* **核心檔案**：
  * 本地 SQLite Lakehouse 數據庫
  * 全專案測試套件 (`npm test`)
  * 生產環境構建管線 (`npm run build`)
  * 文件同步（`docs/adr/0177-...`、`README.md`、`CONTEXT.md`）

## 2. 需求描述 (Description)
1. 實機執行全市場動態結算推進：
   * 執行 TDCC 入庫腳本，動態結算至最新週五。
   * 執行月營收入庫腳本，動態結算至最新月份。
2. 執行全量測試回歸：
   * 確保全專案所有 210 個測試檔案、1,553 個測試案例 100% 綠燈通過。
3. 執行 TypeScript 嚴格構建：
   * `tsc && vite build` 0 型別錯誤，構建產物正常。
4. 領域文檔同步：
   * 產出 ADR 0177，同步更新 README 核心特色與 CONTEXT 演進紀錄。

## 3. 測試縫隙 (Test Seams)
* 系統端到端命令執行與 CI 閘門檢驗。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0177 之 **AC 7**。
* [ ] `npm test` 100% 通過。
* [ ] `npm run build` 0 錯誤。
