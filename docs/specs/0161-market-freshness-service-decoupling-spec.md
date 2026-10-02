# 規格書 0161：市場時區新鮮度服務解耦與中介層依戀重構 (Market Freshness Service Decoupling Spec)

## Problem Statement

目前在開發伺服器的 Vite 中介層中，Connect 中介層承擔了過多領域計算與狀態比對職責（即 Fowler 所定義的 Feature Envy 依戀情結）：
1. 中介層內部混合了跨時區（台股 UTC+8 15:00/16:00、美股 UTC-4 17:00/08:00）的交易日結算錨定計算。
2. 中介層內部直接操作底層資料庫讀取特定標的最新日期，並進行陳舊度邏輯比對。
3. 這些領域邏輯無法被中介層以外的排程腳本、CLI 診斷工具或背景工作器複用，且難以進行獨立的跨時區與週末邊界單元測試。

## Solution

將市場交易日結算錨定演算法與資料庫陳舊度檢驗邏輯，從 HTTP 中介層中徹底解耦，抽離為獨立、高內聚的領域服務模組：
1. 建立獨立純粹的市場新鮮度服務，提供單一真實來源 (SSOT) 的交易日錨定計算與市場陳舊度評估。
2. 精簡 Vite 中介層，使其回歸單一職責：純粹負責 HTTP 路由轉發、查詢參數提取與 JSON 回應序列化。
3. 提供獨立隔離的公開測試縫隙，以覆蓋不同日期、時區、週末邊界與空庫情況。

## User Stories

1. As a developer, I want the market freshness calculation to be decoupled from the HTTP transport layer, so that I can reuse the exact same freshness rules in background workers and CLI scripts without mocking HTTP requests.
2. As a platform maintainer, I want the Vite middleware to adhere strictly to the Single Responsibility Principle, so that changes to HTTP routing or error handling cannot accidentally break timezone or settlement calculations.
3. As an engineer writing tests, I want a pure function interface for market anchor date calculation, so that I can deterministically test weekend rollbacks and settlement boundaries without spinning up an HTTP server.
4. As a system operator, I want consistent stale-database detection across both Vite startup probes and manual API status queries, so that catchup tasks are triggered predictably under identical criteria.
5. As an API consumer, I want `/api/market/sync-status` to return the exact same data structure as before, so that front-end hooks and UI sync badges continue functioning seamlessly without breaking changes.
6. As a security and quality reviewer, I want zero regressions in existing middleware test suites, so that architecture improvements do not compromise runtime reliability.

## Implementation Decisions

1. **模組架構與職責切分 (Module Decoupling)**:
   - 建立全新的領域服務模組，專責處理時區換算、交易日結算時間判定與資料庫新鮮度檢查。
   - Vite 中介層僅導入該領域服務，在收到 `/api/market/sync-status` 請求或伺服器啟動巡檢時委託該服務執行，消除 Feature Envy。
2. **公開介面契約 (Public Service Interface Contract)**:
   - 交易日錨定計算：接受市場代碼 (`'TW'` | `'US'`) 與參考時間戳，回傳標準格式之交易日字串 (`YYYY-MM-DD`)。
   - 市場新鮮度檢驗：接受資料庫連線實例與參考時間戳，回傳結構化之台股與美股最新日期、預期錨定日期及陳舊布林旗標。
3. **HTTP 協定向下相容性 (Zero API Breaking Change)**:
   - `/api/market/sync-status` 端點之 JSON 格式維持 100% 相同，前端 `useMarketCatchupSync` 與狀態徽章完全無感相容。
4. **無狀態與純函數優先 (Stateless & Pure Functions)**:
   - 時區計算採用純數學時區偏移與行事曆推導，不依賴環境全域變數或系統主機時區，確保跨平台運算結果完全一致。

## Testing Decisions

- **好測試的標準**: 僅透過公開介面驗證外部行為，不依賴模組私有變數或內部實作細節。
- **測試縫隙 (Test Seam)**:
  - **Seam 1 (核心領域縫隙)**: 市場新鮮度服務的公開函數（時區邊界推導、週六日回推、盤前盤後臨界值驗證）。
  - **Seam 2 (HTTP 整合縫隙)**: 中介層端點 `/api/market/sync-status` 針對代理呼叫與背景追趕旗標的整合驗收。
- **既有測試資產 (Prior Art)**:
  - 參考既有 `viteMarketMiddleware.test.ts` 與 `holidayCalendar.test.ts` 之結構進行擴展。

## Out of Scope

- 修改前端 `useMarketCatchupSync.ts` 的請求邏輯或資料結構。
- 改變台股 (15:00) 與美股 (17:00) 現有的結算時間定義。
- 重寫 SQLite 底層連線池核心。

## Further Notes

此重構屬於低風險的純架構解耦 (Extract Service Refactor)，改動範圍局限於服務端中介層目錄，不影響前端客戶端組件。
