# Spec 0060: Storage Inspector 快取統計指標解構與字典計數對齊修復規格書

## Problem Statement

使用者在「設定 (Settings)」工作區檢視「2. 行情與市場快取 (LocalStorage / IndexedDB 雙軌檢視器)」時，發現多項快取統計數據存在明顯的計算矛盾與數值異常：
1. **公司行動資料庫 (corporateActions)**：畫面顯示 `0 檔 (61 筆)`，出現「標的數為 0 但筆數為 61」的邏輯矛盾。
2. **歷史外匯匯率 (historicalFx)**：畫面顯示 `4529 對 (0 點)`，出現「匯率對高達 4529 對但歷史數據點為 0」的嚴重錯位。
3. **台美股官方字典 (stockDictionary)**：卡片僅顯示 `600 檔`，但下方「官方股票名稱字典庫與智慧自動補齊」面板顯示「總收錄標的數 3,350 檔 (台股 2,751 檔、美股 599 檔、自訂與同步增量 2,750 檔)」，導致上下區塊數據打架。

這破壞了使用者對系統透明度與快取診斷面板的信任，影響資料稽核與維護決策。

## Solution

修正底層統計分析函式與資料結構轉換邏輯：
1. **重構 `corporateActions` 快取統計解析**：
   - 正確處理 LocalStorage 中 `{ [symbol]: { events: RawCorporateEvent[], timestamp: number } }` 之字典結構。
   - 提取所有 symbol 鍵以計算真實「涵蓋標的數」，並展平（flatten）內部 `events` 陣列以統計真實「事件總筆數」。
   - 針對 IndexedDB `StoredCorporateAction[]` 陣列格式，以 `a.symbol` 進行去重計算涵蓋標的數，以陣列長度作為事件總筆數。
2. **重構 `historicalFx` 匯率資料點與幣別對計算**：
   - 修正 `saveHistoricalFxToStorage` 與 `getStorageInspectorStats` 的資料結構映射。
   - 將以日期為 Key 的 `Record<string, number>` 結構識別為 `1 對 (USD/TWD)` 貨幣對，將歷史匯率記錄數正確計入 `historicalFxDataPoints`。
3. **統一 `stockDictionary` 顯示口徑**：
   - 在快取統計中提供 `stockDictionaryTotalCount` (全量標的數 3,350 檔)、`stockDictionaryOfficialCount` (內建官方數 600 檔) 與 `stockDictionaryCustomCount` (同步與自訂增量數 2,750 檔)。
   - 在 UI 卡片呈現真實快取收錄標的數（如 `3,350 檔`），消除上下面板數字不一致。

## User Stories

1. As a 投資者與系統管理者, I want 公司行動資料庫快取正確顯示涵蓋標的數與總事件筆數 (例如 `61 檔 (183 筆)`), so that 我能清晰掌握目前系統已快取了多少檔股票的除權息及減資事件。
2. As a 投資者與系統管理者, I want 歷史外匯匯率快取正確顯示幣別對數量與歷史數據點 (例如 `1 對 (4,529 點)`), so that 我能清楚了解系統掌握了多少天的 USD/TWD 歷史匯率走勢。
3. As a 投資者與系統管理者, I want 雙軌快取檢視器中的台美股字典檔數與下方字典庫管理面板的「總收錄標的數」完全吻合 (顯示 3,350 檔), so that 我不會因上下介面數字不一致而產生系統錯誤的困惑。
4. As a 開發者與維護者, I want `getStorageInspectorStats()` 具備防禦性解析能力, so that 無論資料是存於 IndexedDB 還是 LocalStorage 回退層，都能產出語意清晰且型別安全的統計報表。
5. As a 測試工程師, I want 公開介面縫隙 `getStorageInspectorStats()` 與 `getStockDictionaryStats()` 具備 100% 的單元測試覆蓋, so that 未來的快取結構演進不會再次發生統計指標退化。

## Implementation Decisions

- **領域介面修訂 (Domain Interface)**：
  - 更新 `MarketCacheStats` 介面，新增 `stockDictionaryTotalCount: number` 欄位。
- **快取資料結構轉換邏輯 (Reconciliation Logic)**：
  - 在 `getStorageInspectorStats()` 中，解析 `STOCK_TRACKER_CA_CACHE_V1` 時：
    ```ts
    const caSymbols = Object.keys(parsedCaCache || {});
    const caTotalEvents = caSymbols.reduce((sum, sym) => sum + (parsedCaCache[sym]?.events?.length || 0), 0);
    ```
  - 解析 `historicalFx` 時：
    ```ts
    const fxPairsCount = Object.keys(fxMap).length > 0 ? 1 : 0;
    const fxDataPointsCount = Object.keys(fxMap).length;
    ```
- **UI 呈現與語意對齊 (UI Presentation)**：
  - `src/components/SettingsWorkspace.tsx` 中的「2. 行情與市場快取」卡片：
    - 公司行動：`{stats.marketCache.corporateActionsSymbols} 檔 ({stats.marketCache.corporateActionsTotal} 筆)`
    - 歷史外匯：`{stats.marketCache.historicalFxPairs} 對 ({stats.marketCache.historicalFxDataPoints.toLocaleString()} 點)`
    - 字典收錄：`{stats.marketCache.stockDictionaryTotalCount.toLocaleString()} 檔`
- **架構規範遵從**：
  - 嚴格遵守 KISS 原則與防禦性開發，不引入多餘的臨時結構。

## Testing Decisions

- **測試縫隙 (Test Seams)**：
  1. `getStorageInspectorStats()` 公開函式（涵蓋 IndexedDB 主路徑與 LocalStorage 回退路徑）。
  2. `getStockDictionaryStats()` 與 `stockNameResolver.ts` 公開介面。
  3. `saveHistoricalFxToStorage` 與 `loadHistoricalFxFromStorage` 讀寫一致性。
- **既有測試基準 (Prior Art)**：
  - 擴充 [`src/utils/db.test.ts`](file:///d:/APP/股票紀錄/src/utils/db.test.ts) 中的 `getStorageInspectorStats` 整合測試集。
  - 擴充 [`src/engine/stockNameResolver.test.ts`](file:///d:/APP/股票紀錄/src/engine/stockNameResolver.test.ts)。

## Out of Scope

- 修改第三方 API (FinMind / FMP / TWSE) 的回傳結構或請求協議。
- 修改交易紀錄與現金帳本的本體計算引擎。
- 重構整個 SettingsWorkspace 的 UI 版面架構。

## Further Notes

- 此修復將無縫相容現有 LocalStorage 與 IndexedDB 內的使用者快取，無需清空快取即可立即在 UI 上看到校正後的正確數據。
