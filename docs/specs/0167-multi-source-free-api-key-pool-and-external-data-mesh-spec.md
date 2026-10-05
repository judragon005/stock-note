# 規格書 0167：多來源免費金融資料網格、API Key 池負載均衡與關鍵外部資料補強規格 (Multi-Source Free API Key Pool and External Data Mesh Spec)

## Problem Statement

當前股票紀錄與量化分析系統在資料獲取上，面臨以下架構瓶頸與盲點：

1. **單點依賴與非官方逆向 API 風險 (Single Point of Failure & Scraping Vulnerability)**：
   - 美股行情報價與歷史 K 線高度仰賴 Yahoo Finance（非官方端點，無服務水準保證，容易遭遇 Cloudflare 驗證碼阻擋或暫時性 IP 限流）。
   - 遭遇連線失敗時，前端 fallback 至公開第三方 CORS 代理（如 `allorigins`, `corsproxy.io`），帶來嚴重延遲、資料竄改與隱私外洩風險。
2. **免費 API 額度過低且缺乏金鑰輪替架構 (Low Free-Tier Quota & Lack of Key Pool)**：
   - 台股三大財報仰賴 FinMind（免費帳號每小時僅 300 次請求）；美股仰賴 FMP（免費層每日僅 250 次請求且大量端點已轉為收費）。
   - 當使用者在進行「全市場歷史回溯（Backfill）」或「多檔標的即時掃描」時，極易在短時間內耗盡額度，導致後續請求全部中斷癱瘓。目前系統缺乏支援「多組 API Key 輪替（Key Rotation）、負載均衡與 429 退避」之調度中介層。
3. **前瞻性事件與深度籌碼/風控資料存在盲點 (Missing Corporate Action, Insider & Macro Signals)**：
   - **除權息前瞻日曆缺失**：系統現有應收股利與除權息掃描器缺乏台美股「未來除權息預告日程」，無法提前預估現金流，亦容易在除息日將跳空減額誤判為暴跌。
   - **法證防雷指標缺失**：台股地雷股的核心先兆「董監事持股質押比例 > 50%」與「大股東申報轉讓」未納入資料庫。
   - **總經定價錨定缺失**：夏普值與 CAPM 計算中寫死無風險利率（$R_f$），未動態串接 3 個月美債殖利率，導致宏觀環境判斷失真。

---

## Solution

1. **打造生產級 `SmartKeyRotator` 金鑰池中介層**：
   - 支援為各大供應商（FinMind, Finnhub, FRED, Polygon 等）註冊多組 API Key。
   - 採用加權 Round-Robin 輪替演算法，具備每分鐘與每日呼叫計數器。
   - 內建智慧熔斷機制：遭遇 `429 Too Many Requests` 時自動啟動指數退避（Exponential Backoff）並切換至下一組 Key；遭遇 `401/403 Invalid Key` 時自動拉黑。
2. **四階梯資料來源降級矩陣 (Four-Tier Fallback Matrix)**：
   - **第 1 階（零延遲）**：本地 SQLite Lakehouse / Dexie 快取。
   - **第 2 階（官方零 Key 端點）**：TWSE/TPEX 官方開放資料、SEC EDGAR 官方 API（自帶合法 User-Agent，獲取美股完整 10-K/10-Q 財報）。
   - **第 3 階（API Key 池）**：FinMind（台股籌碼與財報）、Finnhub（美股即時行情與重大事件）、FRED（聯準會總經與無風險利率）。
   - **第 4 階（降級提示）**：誠實提示無法獲取即時資料，返回歷史最後有效資料，阻斷高風險第三方公開代理。
3. **擴充四大核心外部資料維度**：
   - **公司行動預告 (Corporate Actions)**：串接 TWSE/TPEX 官方除權息預告端點，以及 Yahoo/Finnhub 美股拆股除息日曆。
   - **台股董監質押與內部人轉讓 (Insider Pledging)**：串接政府資料開放平臺 (data.gov.tw) 之公開資訊觀測站每日 JSON/CSV。
   - **總經與情緒指標 (Macro & Sentiment)**：串接 FRED 3M/10Y 美債殖利率與利差、CNN 恐懼與貪婪指數公開端點、期交所 Put/Call Ratio。
   - **美股 13F 機構與 Form 4 內部人持倉**：由 SEC EDGAR Submissions 端點提供機構籌碼追蹤。
4. **前端「API Key 管理中心」與本地端加密保存**：
   - 於系統設定介面新增 API Key 管理器，支援使用者手動輸入與管理多組 Key。
   - 所有 Key 僅加密留存於本地瀏覽器儲存（IndexedDB/LocalStorage），不隨 Git 提交，不傳輸至遠端伺服器。

---

## User Stories

1. **作為系統使用者**，我可以在設定頁面中輸入 3 組免費申請的 FinMind API Key 與 2 組 Finnhub API Key，系統在執行全市場掃描時會自動平均分攤請求，不再因單一 Key 額度耗盡而跳出報錯。
2. **作為投資人**，我可以在個股戰情室看到該標的「即將到來的除息日與預估發放金額」，並且在台股標的董監事質押比例超過 50% 時收到法證雷達的高風險紅燈警告。
3. **作為量化分析師**，我可以在計算夏普值與資產評價時，使用來自 FRED API 的真實當前美債無風險利率，而非過去寫死的靜態假想常數。
4. **作為資安合規員**，我要求系統內所有私有 API Key 皆保存在本地加密環境，且網路請求透過本地 Vite Reverse Proxy 注入，杜絕 Key 在瀏覽器 URL 中明文洩漏。

---

## Technical Specifications & Architecture

### 1. API Key 池型別定義 (`src/engine/apiKeyPoolTypes.ts`)

```typescript
export type ProviderType = 'finmind' | 'finnhub' | 'fred' | 'fmp' | 'polygon' | 'coingecko';

export interface ApiKeyItem {
  id: string;               // 隨機唯一標識 (非 Key 本身)
  provider: ProviderType;
  key: string;              // 實際 API Token
  alias?: string;           // 識別別名 (例如 "個人主帳號", "測試備用")
  dailyQuotaLimit: number;  // 單日上限 (-1 為不限)
  totalRequestsToday: number;
  rateLimitPerMin: number;  // 每分鐘上限
  consecutiveFailures: number;
  isBlacklisted: boolean;   // 遭遇 401/403 時標記為失效
  cooldownUntil: number;    // 遭遇 429 時的退避結束時間戳
  lastUsedTimestamp: number;
}

export interface KeyPoolExecutionOptions {
  provider: ProviderType;
  endpointUrl: (key: string) => string;
  fetcher: (url: string) => Promise<Response>;
  maxRetriesPerKey?: number;
}
```

### 2. 智慧輪替調度器介面 (`SmartKeyRotator`)

```typescript
export interface ISmartKeyRotator {
  registerKey(provider: ProviderType, key: string, dailyQuota?: number, rpm?: number): void;
  removeKey(id: string): boolean;
  acquireKey(provider: ProviderType): ApiKeyItem | null;
  reportStatus(keyItem: ApiKeyItem, httpStatus: number, retryAfterSec?: number): void;
  executeWithRotation<T>(options: KeyPoolExecutionOptions, parser: (text: string) => T): Promise<T>;
  getKeyStats(provider?: ProviderType): Array<Omit<ApiKeyItem, 'key'> & { maskedKey: string }>;
}
```

### 3. 本地 Lakehouse 新增資料表綱要

於 `scripts/market-sync/sqlite-db-core.cjs` 與 IndexedDB schema 中擴充：

```sql
-- 公司除權息與拆股預告表
CREATE TABLE IF NOT EXISTS corporate_action_calendar (
    symbol TEXT NOT NULL,
    market TEXT NOT NULL,            -- 'TW' | 'US'
    action_type TEXT NOT NULL,       -- 'DIVIDEND' | 'SPLIT' | 'CAPITAL_REDUCTION' | 'EARNINGS'
    ex_date TEXT NOT NULL,           -- 除權除息日 (YYYY-MM-DD)
    payment_date TEXT,               -- 預計股利發放日 (YYYY-MM-DD)
    cash_dividend_per_share REAL,    -- 每股發放現金
    split_ratio REAL,                -- 股票分割比例
    announcement_date TEXT,
    PRIMARY KEY (symbol, action_type, ex_date)
);

-- 台股董監質押與內部人申報表
CREATE TABLE IF NOT EXISTS tw_insider_pledge_records (
    symbol TEXT NOT NULL,
    report_date TEXT NOT NULL,       -- 申報年月 (YYYY-MM)
    pledged_shares INTEGER,          -- 董監質押股數
    total_director_shares INTEGER,   -- 董監總持有股數
    pledge_ratio REAL,               -- 質押比率 (%)
    insider_transfer_shares INTEGER, -- 當月申報轉讓股數
    PRIMARY KEY (symbol, report_date)
);

-- 宏觀指標與市場情緒日序表
CREATE TABLE IF NOT EXISTS macro_sentiment_daily (
    date TEXT PRIMARY KEY,           -- YYYY-MM-DD
    risk_free_rate_3m REAL,          -- 3M 美債 (FRED DGS3MO)
    treasury_yield_10y REAL,         -- 10Y 美債 (FRED DGS10)
    yield_spread_10y_2y REAL,        -- 10Y-2Y 利差
    cnn_fear_greed_score REAL,       -- 恐懼貪婪分數 (0-100)
    vix_close REAL,                  -- VIX 收盤價
    tw_put_call_ratio REAL           -- 選擇權 Put/Call Ratio
);
```

---

## Non-functional Requirements & Security

1. **防封號限流守則 (Anti-Abuse)**：
   - 雖然擁有多個 API Key，全域總並發請求仍必須受到本地 `TokenBucket` 調控，最大並發連線數嚴格限制在 $\le 5$。
2. **零洩漏原則 (Zero Leakage)**：
   - 嚴禁於程式碼庫提交任何真實 API Key。
   - 所有向外部 API 發出的請求優先由本機端 Vite 反向代理（`viteMarketMiddleware`）轉發，不在前端公開 URL Query 中暴露金鑰。
3. **無假資料守則 (Zero Mock Compliance)**：
   - 當外部資料源未回傳或不可用時，嚴格保留 `undefined` 或 `-`，禁止進行常數倍率捏造。

---

## Acceptance Criteria & Test Cases

1. **API Key 輪替測試**：
   - 註冊 2 組 FinMind Key，連續發出 2 次請求，驗證 Key 依序交替使用（Round-Robin）。
2. **429 指數退避測試**：
   - 模擬 Key A 回傳 HTTP 429，驗證系統即刻將 Key A 標記冷卻，並自動切換至 Key B 完成請求；Key A 在冷卻期結束前不再被派發。
3. **401/403 黑名單隔離測試**：
   - 模擬 Key B 回傳 HTTP 401，驗證系統將其 `isBlacklisted` 設為 true，並於 UI 呈現警示標誌。
4. **SEC EDGAR 無 Key 財報解析測試**：
   - 驗證發出美股 10-K/10-Q 請求時帶有合法 `User-Agent`，且解析出的資產負債表與現金流量表科目符合 16 大標準指標。
5. **除權息日曆前瞻同步測試**：
   - 驗證 TWSE 官方除權息預告端點成功入庫，且能回傳未來 15 天內除息之台股標的清單。
