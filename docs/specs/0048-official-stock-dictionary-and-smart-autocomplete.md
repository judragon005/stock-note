# 需求規格說明書 (PRD #0048)：台股與美股本地官方股票名稱字典庫、全域解析與智慧自動補齊系統

## 1. 執行摘要 (Executive Summary)

本規格書定義一套專為台股（TWSE/TPEx 官方）與美股（S&P 500 / Nasdaq 100 / 熱門 ETF）設計的**本地股票名稱字典庫與智慧補全架構**。
透過內建全量官方台股清單（2,000+ 檔）與精選美股繁體中文清單（500+ 檔），結合本地 IndexedDB 持久化快取、TWSE/TPEx 官方 Open API 一鍵同步、交易表單雙向即時檢索（代碼/中文名稱）與自動帶入，以及全站 `resolveOfficialSecurityName` 全域一致解析，徹底消除手動輸入股票名稱的繁瑣與命名不一致問題，實現離線可用、官方權威與極致流暢的記帳體驗。

---

## 2. 背景與痛點 (Background & Problem Statements)

1. **痛點一：手動新增交易需重複輸入股票中文名稱**
   * 使用者在填寫買進、賣出或除權息交易時，輸入代碼（如 `2330` 或 `AAPL`）後，仍須手動在「標的名稱」欄位打字輸入「台積電」或「蘋果」。若漏填則僅顯示英數字代碼，降低可讀性。
2. **痛點二：既有官方字典收錄有限且為硬編碼**
   * 目前 `OFFICIAL_SECURITY_NAMES` 僅靜態硬編碼約 20 檔核心標的，無法覆蓋台灣 2,000+ 檔上市、上櫃、興櫃股票及主流美股與 ETF。
3. **痛點三：美股中文名稱缺乏統一標準與記住自訂名稱機制**
   * 美股官方（SEC/Nasdaq）僅提供英文名稱，缺乏繁體中文對照；使用者自訂名稱後無法自動在未來的交易或報表中被重複使用與繼承。
4. **痛點四：缺乏離線優先與官方資料更新管道**
   * 無法在無網路環境下即時查詢股票名稱，亦缺乏一鍵從臺灣證券交易所 (TWSE) 及櫃買中心 (TPEx) 官方 OpenAPI 更新最新掛牌標的的機制。

---

## 3. 架構設計與第一性原理 (Architecture & First Principles)

```mermaid
flowchart TD
    subgraph 資料來源與儲存層 (Data & Storage Tier)
        S1["內建靜態字典 (Static Seed Data)<br/>- TWSE/TPEx 全量台股 (2,000+ 檔)<br/>- 美股熱門指數/ETF 中文 (500+ 檔)"]
        S2["官方 OpenAPI 同步<br/>- TWSE 上市股票清單 API<br/>- TPEx 上櫃/興櫃清單 API"]
        IDB[("本地持久化快取 (IndexedDB / LocalStorage)<br/>- stockDictionary 儲存槽<br/>- 使用者自訂/擴充標的")]
        S1 --> IDB
        S2 -->|設定頁一鍵同步| IDB
    end

    subgraph 核心解析與搜尋引擎 (Engine Tier)
        E1["StockNameResolver<br/>- resolveOfficialSecurityName(symbol, fallback)<br/>- searchStockSuggestions(query, market)"]
        IDB --> E1
    end

    subgraph 應用與互動層 (Presentation Tier)
        UI1["TradeModal 交易表單<br/>- 雙向檢索 (代碼/中文)<br/>- 代碼輸入自動補齊名稱<br/>- 支援手動修改優先"]
        UI2["全站視圖 (HoldingsTable / Treemap / 歷史)<br/>- 全域一致顯示官方繁中名稱"]
        UI3["SettingsWorkspace 設定頁<br/>- 字典狀態 (檔數/更新日)<br/>- 一鍵同步官方最新清單"]
        E1 --> UI1
        E1 --> UI2
        E1 --> UI3
    end
```

### 3.1 靜態內建種子資料庫 (`src/data/stockDictionary.ts`)
* **台股全量字典**：
  * 完整收錄臺灣證交所 (TWSE) 上市股票、ETF、創新板，以及櫃買中心 (TPEx) 上櫃股票、興櫃股票之代碼與繁體中文簡稱（如 `2330` ➔ `台積電`, `0050` ➔ `元大台灣50`, `6547` ➔ `高端疫苗`）。
* **美股精選繁中字典**：
  * 收錄 S&P 500、Nasdaq 100 指數成分股、熱門大型科技股（如 `NVDA` ➔ `輝達`, `AAPL` ➔ `蘋果`, `MSFT` ➔ `微軟`）、主流指數與主題 ETF（如 `VOO` ➔ `Vanguard標普500 ETF`, `QQQ` ➔ `Invesco那斯達克100 ETF`, `VT` ➔ `Vanguard全世界股票ETF`, `TLT` ➔ `iShares 20年期以上美國公債ETF`）及主要 ADR。
* **資料結構**：
  ```typescript
  export interface StockDictionaryItem {
    symbol: string;         // 代碼 (全大寫)
    name: string;           // 繁體中文名稱 / 官方簡稱
    market: MarketType;     // 'TW' | 'US'
    englishName?: string;   // 英文公司全名 (選填)
    category?: string;      // 產業類別 / ETF 類型 (選填)
    source: 'TWSE' | 'TPEX' | 'US_POPULAR' | 'USER_CUSTOM' | 'OPENAPI_SYNC';
    updatedAt: string;      // ISO 日期字串
  }
  ```

### 3.2 本地 IndexedDB 持久化與官方 OpenAPI 同步模組 (`src/engine/stockDictionarySync.ts`)
* **儲存策略**：
  * 啟動時以靜態種子資料初始化。若 IndexedDB 中已有同步資料或使用者自訂條目，則以 IndexedDB 覆蓋/增量合併。
* **官方 Open API 同步管線**：
  * **TWSE 上市清單**：串接臺灣證券交易所 OpenAPI / Open Data（如 `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` 或上市公司基本資料）。
  * **TPEx 上櫃清單**：串接證券櫃檯買賣中心 OpenAPI。
  * 透過 CORS Proxy 或標準 JSON Endpoint 抓取，更新最新掛牌代碼與名稱至 IndexedDB。

### 3.3 雙向智慧搜尋與表單即時自動補齊 (`TradeModal.tsx`)
1. **輸入代碼自動補齊名稱**：
   * 當使用者在「標的代碼」欄位輸入或變更代碼時，系統即時查詢字典庫。
   * 若代碼精確命中且「標的名稱」欄位為空白或為舊有自動帶入值時，自動填入對應的繁體中文名稱。
   * 若使用者手動編輯過名稱，表單尊重使用者的手動輸入。
2. **雙向搜尋建議 (Autosuggest)**：
   * 下拉建議支援輸入代碼（如 `2330`、`NVDA`）或輸入中文關鍵字（如 `台積`、`蘋果`、`美債`）進行模糊匹配。
   * 點選建議項目時，同步更新「代碼」、「標的名稱」與「市場 (TW/US)」，並自動連動手續費與幣別。

### 3.4 全域一致解析 (`src/utils/storage.ts` & `src/engine/stockNameResolver.ts`)
* 升級 `resolveOfficialSecurityName(symbol: string, fallbackName?: string): string`：
  1. 優先查核本地最新合併字典（含官方清單與自訂快取）。
  2. 若無繁中名稱但為美股且有英文官方名稱，退回英文官方簡稱。
  3. 若均查無，回退至傳入的 `fallbackName` 或原始 `symbol`。
* 確保 `HoldingsTable`、`SummaryCards`、`TreemapChart`、`TradeHistoryTable`、`CorporateActionScanner` 及 CSV 匯入管線皆能自動呈現統一繁中名稱。

### 3.5 設定頁管理模組 (`SettingsWorkspace.tsx`)
* 新增「股票名稱官方字典管理」面板：
  * 顯示目前收錄之台股總檔數、美股總檔數、自訂標的數與最後更新時間。
  * 提供「一鍵同步臺灣證交所與櫃買中心最新清單」按鈕，具備即時載入狀態、成功提示與錯誤降級防護。
  * 提供「清除自訂快取 / 重設回內建字典」按鈕。

---

## 4. 驗收標準 (Acceptance Criteria)

1. **靜態字典庫完整性驗收**：
   * 台股字典收錄完整 TWSE/TPEx 上市、上櫃與興櫃常用代碼（> 2,000 檔），包含 `2330` ➔ `台積電`、`0050` ➔ `元大台灣50`、`00878` ➔ `國泰永續高股息`、`6547` ➔ `高端疫苗` 等。
   * 美股字典收錄 > 500 檔標普500、那斯達克100及主流 ETF 繁體中文名稱（如 `NVDA` ➔ `輝達`, `AAPL` ➔ `蘋果`, `VOO` ➔ `Vanguard標普500 ETF`, `VT` ➔ `Vanguard全世界股票ETF`）。
2. **交易表單自動補齊與雙向搜尋驗收**：
   * 在 `TradeModal` 輸入 `2330`，標的名稱欄位必須自動帶入 `台積電`。
   * 在 `TradeModal` 代碼欄位輸入 `蘋果`，建議清單必須顯示 `AAPL | Apple 蘋果 | US`，點擊後代碼自動填入 `AAPL`、名稱填入 `Apple 蘋果`、市場自動切換為 `US`。
   * 使用者手動修改名稱為 `護國神山台積電` 並儲存，送出之交易名稱必須為 `護國神山台積電`，且自動持久化記錄至自訂字典。
3. **全域一致顯示驗收**：
   * 庫存列表與資產樹狀圖中，無論歷史匯入之名稱為何，只要代碼存在於官方字典中，皆以官方繁中名稱標準化呈現。
4. **設定頁官方同步驗收**：
   * 設定頁清晰呈現字典統計數據，點擊「同步官方最新清單」後能在本地更新並持久化儲存。
5. **品質與測試覆蓋驗收**：
   * 撰寫獨立測試檔案（`stockNameResolver.test.ts`、`stockDictionarySync.test.ts`、`TradeModal.test.ts`），單元測試 100% 通過，TypeScript 0 錯誤。
