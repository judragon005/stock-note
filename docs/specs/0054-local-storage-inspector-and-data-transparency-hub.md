# 需求規格說明書 (PRD #0054)：本地數據與儲存空間總覽看板 (Local Storage Inspector & Data Transparency Hub)

## Problem Statement

隨著系統功能演進（納入交易、交割帳戶、現金流、貸款、歷史收盤價/匯率快取、官方台股字典、公司行動資料庫與系統快照），使用者在操作與管理個人資產記錄時面臨以下三大痛點：

1. **本地資料透明度不足 (Lack of Data Transparency)**：
   - 使用者無法得知系統到底在本機儲存了哪些資料、具體存放在何處（IndexedDB 還是 LocalStorage）、各個資料表（ObjectStore）包含多少筆數與數據點。
2. **缺乏容量佔用與儲存健康度監控 (Storage Health & Quota Blindness)**：
   - 瀏覽器 IndexedDB 與快取佔用了多少磁碟空間（MB）、距離瀏覽器儲存配額（Storage Quota）上限尚餘多少空間完全不可見，缺乏防範儲存空間耗盡或異常的健康度指標。
3. **快取清理與核心資產缺乏分級保護 (Lack of Tiered Protection for Cache vs Core Data)**：
   - 當使用者想要重置行情快取或清除異常即時報價時，缺乏精確的單項快取清除與重新同步機制，容易誤觸全庫重置或因恐懼丟失記帳資料而不敢清理快取。
4. **離線隱私認知模糊 (Privacy Confidence)**：
   - 新使用者不清楚本系統為 100% Client-Side Local-First 離線架構，容易擔憂敏感財務資料或 API Key 是否外洩至雲端伺服器。

---

## Solution

在「系統設定 (SettingsWorkspace)」中建置全功能的「本地數據與儲存空間總覽 (Local Storage Inspector)」看板，提供 100% 透明的本機資料檢視、容量監控、分級管理與隱私認證：

1. **儲存引擎健康度與容量總覽 (Storage Health & Quota Dashboard)**：
   - 調用瀏覽器標準 API `navigator.storage.estimate()`，動態計算已使用空間（如 `12.4 MB`）、瀏覽器配額上限（如 `10.0 GB`）與使用百分比。
   - 標示 IndexedDB (`StockTrackerDB v1`) 與 `LocalStorage` 運行健康狀態指示燈（綠燈）。
2. **三大維度本地資料明細 (Categorized Dataset Breakdown)**：
   - **核心個人資產數據 (Core Asset Data)**：`trades`（交易筆數與時間跨度）、`brokerAccounts`（帳戶數）、`cashTransactions`（現金流筆數）、`loanRecords`（質押筆數）。
   - **行情與市場快取 (Market Data & Caches)**：`historicalPrices`（歷史股價標的數與資料點數）、`historicalFx`（匯率對與天數）、`priceMetadata`（即時報價快取數與最後更新時間）、`corporateActions`（減資/除權息事件筆數）、`stockDictionary`（官方字典與自訂別名數）。
   - **系統備份與配置 (System Snapshots & Config)**：`snapshots`（手動/自動快照數與鎖定數）、`apiKeys`（已配置 API 金鑰狀態）、`settings`（介面與計算偏好）。
3. **階梯式安全管理與防呆機制 (Tiered Safety Protection)**：
   - **快取類資料**：支援單獨一鍵「安全清除快取」與「立即重新同步」，抹除後不影響任何使用者交易與帳務。
   - **核心資產危險操作**：若觸發清除或還原，底層強制先自動建立 `AUTO_BEFORE_RESET` 防護快照，並要求輸入確認字串。
4. **100% 本地隱私與離線架構保證 (Local-First Privacy Trust Badge)**：
   - 看板頂部展示資安隱私徽章，明確告知所有記帳資料與金鑰皆僅儲存於當前瀏覽器本地，永不上傳任何第三方私有伺服器。

---

## User Stories

1. 作為一名重視資料隱私的投資人，我希望在設定頁看到「100% 本地離線存儲保證」，並清楚知道我所有的財務記錄與 API Key 都安全地存放在我的瀏覽器中。
2. 作為一名長期記帳的使用者，我希望隨時掌握系統儲存空間使用量（MB）與 IndexedDB 各資料表（交易、現金流、快照等）的筆數統計，確保資料庫運作健康。
3. 作為一名遇到股價報價異常的使用者，我希望能在看板中「單獨清除歷史股價或即時行情快取」並一鍵重新抓取，而不用擔心這會破壞我的交易紀錄或交割帳戶。
4. 作為一名需要進行資料庫重置或匯入的使用者，我希望在執行高風險操作時，系統自動先建立一份防護快照，杜絕任何意外資料遺失。

---

## Implementation Decisions

### 1. 本地儲存統計資料存取層 (`src/utils/db.ts` & `src/utils/storage.ts`)
- 在 `src/utils/db.ts` 封裝 `getLocalStorageInspectionStats()` 異步函式：
  - 查詢各個 ObjectStore 筆數：`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`, `snapshots`, `settings`。
  - 計算交易資料之時間跨度（最早交易日 ~ 最晚交易日）。
  - 計算歷史價格資料點總數與涵蓋標的數。
  - 計算 `navigator.storage.estimate()` 之 `usage` 與 `quota`。
  - 計算 `LocalStorage` 佔用項數與自訂名稱統計。
- 提供單項快取清除函式：
  - `clearHistoricalPricesCache()`
  - `clearHistoricalFxCache()`
  - `clearPriceMetadataCache()`
  - `clearCorporateActionsCache()`

### 2. 設定頁面整合 (`src/components/SettingsWorkspace.tsx`)
- 將原有的資料庫與快照管理區域重構升級為「本地數據與儲存空間總覽 (Local Storage Inspector)」卡片群。
- 頂部加入「🔒 100% 本地隱私保證」橫幅。
- 顯示儲存使用量進度條與健康狀態指示燈。
- 採用 3 欄式/分組網格卡片呈現三大分類數據，並附帶操作按鈕（清除快取、重新同步、匯出備份）。

---

## Testing Decisions

### 1. 測試原則
- 遵循測試驅動開發 (TDD) 與紅-綠-重構循環。
- 隔離瀏覽器原生 API（如 `navigator.storage.estimate` 與 `indexedDB` mock）。

### 2. 測試範疇
- **儲存統計檢測單元測試 (`src/utils/db.test.ts`)**：
  - 驗證 `getLocalStorageInspectionStats()` 能正確回傳所有 ObjectStore 的筆數、標的數與時間跨度。
  - 驗證 `usage` 與 `quota` 正常計算與 fallback。
- **快取精準清除測試 (`src/utils/db.test.ts`)**：
  - 驗證清除 `historicalPrices` 或 `priceMetadata` 時，`trades`、`cashTransactions` 與 `brokerAccounts` 完全不受影響。
- **UI 元件渲染與互動測試 (`src/components/SettingsWorkspace.test.tsx`)**：
  - 驗證本地數據總覽面板正確渲染各項指標與隱私徽章。
  - 驗證快取清除按鈕點擊觸發與狀態更新。
- **全量整合與編譯驗證**：
  - 確保 `npm test` 100% 通過與 `npm run build` TypeScript 0 錯誤。

---

## Out of Scope

1. 跨裝置雲端即時同步（保持 100% 離線本地存儲架構，跨裝置透過 JSON 匯入匯出實現）。
2. Web SQL 等已廢棄之瀏覽器資料庫支援。
