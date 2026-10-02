# ADR-0161: 市場時區新鮮度服務解耦與中介層依戀重構

## 狀態 (Status)
已通過 (Accepted)

## 背景 (Context)
在 `/code-review` 雙軸審查中，我們識別出 `scripts/market-sync/vite-market-middleware.cjs` 存在 Fowler 代碼異味之 **Feature Envy (依戀情結)**：
- Connect 中介層的主要職責為 HTTP 協定轉換與分發。
- 但原程式碼將台股 (15:00 / UTC+8) 與美股 (17:00 / UTC-4) 交易日結算時間軸計算、SQLite 最新日期查詢與陳舊度判定邏輯直接內嵌於中介層中。
- 此舉導致非 HTTP 情境（如背景排程、CLI 診斷工具）無法共享市場新鮮度邏輯，且阻礙了純粹時間維度的單元測試切片。

## 決策 (Decision)

### 1. 抽取獨立領域服務模組
- 建立 `scripts/market-sync/market-freshness-service.cjs`，提供兩個純粹公開介面：
  - `getMarketAnchorDate(market, now)`: 純函數，專門計算指定市場在參考時間下的已結算交易日。
  - `checkMarketFreshness(db, now)`: 傳入資料庫實例，封裝台美股日 K 查詢與陳舊度比較。

### 2. 精簡 Vite Connect 中介層
- `scripts/market-sync/vite-market-middleware.cjs` 改為導入並調用 `market-freshness-service.cjs`。
- 伺服器啟動巡檢與 `/api/market/sync-status` 端點全面委託服務處理，中介層僅保留 HTTP 狀態碼與 JSON 序列化職責。

### 3. 公開測試縫隙建立
- 新增 `src/engine/marketFreshnessService.test.ts`，以精確時間戳模擬平日盤中、盤後、週末六日與空庫情況，達成 100% 測試覆蓋率。

## 影響 (Consequences)

### 正向影響 (Positive)
- **消除 Feature Envy 異味**：中介層重回單一職責原則 (SRP)，代碼簡潔易讀。
- **提升複用性**：未來任何 CLI 腳本或 Worker 均可直接 `require` 新鮮度服務，共享單一真實來源 (SSOT)。
- **零破壞性**：`/api/market/sync-status` API 契約與回傳欄位 100% 維持不變，前端無感相容。

### 負向影響與權衡 (Trade-offs)
- 新增一個小型 CJS 服務檔案與對應測試檔案，但換取了高內聚與可測試性。
