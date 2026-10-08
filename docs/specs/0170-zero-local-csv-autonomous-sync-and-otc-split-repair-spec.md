# Spec 0170: 徹底移除本地 CSV 依賴、全自主聯網回補管線與櫃買代碼撕裂治理規格書 (Zero-Local-CSV Autonomous Sync & OTC Split Repair)

- **建立日期**: 2026-10-08
- **作者**: Antigravity Core Team
- **關聯技術債**: [Debt 0043](../debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md) (RESOLVED 重開加固), [Debt 0019](../debts/0019-local-historical-indicators-and-external-backfill-engine.md), [Debt 0006](../debts/0006-statutory-holiday-calendar-and-settlement-precision.md)
- **優先級**: `P0 (Urgent & Critical)`
- **狀態**: `PROPOSED`

---

## 1. 背景與問題陳述 (Problem Statement & Context)

在主力戰情室 (AI Force War Room) 中，使用者隨機輸入任意股票（如元大美債20年 `00679B`、鈊象 `3293` 或美股標的）時，日 K 線圖與下方任務五「原始資料表 (RawDataView)」均呈現最新日期停在 **2026-10-02**，未顯示昨天（10/07）與今天（10/08 盤中）的最新資料。

經底層 SQLite 湖倉（`market_history.db` 124 萬筆 `daily_candles`）與中介層 API 穿透檢索，確認系統存在以下深層架構致命缺陷：

1. **環境鎖死反模式 (Local CSV Hardcoding)**：
   歷史回補腳本硬編碼了本機特定開發機路徑（`D:\APP\諮詢\私人\股市\...`）。一旦系統遷移至其他電腦、容器或雲端環境，本地 CSV 檔案完全不存在，回補機制立即失效。必須徹底移除本地 CSV 依賴，轉型為 100% 依賴官方網路 API 的自給自足管線。
2. **代碼撕裂與別名探測邏輯死角**：
   全市場 975 檔上櫃股票與櫃買債券 ETF 在資料庫中被撕裂為標準代碼（如 `00679B`，停在 10/02）與帶 O 尾綴代碼（如 `00679BO`，包含 10/05~10/07）。中介層 `/api/market/history/:symbol` 僅在 `candles.length === 0` 時才觸發別名探測，導致帶有舊資料的標準代碼直接略過別名探測，永遠卡死在 10/02。
3. **日常同步日 K 物件漏賦 `symbol` 鍵致入庫率為 0% (Silent Drop)**：
   `market-sync-core.cjs` 中的 `parseTwseDailyQuotesBulk` 與 `parseTpexDailyQuotesBulk` 產生的行情物件漏賦 `symbol` 屬性，導致 `saveTwQuotesToSqlite` 的防禦性檢查 `if (!item.symbol) continue;` 將全市場 2,400+ 檔台股日 K 全部略過，日常盤後自癒機制完全癱瘓。
4. **三大法人籌碼上市漏失與美股凍結**：
   10/05~10/07 期間，台積電 2330、0050 等所有上市權值股的法人籌碼空白（僅上櫃有資料）；1,440 檔美股自 10/02 後完全未更新。
5. **盤中與盤後未結算時態行情未縫合至活頁**：
   在當日收盤前後（13:30~15:00 籌碼尚未結算時），系統未動態將當日即時收盤報價構造為最新日 K 縫合至 `RawDataView`。

---

## 2. 四方角色深層檢討與對齊規範 (Multi-stakeholder Alignment)

| 維度角色 | 現況檢討與痛點 | 專業對齊標準與規範 |
| :--- | :--- | :--- |
| **交易所 (TWSE / TPEx / SEC)** | 櫃買中心歷史 CSV 帶 `O` 尾綴污染了內部主鍵，違反證券市場代碼唯一定義。 | **Single Source of Truth**：交易所標準代碼一律為 4~6 碼純代碼（`3293`, `00679B`）。資料庫內部主鍵必須徹底清洗歸併，嚴禁任何代碼撕裂。 |
| **券商核心交易 (Brokerage Core)** | 日 K 線存在跳日、斷層，嚴重違反報價系統的平滑性與連續性。 | **零斷層履歷**：遇到非交易日或無成交量標的自動繼承前值 (`isHalted`)；盤中 09:00~13:30 必須由即時行情動態縫合今日日 K。 |
| **法人與量化機構 (Institutions)** | 資料落後 5 天，導致 MA5、布林通道與主力買賣超計算全面失真，產生假信號。 | **即時因子完整度**：確保 250 天歷史數據無縫連接至前一結算日與當日盤中，嚴禁任何因子計算建立在過期數據上。 |
| **終端使用者 (User UX)** | 輸入股票後赫然看到上週數據，下方活頁同樣滯後，對戰情室可信度產生根本質疑。 | **跨環境自癒與透明感**：徹底拔除特定電腦路徑，軟體移至任何新環境皆能自動在背景聯網補齊，秒級精確回饋。 |

---

## 3. 架構不變性原則 (Architectural Invariants)

1. **Zero Local CSV Invariant (零本地 CSV 不變性)**：
   - 專案程式碼中嚴禁任何絕對磁碟路徑（如 `D:\APP\...`）或對本機靜態 CSV 檔案之讀寫依賴。
   - 所有資料回補與增量更新 100% 透過 HTTP/HTTPS 公開網路 API 完成。
2. **Standard Code Invariant (標準代碼單一主鍵不變性)**：
   - `daily_candles` 與 `tw_institutional_chips` 表中的 `symbol` 欄位一律為標準官方代碼（去除任何 `O` 尾綴）。
   - 美股代碼一律正規化為大寫連字號格式（如 `BRK-B`）。
3. **Continuous Intraday Stitching (盤中動態縫合不變性)**：
   - 盤中交易時段（09:00~13:30）與盤後未結算時段（13:30~15:00），若取得即時報價，必須動態生成當日最新 K 棒並縫合至日 K 數列與 `RawDataView` 最頂端。
4. **Rate Limit & Anti-Abuse Compliance (防濫用與節流合規)**：
   - 聯網同步必須具備隨機抖動延遲（Jitter 800~1500ms）與 429 階梯式指數退避，全市場日 K 只需單次整包廣播請求（2 次請求獲取 2,400+ 檔），絕不高頻暴力輪詢。

---

## 4. 詳細功能與技術規格 (Technical Specifications)

### 模組 1：本地硬碟 CSV 完全除役與跨環境聯網自主回補體系
- **廢止與重構**：
  - 將 `scripts/market-sync/backfill-local-csv.cjs` 標記為除役，移出中介層調度。
  - 重構 `vite-market-middleware.cjs` 中的 `triggerCatchupTask`：
    - 偵測到資料庫落後時，改為調用 `runTwMarketSync()` 連網直接抓取官方 TWSE/TPEx 最新盤後資料。
    - 支援傳入日期參數，若落後多日（例如週一偵測上週五已結算），按工作日曆在背景自動依序補齊缺失交易日。
- **內建演算法交易日曆 (對齊 Debt 0006)**：
  - 新增 `scripts/market-sync/trading-calendar-engine.cjs`，以純演算法計算台股法定休假日（週末、春節、清明、端午、中秋、國慶等），不再依賴外部大盤 CSV。

### 模組 2：修復盤後同步日 K 物件結構 (補齊 `symbol` 鍵)
- **檔案**：`scripts/market-sync/market-sync-core.cjs`
- **修改點**：
  - 在 `parseTwseDailyQuotesBulk` 的回傳物件中，補上 `symbol` 鍵：
    ```javascript
    result[symbol] = {
      symbol,
      date: dateStr,
      open: open > 0 ? open : close,
      high: high > 0 ? high : close,
      low: low > 0 ? low : close,
      close,
      volume,
    };
    ```
  - 同步確保 `parseTpexDailyQuotesBulk` 亦包含 `symbol` 鍵。
- **檔案**：`scripts/market-sync/ingest-tw-quotes.cjs`
- **修改點**：
  - 在 `saveTwQuotesToSqlite` 中加入雙重防呆：若 `item.symbol` 缺漏，自動以 `item.symbol = key` 補齊，確保入庫率恢復 100%。

### 模組 3：SQLite 數據庫代碼撕裂歸併與去 O 遷移
- **檔案**：`scripts/market-sync/merge-otc-split-symbols.cjs`
- **職責**：
  - 事務性掃描 `daily_candles` 與 `tw_institutional_chips`：
    - 將 `symbol GLOB '[0-9]*O'` 的記錄（如 `00679BO`, `3293O`）透過 `INSERT OR REPLACE` 寫入至標準代碼（`00679B`, `3293`）。
    - 刪除帶 `O` 的孤兒舊資料。
  - 更新 `symbols_meta`：將原硬編碼為 `TWSE` 的櫃買上櫃股票與債券 ETF 的 `exchange` 校正為 `TPEx`。

### 模組 4：三大法人籌碼上市漏失補救與中介層查詢強化
- **籌碼補齊**：
  - 執行修復後的 `sync-tw-market.cjs`，補齊 10/05、10/06、10/07 的 TWSE 上市股票 T86 三大法人買賣超與信用交易。
- **中介層端點強化** (`scripts/market-sync/vite-market-middleware.cjs`)：
  - 在 `/api/market/history/:symbol` 中，即使標準代碼查有資料，若別名代碼（帶 O）亦存在較新的日期，自動在 SQL 層或記憶體層進行 `UNION` 合併，確保雙重保險零斷層。

### 模組 5：盤中與盤後未結算時態行情動態縫合 (UI/Engine)
- **檔案**：`src/engine/aiForceDashboardEngine.ts`
- **修改點**：
  - 在 `generateAiForceReportFromCandles` 中：
    - 若當前時間處於盤中交易時段或盤後尚未 15:00 結算，且外部傳入 `realtimeQuote`（含有有效價格與交易量），**自動構造一根最新交易日（如 2026-10-08）的虛擬日 K 並追加至 `klineSystem.candles` 最末端**。
    - 標註該 K 棒為 `isIntraday: true`。
- **檔案**：`src/components/aiForceDashboard/TaskPanels.tsx` (`RawDataView`)
  - 下方任務五原始資料表降序分頁時，第一筆即為當日最新即時行情（標註「盤中即時」），徹底消除「下方活頁資料短缺」之疑慮。

### 模組 6：前端 IndexedDB 幽靈快取主動穿透與自癒
- **檔案**：`src/engine/marketCacheLoader.ts` 與 `src/hooks/useMarketCatchupSync.ts`
- **修改點**：
  - 當從後端 SQLite 成功載入更新之 250 天日 K 時，強制覆蓋 IndexedDB 既有舊快取。
  - 當收到背景追趕完成事件時，主動觸發前端重繪與資料重新加載。

---

## 5. 驗證與測試計畫 (TDD Verification Plan)

1. **單元測試 (Unit Tests)**：
   - 驗證 `parseTwseDailyQuotesBulk` 與 `parseTpexDailyQuotesBulk` 產出之每一筆行情物件皆具備非空 `symbol` 屬性。
   - 驗證 `saveTwQuotesToSqlite` 傳入行情 Map 時，成功寫入數大於 0（不再為 0）。
   - 驗證 `merge-otc-split-symbols.cjs` 冪等合併邏輯，確認帶 `O` 資料轉移後原資料安全刪除。
   - 驗證 `trading-calendar-engine.cjs` 正確判定台股國定假日與開休市狀態。
2. **整合測試 (Integration Tests)**：
   - 模擬 `/api/market/history/00679B?limit=250` 與 `/api/market/history/3293?limit=250`，驗證最新一根日 K 正確包含 2026-10-07。
   - 模擬盤中傳入即時報價，驗證 `report.klineSystem.candles` 與 `paginateCandles` 最末/第一根日 K 正確包含當日日期。
3. **端到端驗收 (E2E Verification)**：
   - 執行 `npm test` 確保既有 600+ 測試全數通過（100% 綠燈）。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。
   - 執行端對端稽核腳本，確認 `daily_candles` 中全市場上櫃標的無任何帶 `O` 孤兒紀錄，且最新日期全面推進至昨日與當日。

---

## 6. 技術債交接與檔案清單

- 新建/修改檔案：
  - `scripts/market-sync/trading-calendar-engine.cjs` (新建)
  - `scripts/market-sync/merge-otc-split-symbols.cjs` (新建)
  - `scripts/market-sync/market-sync-core.cjs` (修復 symbol 鍵)
  - `scripts/market-sync/ingest-tw-quotes.cjs` (修復防呆過濾)
  - `scripts/market-sync/vite-market-middleware.cjs` (重構背景聯網追趕任務)
  - `src/engine/aiForceDashboardEngine.ts` (盤中/收盤即時日 K 動態縫合)
  - `src/components/aiForceDashboard/TaskPanels.tsx` (原始資料表動態日 K 對齊)
- 文檔同步：
  - 更新 `docs/debts/0043-tw-tpex-otc-and-bond-etf-daily-candles-normalization.md`
  - 更新 `CONTEXT.md` 與 `README.md`
