# 規格書 0168：台美雙軌零 CSV 背景全回補、戰情室字母代碼修復與統一 API 金鑰管理中心規格 (Zero-CSV Dual-Market Backfill, Symbol Normalization, and Unified API Key Console Spec)

## Problem Statement

在系統運行、主力戰情室操作與 API 設定檢視過程中，發現以下四大架構缺陷與體驗痛點：

1. **台股代碼後綴英文字母被誤判為美股 (Photo 1: Symbol Market Inference Bug)**：
   - 在 [`src/components/aiForceDashboard/HeaderQueryBar.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/HeaderQueryBar.tsx) 中，推斷市場別的函式 `inferMarketType` 僅使用 `/^\d+$/` 判斷台股，其餘代碼一律誤判為美股 (`US`)。
   - 台股市場包含大量合法帶英文字母後綴之標的，如主動型 ETF / 創新板 / 特殊 ETF（如 `00411A` 主動統一前沿科技、`00403A`）、債券 ETF（`00679B`、`00937B`）、特別股（`2881A`）與槓反/商品 ETF（`00632R`、`00642U`）。
   - 當使用者在主力戰情室查詢 `00411A` 時，系統將其誤判為美股，導致幣別設定為 `USD`、成交量單位變為 `股`、轉打 Yahoo Finance 美股端點失敗，最終顯示「尚無歷史交易日 K 數列」。
   - 同時本地 SQLite 數據庫受 [技術債 0043](file:///d:/APP/股票紀錄/docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md) 影響，將櫃買中心掛牌標的存為 `00411AO`（存有 37 筆完整日 K），造成正規代碼無法直接命中湖倉。

2. **API 金鑰與金鑰池管理介面割裂且樣式毛坯 (Photo 2: Dual-Key Management Fragmentation & Raw UI)**：
   - 在設定頁面中，上方呈現舊版「外部金融資料 API 金鑰管理」（手動輸入 FinMind、FMP、Alpha Vantage 與 Proxy URL），下方呈現新版「外部金融 API 金鑰池管理」（管理 FinMind、Finnhub、FRED 等多金鑰輪替）。
   - 兩者功能重複、概念割裂（同一個 FinMind/FMP 金鑰在上下兩處重複輸入），且下方元件缺少深色毛玻璃 CSS 封裝，直接暴露原生白色 HTML `<input>` 與預設排版，嚴重損害金融看板一致性與專業視覺美感。

3. **日 K 湖倉資料表缺少成交筆數欄位 (Missing Transactions Column in `daily_candles`)**：
   - 本地 SQLite `daily_candles` 資料表建構於前期規範，欄位僅包含 `(symbol, date, open, high, low, close, adj_close, volume, turnover)`，未收錄真實「成交筆數 (transactions)」。
   - 儘管在 [規格書 0166](file:///d:/APP/股票紀錄/docs/specs/0166-market-catchup-loop-fix-and-zero-mock-volume-alignment-spec.md) 拔除了虛構的 `volume * 2.3` 偽造數據，但由於資料庫未持久化官方成交筆數，戰情室在讀取離線日 K 時只能誠實呈現破折號 `-`，無法還原台股官方日報已公開的成交筆數。

4. **過度依賴本機 D 槽 CSV 歷史檔案，缺乏乾淨環境自給自足的全回補管線 (Local CSV Island Dependency)**：
   - 既有的全量歷史回補高度依賴本地硬碟 D 槽既有的 CSV 檔案；未來將專案交付給其他使用者或部署在全新環境時，其他使用者電腦並無本地 CSV 可供回補。
   - 目前缺少一套「以時間換空間、電腦不關機在背景運行、完全利用公開/免費官方端點」之台美雙軌歷史資料庫自給自足建立管線。

---

## Solution

1. **台股代碼推斷正則擴充與資料庫別名防呆 (Symbol Market Inference & Debt 0043 Resolution)**：
   - 擴充 [`HeaderQueryBar.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/HeaderQueryBar.tsx) 中的 `inferMarketType`，支援匹配台股正規代碼特徵 `/^\d{4,6}[A-Z]?$/`，並優先比對 `stockDictionary` 中的標的市場屬性。
   - 在 [`marketCacheLoader.ts`](file:///d:/APP/股票紀錄/src/engine/marketCacheLoader.ts) 讀取 SQLite `daily_candles` 時增加別名容錯探測：若以標準代碼查無資料，自動探測尾綴 `O` 之別名（如 `00411A` -> `00411AO`），確保現有資料立即可讀。
   - 執行 SQLite 資料庫代碼遷移腳本，將 `daily_candles` 中歷史帶 `O` 的櫃買標的代碼正規化，正式將 [技術債 0043](file:///d:/APP/股票紀錄/docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md) 標記為 `RESOLVED`。

2. **統一金融 API 金鑰與金鑰池控制中心 (Unified Financial API Gateway & Key Pool Console)**：
   - 在設定頁面將舊版單一金鑰卡片與新版多金鑰池管理員整合成單一頂級元件 `UnifiedApiKeyManager`。
   - **單一真實來源 (SSOT)**：所有金鑰統一持久化於本地加密金鑰池中；單一預設金鑰即為池中第一組啟用中之 Key。
   - **分流標籤架構**：
     - **全域通道**：提供自訂反向代理伺服器端點 (Proxy URL) 與 Web Crypto 256-bit 加密狀態指示。
     - **多供應商卡片**：將台股 (FinMind)、美股 (Finnhub / FMP / SEC EDGAR)、總經與匯率 (FRED / Alpha Vantage)、加密貨幣 (CoinGecko) 整合至統一標籤頁，支援快速主要 Key 配置、多 Key 輪替負載均衡、單鍵健康測活 (Probe) 與 30 秒冷卻保護。
   - **統一現代暗黑毛玻璃 UI (Glassmorphism)**：全面消除原生白色輸入框，統一採用 `rgba(15, 23, 42, 0.75)` 背景、發光 Focus 邊框與流暢微動畫。

3. **SQLite `daily_candles` 擴充 `transactions` 欄位與官方入庫對齊**：
   - 平滑執行 SQLite Schema Migration：

     ```sql
     ALTER TABLE daily_candles ADD COLUMN transactions INTEGER;
     ```

   - 在官方盤後同步 (`sync-tw-market.cjs`、`market-sync-core.cjs`) 與全回補管線中，解析 TWSE `MI_INDEX` 與 TPEx `1430` 之官方成交筆數，入庫至 `transactions` 欄位，讓戰情室可展示真實成交筆數。

4. **台美雙軌「零本地 CSV」背景全市場歷史回補管線 (Dual-Market Date-Driven & Tiered Backfill Pipeline)**：
   - **台股市場（日期驅動 Date-Driven）**：
     - 利用證交所 (TWSE) 與櫃買中心 (TPEx) 官方每日全市場聚合報表（`MI_INDEX`、`T86`、`1430`），遍歷過去 250 個交易日。
     - 每個交易日僅需 4 次 HTTP 請求，全市場 250 天僅需 **1,000 次請求**（免 API Key、零費用、全市場 2,361+ 檔 100% 覆蓋）。
     - 強制每請求間隔 3,000ms（防爬蟲禮儀），遇週末/休市自動跳過，支援 `sync_checkpoints` 斷點續傳。
   - **美股市場（分級隊列驅動 Tiered Bootstrap）**：
     - 整合既有 [`sync-us-market.cjs --mode=bootstrap`](file:///d:/APP/股票紀錄/scripts/market-sync/sync-us-market.cjs)，依「Tier 0 (持股) -> Tier 1 (標普與藍籌) -> Tier 2 (全市場 1,796 檔)」順序回補 250 天歷史 OHLCV。
     - 具備 800~1,200ms 隨機抖動與 429 階梯式熔斷退避。
   - **總控腳本**：建立 `scripts/market-sync/backfill-full-market-history.cjs`，支援單一指令 `npm run market:backfill-all`，在背景不關機平穩輪詢執行。

---

## User Stories

1. **作為投資人**，當我在主力戰情室輸入 `00411A`（主動統一前沿科技）或 `00679B`（元大美債20年）時，系統能精準識別為台股 `TW`，幣別呈現為 `TWD`，成交量單位為 `張`；同時戰情室全維度卡片（AI 決策核心、多維度雷達、量價分佈、籌碼動向等 18 張模組）必須全面連動本地 SQLite 湖倉之真實日 K 與籌碼數據即時演算更新，徹底終結單點空狀態與外部誤判。
2. **作為系統使用者**，當我進入設定頁面管理 API Key 時，我能看到一個視覺統一、設計精美且現代化的暗黑毛玻璃金鑰管理控制台，我可以在同一個地方配置 Proxy URL、單一主要金鑰或為特定服務註冊多組免費 Key 進行自動輪替，不再面臨重複輸入與風格割裂的困擾。
3. **作為全新使用者/交付對象**，當我在一台沒有任何歷史 CSV 備份的全新電腦上執行 `npm run market:backfill-all` 時，系統能在背景不關機穩定運行，自動從公開官方端點建立全市場台美雙軌日 K、成交筆數與三大法人歷史湖倉。
4. **作為量化交易員**，我希望在主力戰情室查看個股時，頂部面板能顯示真實官方統計的成交筆數，既不造假灌水，也不會在資料已入庫時遺漏顯示。

---

## Technical Specifications & Architecture

### 1. 前端代碼特徵識別擴充 (`src/components/aiForceDashboard/HeaderQueryBar.tsx`)

```typescript
/**
 * 依據代號特徵推斷市場別 (TW vs US)
 * 支援標準 4~6 碼數字，或 4~5 碼數字 + 單一合法英文字母後綴 (如 00411A, 00679B, 00632R, 2881A)
 */
export function inferMarketType(symbol: string): MarketType {
  const clean = cleanSymbolInput(symbol);
  if (!clean) return 'TW';

  // 1. 符合台股標準上市櫃、ETF、特別股代碼格式
  if (/^\d{4,6}[A-Z]?$/.test(clean)) {
    return 'TW';
  }

  // 2. 命中官方台股字典檔
  if (stockDictionary.some((s) => s.symbol === clean && s.market === 'TW')) {
    return 'TW';
  }

  return 'US';
}
```

### 2. SQLite Schema 升級與代碼遷移 (`scripts/market-sync/sqlite-db-core.cjs`)

```sql
-- 1. daily_candles 擴充 transactions 欄位
ALTER TABLE daily_candles ADD COLUMN transactions INTEGER;

-- 2. 執行代碼標準化遷移 (技術債 0043 結案)
-- 將結尾帶 O 的櫃買標的歸併至標準代碼 (例如 00411AO -> 00411A, 3293O -> 3293)
INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
SELECT 
  substr(symbol, 1, length(symbol) - 1) AS symbol,
  date, open, high, low, close, adj_close, volume, turnover, transactions
FROM daily_candles 
WHERE symbol GLOB '*[0-9]O' OR symbol GLOB '00[0-9]*[A-Z]O';

DELETE FROM daily_candles WHERE symbol GLOB '*[0-9]O' OR symbol GLOB '00[0-9]*[A-Z]O';
```

### 3. 統一金鑰控制中心結構 (`UnifiedApiKeyManager.tsx`)

```
UnifiedApiKeyManager (整合容器，依供應商統一卡片式架構)
 ├── TopGlobalBar:
 │    ├── 標題：全方位外部金融 API 網關與金鑰池控制中心 (Web Crypto 256-bit 保護中)
 │    └── 全域自訂代理伺服器 (customProxyUrl) 配置與連線驗證狀態
 └── ProviderCardsContainer (供應商專用卡片式分流):
      ├── [🇹🇼 FinMind] [🇺🇸 Finnhub] [🇺🇸 FMP] [🏛️ FRED] [🪙 CoinGecko] [📑 SEC EDGAR]
      └── ProviderCard (當前選中之供應商卡片，徹底消除重複輸入):
           ├── 快速主要預設金鑰輸入 (Primary Active Key，自動映射至池中第一組)
           ├── 金鑰池狀態清單 (Key Pool Table: 遮罩 Token, 別名, 額度, 狀態, 單鍵測活, 30s 冷卻, 刪除)
           └── ➕ 新增輪替備援金鑰表單 (貼上 Token, 別名, 自訂單日上限, 負載均衡 Round-Robin)
```

### 4. 台美雙軌背景全回補總控腳本與 API (`scripts/market-sync/backfill-full-market-history.cjs`)

```typescript
interface BackfillOptions {
  market: 'ALL' | 'TW' | 'US';
  days: number;           // 預設 250 交易日
  throttleMs: number;     // 台股預設 3000ms, 美股預設 1000ms
  resume: boolean;        // 預設 true, 讀取 sync_checkpoints
}

// 支援雙軌啟動：
// 1. CLI 指令: npm run market:backfill-all (終端機輸出雙軌進度條與日誌)
// 2. Web UI: 設定 ➔ 排程中心 ➔ POST /api/market/backfill-all (背景後台執行，回傳任務狀態)
```

---

## Implementation Decisions

1. **台股全歷史回補採用「日期驅動 (Date-Driven)」而非「個股驅動 (Symbol-Driven)」**：
   - 拒絕過度工程化與無謂的 API 請求浪費。TWSE `MI_INDEX` 與 TPEx `1430` 是證交所官方整包日報，抓 1 次即可獲取全市場 2,361+ 檔股票當日所有價量，250 天只需 1,000 次請求即可建好全台灣股市一年數據。
2. **金鑰管理資料層維持 100% 本地隔離 (Zero-Cloud)**：
   - 所有 Key 僅儲存於本地 IndexedDB / LocalStorage（加密保存），絕不隨 Git 提交，亦不傳送至任何遠端伺服器。
3. **無損資料庫遷移 (Non-destructive Migration)**：
   - 在 `initSqliteLakehouseDb` 啟動時以 `PRAGMA table_info(daily_candles)` 檢查欄位，若無 `transactions` 自動執行 `ALTER TABLE`，確保舊有資料庫開箱即用不噴錯。
4. **短天期新上市櫃標的智慧自適應降級 (Smart Adaptive Depth for Short Histories)**：
   - 對於 `00411A` 等掛牌天數未滿 250 天之新標的（如目前 37 筆日 K），戰情室 18 張卡片全面連動真實資料庫進行演算。
   - 足夠天數之短中期指標（MA5/10/20、短線量價分佈、短線動能雷達、三大法人籌碼動向）正常輸出；需 60D 季線或 250D 年線之長天期指標嚴格遵循 Zero Mock 原則，以 Honest Empty State 標註「新上市數據累積中」，禁止虛構或崩潰。
5. **金鑰控制台採「依供應商統一卡片式 (Provider-Centric Unified Cards)」**：
   - 徹底整併舊版單一金鑰卡片與新版多金鑰池，各供應商內部合一「主要金鑰輸入」與「多金鑰輪替池」，並全面套用 Dark Glassmorphism 現代金融面板風格。
6. **全回補啟動支援「雙軌並行 (CLI + 系統設定面板觸發)」**：
   - 除提供終端機守護指令 `npm run market:backfill-all` 外，同步在「設定 ➔ 排程中心」中新增一鍵觸發按鈕，透過 Vite 中介層非同步啟動長任務，斷點續傳不怕重啟。

---

## Testing Decisions

- **Seam 1: 代碼特徵推斷測試 (`HeaderQueryBar.test.tsx` / `stockNameResolver.test.ts`)**
  - 驗證 `00411A`、`00403A`、`00679B`、`00632R`、`2881A` 均推斷為 `TW`。
  - 驗證 `AAPL`、`NVDA`、`TSLA` 均推斷為 `US`。
- **Seam 2: 戰情室渲染整合測試 (`AiForceDashboardView.test.tsx`)**
  - 驗證傳入 `00411A` 時，幣別為 `TWD`、單位為 `張`、能正確載入歷史 K 線。
- **Seam 3: 金鑰池整併組件測試 (`UnifiedApiKeyManager.test.tsx`)**
  - 驗證 Proxy URL 修改能持久化保存。
  - 驗證新增、切換供應商、刪除金鑰與 30 秒冷卻倒數正常運作。
- **Seam 4: 全市場回補與斷點續傳測試 (`backfill-full-market-history.test.ts`)**
  - 驗證日期驅動能正確將 TWSE MI_INDEX 與 TPEx 1430 解析並寫入 `daily_candles`（含 `transactions`）。
  - 驗證斷點續傳重啟時不會重複抓取已完成之交易日。
