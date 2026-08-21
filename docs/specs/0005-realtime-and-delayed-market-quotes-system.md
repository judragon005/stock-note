# 產品需求規格說明書 (PRD): V1.4 全市場即時與延遲報價系統與自訂價格鎖定

- **編號**: 0005
- **對應 Issue**: #46 (Tickets: #47, #48, #49, #50)
- **狀態**: Approved
- **日期**: 2026-08-21

---

## 1. Problem Statement (問題陳述)

在先前版本中，系統之持股參考市價主要依賴使用者手動編輯或建倉交易之成交單價，存在以下痛點：
1. **需手動逐一維護市價**：若持股數量較多，使用者難以頻繁手動更新每一檔標的之最新價格，導致持倉市值與未實現損益無法即時反映當前市場狀況。
2. **缺乏免費/官方純前端報價整合**：使用者希望系統能自動自公開免費或官方來源（如 Yahoo Finance API、台灣證交所 TWSE OpenAPI）拉取盤中即時/延遲報價或前一交易日收盤價，且無須額外架設後端伺服器或購買付費 API Key。
3. **缺乏手動鎖定與快取備援機制**：若使用者希望手動測試自訂試算價格，或遇到網路斷線、API 速率限制時，系統缺乏「手動鎖定保護」與「持久化快取平滑退回」機制，容易發生價格覆蓋衝突或畫面計算崩潰。
4. **報價狀態與時效不明顯**：使用者無法直觀辨識當前價格是「盤中即時/延遲」、「昨日收盤價」、「手動鎖定」或「快取備援」，亦無開休市狀態與最後更新時間指示。

---

## 2. Solution (解決方案)

全面導入**「全市場即時/延遲多源報價引擎 + 智慧時段自動輪詢 + 手動鎖定快取架構」**：

1. **純前端多源免費報價引擎 (`src/engine/priceFetcher.ts`)**：
   - **全市場主來源 (Yahoo Finance API v8/v7)**：透過現有健全的 CORS 代理池（含指數退避與多節點輪詢），直接抓取台股（上市 `.TW` / 上櫃 `.TWO` / ETF）與美股（NYSE / NASDAQ / AMEX）之最新市價、前一日收盤價 (previousClose)、當日漲跌額與漲跌百分比。
   - **台股官方備援 (TWSE OpenAPI)**：若 Yahoo Finance 台股請求超時或異常，自動降級至台灣證交所官方 OpenAPI 盤後收盤價。
   - **持久化快取 (localStorage)**：抓取失敗時平滑退回本地快取數據，保證系統 100% 離線可用。
2. **智慧開盤自動輪詢與手動觸發 (`src/hooks/usePriceAutoRefresh.ts`)**：
   - **進站自動抓取**：網頁載入時自動為當前有效持股拉取最新市場報價。
   - **智慧交易時段偵測**：自動判定台股開盤時段（09:00–13:30）與美股開盤時段（21:30–04:00 夏令 / 22:30–05:00 冬令，週一至週五）。開盤時段以 60 秒間隔背景自動輪詢刷新；休市時段維持最新收盤價，節省網路與代理頻寬。
   - **全域與單檔手動刷新**：介面頂部與持股表格提供「一鍵更新全場市價」與單檔立即刷新功能。
3. **自訂價格手動鎖定保護機制 (Manual Lock Shield)**：
   - 使用者在介面上手動修改特定標的價格時，系統自動將該標的標記為「自訂鎖定 (🔒)」。
   - 自動輪詢時跳過已鎖定標的，避免使用者自訂的試算價格被自動刷新覆蓋。
   - 提供一鍵解除鎖定按鈕，隨時恢復全自動市場報價追蹤。
4. **透明化報價狀態與時鐘指示 (`src/components/HoldingsTable.tsx` & `src/components/Header.tsx`)**：
   - 表格市價旁呈現清晰狀態徽章：
     - 🟢 **即時/盤中延遲** (Realtime / Delayed)
     - 🟡 **昨日收盤價** (Previous Close)
     - 🔒 **自訂鎖定** (Manual Locked)
     - ⚠️ **快取備援** (Cached / Fallback)
   - 價格旁並列呈現「當日漲跌幅 (+2.5% / -1.2%)」與漲跌金額。
   - 頂部導航列顯示全局「最後更新時間 (HH:mm:ss)」與市場開休市倒數提示。

---

## 3. User Stories (使用者故事)

1. **US-47 (進站自動同步持股市價)**：作為投資人，當我開啟股票紀錄系統時，系統自動拉取我目前所有有效持股（台股與美股）之最新成交價或最新收盤價，並更新總市值與未實現損益。
2. **US-48 (開盤時段背景自動定時輪詢)**：作為活躍交易者，在台股或美股開盤期間，系統每 60 秒自動背景輪詢最新報價，無需我手動按重新整理。
3. **US-49 (台美股雙市場多源容錯抓取)**：作為跨市場投資人，系統能自動識別 2330（上市）、6547（上櫃）、0050（ETF）及 NVDA、AAPL（美股），當主來源異常時自動容錯備援或退回快取。
4. **US-50 (自訂價格鎖定與解鎖)**：作為投資人，當我想手動輸入某檔股票的特定價格進行壓力測試時，輸入後系統自動鎖定該價格不被輪詢覆蓋；當我點擊解鎖圖示時，立即恢復為市場最新報價。
5. **US-51 (頂部與單檔一鍵手動刷新)**：作為使用者，我可以隨時點擊頂部的「一鍵更新市價」或持股列旁的刷新按鈕，強制發起最新報價抓取。
6. **US-52 (報價狀態徽章與當日漲跌幅呈現)**：作為使用者，我在持股表格中能清楚看到每檔標的最新價格、當日漲跌金額/百分比，以及報價來源狀態（🟢/🟡/🔒/⚠️）。
7. **US-53 (離線備援與本地持久化)**：作為使用者，當網路斷線或公共代理不穩定時，系統沿用本地上次有效快取價格，並於介面呈現橘色警告標籤，不中斷任何資產與圖表計算。

---

## 4. Implementation Decisions (實作架構決策)

### 4.1 型別擴充 (`src/types/stock.ts`)
```typescript
export type PriceQuoteStatus = 'REALTIME' | 'DELAYED' | 'PREVIOUS_CLOSE' | 'MANUAL_LOCKED' | 'CACHED' | 'ERROR';

export interface PriceQuote {
  symbol: string;
  market: MarketType;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  currency: 'TWD' | 'USD';
  status: PriceQuoteStatus;
  updatedAt: number; // Unix timestamp in ms
  source: 'YAHOO' | 'TWSE' | 'MANUAL' | 'CACHE';
}

export interface PriceMetadataStore {
  quotes: Record<string, PriceQuote>;
  lockedSymbols: string[];
  lastGlobalUpdate?: number;
}
```

### 4.2 報價引擎 (`src/engine/priceFetcher.ts`)
- **Symbol Normalization**:
  - 台股上市：`2330` ➔ 優先 `2330.TW`，備援 `2330.TWO`。
  - 台股上櫃：`6547` ➔ 優先 `6547.TWO`，備援 `6547.TW`。
  - 美股：`NVDA`、`AAPL` ➔ 直接請求 `NVDA`、`AAPL`。
- **CORS 代理池整合**:
  - 沿用 `corporateActionScanner.ts` 中驗證過的代理節點池 (`corsproxy.io`, `api.allorigins.win`, `codetabs`)。
  - 實作批次或並行抓取，單一請求超時設為 4000ms。
- **TWSE 官方 OpenAPI 備援**:
  - `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` 每日全市場收盤價備援。

### 4.3 時鐘與自動輪詢 Hook (`src/hooks/usePriceAutoRefresh.ts`)
- 判定市場交易時段：
  - 台股：週一至週五 09:00 ~ 13:30 (UTC+8)。
  - 美股：週一至週五 21:30 ~ 04:00 (夏令 UTC+8) / 22:30 ~ 05:00 (冬令 UTC+8)。
- 處於任一開盤時段時，啟動 60 秒 setInterval 計時器。
- 支援 `refreshAll()`、`refreshSymbol(symbol)`、`toggleLock(symbol)`。

### 4.4 本地儲存與持久化 (`src/utils/storage.ts`)
- `STOCK_TRACKER_PRICE_METADATA_V1`：儲存 `PriceMetadataStore`（含各標的報價中繼資料與 `lockedSymbols` 鎖定清單）。
- 與既有 `STOCK_TRACKER_CUSTOM_PRICES_V1` 雙向相容。

### 4.5 UI 呈現升級
- **`Header.tsx`**:
  - 新增「⚡ 一鍵更新市價」按鈕（帶旋轉動畫與更新中狀態）。
  - 顯示「市場狀態：🟢 台股開盤中 / 🔴 已休市」與「最後報價更新時間」。
- **`HoldingsTable.tsx`**:
  - 在「最新參考市價」欄位加入：
    - 當前單價 + 漲跌色塊（紅/綠）與漲跌百分比（如 `+15.0 (+2.1%)`）。
    - 狀態小徽章（🟢 延遲/即時、🟡 昨收、🔒 鎖定、⚠️ 快取）。
    - 操作欄或價格旁提供「🔒 鎖定/解鎖」快速切換按鈕與個別「🔄 刷新」按鈕。

---

## 5. Testing Decisions (測試架構決策)

1. **公開介面單元測試 (Public Seams)**:
   - `src/engine/priceFetcher.test.ts`:
     - 測試台股上市 (`2330.TW`) 與上櫃 (`6547.TWO`) 報價解析（成交價、昨收、漲跌幅）。
     - 測試美股 (`NVDA`) 報價解析。
     - 測試主來源失敗時降級 TWSE OpenAPI / 本地快取的邏輯。
     - 測試手動鎖定標的過濾（鎖定標的不被覆蓋）。
     - 測試開休市時段判定函式 (`isMarketOpen`) 在各種日期時間情境下的正確性。
   - `src/utils/storage.test.ts`:
     - 測試 `PriceMetadataStore` 與 `lockedSymbols` 的讀寫、空值容錯與持久化。
2. **驗證門檻**:
   - `npm test`：100% 通過（含既有 100+ 測試與新增測試）。
   - `npm run build`：TypeScript 0 警告 0 錯誤。

---

## 6. Acceptance Criteria (驗證驗收清單)

- [ ] **AC-1**: 進入頁面時，系統自動為所有有效持股（股數 > 0）向 Yahoo Finance / TWSE 發起報價請求，並正確更新最新市價。
- [ ] **AC-2**: 在台股（09:00-13:30）或美股（21:30-04:00）開盤時段，系統自動每 60 秒背景輪詢刷新報價。
- [ ] **AC-3**: 使用者手動修改某檔持股價格後，該標的自動標註為「🔒 手動鎖定」，後續輪詢時不會被覆蓋，直至使用者點擊解鎖。
- [ ] **AC-4**: 當 API 請求遭遇網路異常或限流時，系統自動回退至本地快取價格，並於介面呈現橘色 ⚠️ 徽章。
- [ ] **AC-5**: 持股表格能清晰呈現當前價格、當日漲跌額、當日漲跌百分比與狀態徽章（🟢 / 🟡 / 🔒 / ⚠️）。
- [ ] **AC-6**: 頂部導航列顯示最後更新時間戳，並提供「⚡ 一鍵更新市價」手動按鈕。
- [ ] **AC-7**: 所有單元測試 100% 通過，TypeScript 編譯 0 錯誤。
