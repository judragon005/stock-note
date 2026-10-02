# 0158. 美股全市場標的湖倉採集、自適應限流防禦與斷點續傳排程規格 (US Market Lakehouse Full-Universe Ingestion & Checkpoint Pipeline Spec)

- **狀態**：Proposed
- **建立日期**：2026-10-02
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0132](0132-scheduled-market-sync-and-zero-latency-cache-spec.md), [0134](0134-full-market-history-backfill-and-reconciliation-pipeline-spec.md), [0155](0155-full-market-history-sqlite-lakehouse-and-ai-force-pipeline-spec.md)
- **關聯 ADR**：[ADR 0155](../adr/0155-full-market-history-sqlite-lakehouse-and-ai-force-pipeline.md)
- **關聯 GitHub Issue**：[#144](https://github.com/judragon005/stock-note/issues/144)
- **目標分支**：`feature/144-us-market-lakehouse-full-universe-ingestion`

---

## 1. 核心痛點與問題意識 (Problem Statement)

在專案歷經 Spec 0132（定時同步）與 Spec 0155（SQLite 湖倉與主力戰情室）演進後，台股市場已達成「2,400+ 檔全市場秒級同步與本地持久化」，但美股市場仍受限於歷史架構，存在以下根本性斷層：

1. **同步範圍嚴重受限（僅 44 檔）**：
   - 目前每日盤後同步腳本 [`sync-us-market.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/sync-us-market.cjs) 與種子註冊表 [`seed-symbols-universe.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/seed-symbols-universe.cjs) 寫死僅同步 `US_TIER_1_CORE`（44 檔巨型藍籌與指數 ETF）。
   - 當使用者在主力戰情室切換或搜尋非 44 檔美股（如熱門標的 PLTR、CRWD、SMCI、COIN、SOFI，或中大型標普成長股）時，系統無法從本地湖倉快取秒讀，而是被迫由瀏覽器即時向外部發起連線。
2. **單檔請求模式易觸發 HTTP 429 頻率封鎖 (Rate Limiting)**：
   - 台股具備 TWSE/TPEx 官方「單次 Request 包辦全市場」的批次端點；美股端點（Yahoo Finance）本質上是**單檔單次請求 (Per-Symbol REST API)**。
   - 若直接對數千檔美股發起非受控的高併發請求，使用者的對外公網 IP 將在數分鐘內遭到數據源 HTTP 429 (Too Many Requests) 封鎖，導致整個前端看盤與數據採集全面中斷。
3. **長耗時任務缺乏斷點續傳與狀態容錯**：
   - 同步 1,500+ 檔標在受控限流（每秒約 1 檔）下需耗時約 30~50 分鐘。在舊版腳本架構下，若遭遇中途斷網、使用者終端機中斷或機器休眠，下次重跑必須從第 1 檔重新開始，不僅造成大量重複請求，更進一步提高 IP 被封鎖風險。
4. **既有生產排程與 SQLite 湖倉數據割裂**：
   - 既有 `sync-us-market.cjs` 僅將產物輸出至 `public/market-cache/us_market_summary.json`，未與 Spec 0155 建立的本地 SQLite 湖倉（`daily_candles`、`symbols_meta`、`sync_checkpoints`）接駁，未能發揮高效能本地湖倉與 Vite 原生 API 中介層的優勢。

---

## 2. 解決架構與設計決策 (Solution Architecture)

依據 KISS 原則與第一性原理，本規格建立**「動態優先級隊列 (Tiered Queue) + 自適應限流防禦 (Adaptive Throttling) + SQLite 斷點續傳 (Resumable Checkpoints) + 雙軌持久化 (Lakehouse & JSON)」**的端到端美股採集流水線：

```
[每日 08:00 排程 / 手動觸發 sync-us-market.cjs]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. 標的池加載與優先級隊列重組 (Prioritized Universe)         │
│   ├─ Priority 0 (極速前置): 使用者實際持股 + 自選名單 (Watchlist)│
│   ├─ Priority 1 (核心大盤): 44 檔 Tier 1 指數 ETF 與科技龍頭   │
│   └─ Priority 2 (全市場擴充): S&P 1500 / NASDAQ 100 / 熱門標的 │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 斷點續傳過濾器 (Checkpoint State Machine Filter)         │
│   - 查詢 SQLite sync_checkpoints 資料表                     │
│   - 自動剔除 targetDate 今日已標記為 SUCCESS 者             │
│   - 僅對 PENDING、FAILED 或未曾更新之標的排程                │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 自適應限流採集與退避引擎 (Adaptive Rate-Limiter Engine)   │
│   - 併發度嚴格限制：Concurrency = 1 ~ 2                     │
│   - 隨機抖動間隔：每檔間隔 800ms ~ 1200ms (Jitter)          │
│   - 遭遇 429 熔斷防禦：階梯式退避 (10s ➔ 30s ➔ 60s 休眠)   │
│   - 採集計算：OHLCV + Yahoo adj_close 還原價 + 滾動技術指標 │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 湖倉與快取雙軌持久化 (Lakehouse & Atomic Cache)           │
│   ├─ 事務批次寫入 SQLite market_history.db (daily_candles)   │
│   ├─ 實時記錄 sync_checkpoints (最後成功時間與狀態)         │
│   └─ 滾動原子刷新 us_market_summary.json (供前端秒讀相容)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.0 生命週期雙模態設計 (Dual-Mode Lifecycle Architecture)
依據需求，美股湖倉資料管線明確區分為兩大生命週期階段：

1. **模態一：首次全量補齊模式 (Initial Full Backfill / Bootstrap Mode)**：
   - **觸發方式**：初次環境初始化或透過指令 `node scripts/market-sync/sync-us-market.cjs --mode=bootstrap`（或由使用者手動執行一次補齊）。
   - **目標行為**：針對 1,500+ 檔標的全量獲取最近 250 天完整歷史日 K（含還原價 `adj_close`）並批量寫入 SQLite `daily_candles`，同時建立 `sync_checkpoints` 基準線，將美股湖倉一次性拉齊至可用狀態。
   - **斷點保障**：若補齊過程中途關閉或網路受阻，再次執行自動依據 `getPendingUsSymbols()` 接續剩餘未完成標的，直到 1,500+ 檔 100% 成功落地。

2. **模態二：每日 08:00 定時排程增量模式 (Scheduled Daily Incremental Sync Mode)**：
   - **觸發方式**：由 Windows 工作排程於每日上午 08:00 (UTC+8) 自動無聲喚醒執行。
   - **目標行為**：僅針對最新交易日的收盤行情與指標進行「增量追加 (Incremental Append)」，更新 SQLite `daily_candles` 當日資料，滾動重算技術指標，並極速刷新 `us_market_summary.json`。
   - **耗時優化**：因標的歷史基底已於初次補齊完成，每日增量同步可大幅精簡 payload 傳輸與運算，在防禦性限流下確保穩健推進。

---

### 2.1 美股全市場標的擴充與種子庫整合 (1,500+ 檔)
- 將 [`src/data/stockDictionary.ts`](file:///d:/APP/股票紀錄/src/data/stockDictionary.ts) 內建的 `STATIC_US_STOCKS`（約 600 檔 S&P 500 與熱門標的）與精選 S&P 1500、熱門 ETF、重要科技/生技概念股整合入美股標的種子庫。
- 注入 SQLite `symbols_meta` 資料表，確保前端模糊搜尋與戰情室標的選擇具備 1,500+ 檔完整美股中英文名稱、類別與交易所元資料。

### 2.2 三層動態優先級隊列 (Dynamic Prioritized Queue)
確保使用者最在意的資產「秒級先就緒」，再接續進行全市場背景慢爬：
1. **Tier 0 (即時持股與自選股，約 10~50 檔)**：
   - 腳本啟動時自動掃描本地已存在的交易紀錄與使用者自選追蹤名單，強制排在隊列最前端。
   - 執行耗時：約 10~30 秒完成。
2. **Tier 1 (核心指數與大型藍籌，44 檔)**：
   - 原 `US_TIER_1_CORE` 標的（VOO, SPY, QQQ, AAPL, NVDA, TSLA 等），排於第二順位。
   - 執行耗時：約 30~50 秒完成。
3. **Tier 2 (全市場擴充標的，約 1,400+ 檔)**：
   - 接續以平滑速度在背景執行。
   - 總耗時約 30~45 分鐘，不影響 Tier 0 與 Tier 1 的即刻可用性。

### 2.3 嚴格自適應限流防禦 (Anti-Ban Throttling Guard)
- **固定抖動延遲**：每次 HTTP 請求之間強制等待 `800ms + random(0, 400ms)`，確保單一 IP 的請求頻率永遠低於每秒 1.2 次，徹底模擬正常瀏覽器行為。
- **429 熔斷狀態機**：
  - 一旦捕獲 HTTP 429 狀態碼，立即觸發冷卻休眠（第 1 次 10 秒、第 2 次 30 秒、第 3 次 60 秒）。
  - 若連續 3 次 429，腳本記錄當前進度至 Checkpoint 並安全退出，保障公網 IP 安全，等待下個排程週期自癒。

### 2.4 基於 SQLite 的斷點續傳 (Resumable Checkpoints)
- 使用 [`scripts/market-sync/us-sync-checkpoint-engine.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/us-sync-checkpoint-engine.cjs) 提供的檢查點引擎。
- 每次成功爬取一檔標的，立即在 `sync_checkpoints` 記錄 `status = 'SUCCESS', last_success_date = targetDate`。
- 若中途遭遇中斷（手動關閉或網路瞬斷），重新啟動腳本時調用 `getPendingUsSymbols()`，**自動跳過當日已成功的標的**，無縫從中斷點向下接續，零浪費請求。

---

## 3. 使用者情境 (User Stories)

### 終端投資者視角 (End-User)
1. 作為一名關注美股成長股的投資者，我希望在主力戰情室切換任意美股標的（如 PLTR、CRWD、SOFI）時，能夠直接秒讀 250 天日 K 與微觀量價主力籌碼，不再看見「HTTP 429 請稍候再試」或空白圖表。
2. 作為一名美股持股者，我希望我名下持有的冷門美股標的，在每日早晨 08:00 排程執行時能夠被優先排在最前面同步，以便我早上 08:05 打開電腦就能看見昨日收盤精確損益。

### 系統維運視角 (System Engineering)
3. 作為一名本機使用者，我希望即使美股全市場同步需要跑 40 分鐘，我在中途關閉終端機或重啟電腦後，下次啟動排程能自動「斷點續傳」，不必每次都從第 1 檔重新爬取。
4. 作為一名網路安全與 IP 防護者，我希望採集腳本具備自適應退避機制，在偵測到 429 跡象時主動降速與冷卻，絕不因高頻併發導致家中寬頻 IP 被 Yahoo 封鎖。

---

## 4. 具體實作決策 (Implementation Decisions)

### 4.1 核心檔案變更清單
1. [`scripts/market-sync/seed-symbols-universe.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/seed-symbols-universe.cjs)：
   - 擴充美股標的種子名單，將 `STATIC_US_STOCKS` (600+ 檔) 與精選擴充名單整合成 `FULL_US_SEED_UNIVERSE`（約 1,500+ 檔）。
   - 完善 `seedDefaultSymbolsUniverse()`，一鍵將台美股全市場標的注入 SQLite `symbols_meta`。
2. [`scripts/market-sync/sync-us-market.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/sync-us-market.cjs)：
   - 重構核心流程，串接 `sqlite-db-core.cjs`、`ingest-us-quotes.cjs` 與 `us-sync-checkpoint-engine.cjs`。
   - 導入動態優先級排序（Tier 0 優先掃描 `public/market-cache/` 或本地交易歷史中的美股標的）。
   - 實作平滑限流器（Jitter 延遲 + 429 指數退避）。
   - 實作雙軌落盤：邊爬邊寫入 SQLite `daily_candles`，並在完成 Tier 0/Tier 1 時即刻寫入 `us_market_summary.json`，全量完成時再次原子刷新。
3. [`scripts/market-sync/audit-verifier.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/audit-verifier.cjs)：
   - 擴充稽核指標，報告美股總涵蓋標的數、當日成功數、失敗數與 Checkpoint 覆蓋率。

### 4.2 儲存邊界與記憶體安全
- 每次歷史日 K 採集採用批次事務寫入 SQLite，不長期駐留於 Node.js 記憶體中。
- 保留 Spec 0155 之滾動視窗：自動維持最新 250~500 個交易日，超出部分自動修剪，維持本機資料庫檔案小於 150MB。

---

## 5. 測試驅動與驗證接縫 (Testing Decisions)

### 5.1 測試接縫設計 (Testing Seams)
- **隊列排序單元測試**：驗證輸入持股名單後，隊列能正確將持股置頂（Tier 0），隨後為 Tier 1 核心股，最後為全市場標的。
- **斷點續傳單元測試**：模擬 `sync_checkpoints` 中部分標的為 SUCCESS、部分為 FAILED，驗證 `getPendingUsSymbols()` 能精確過濾出待處理標的。
- **429 限流與退避測試**：使用 Mock HTTP Server 回傳 429 狀態碼，驗證腳本能正確捕捉並進入退避等待，且不使程序崩潰。
- **湖倉寫入驗證**：驗證採集之美股日 K 能精確寫入 `daily_candles`，並包含正確的 `adj_close` 與指標數值。

### 5.2 驗證指令
- `npm test`：確保既有 1,262+ 測試套件 100% 綠燈，新增之排程與斷點測試全數通過。
- `node scripts/market-sync/seed-symbols-universe.cjs`：驗證 1,500+ 美股標的成功入庫 `symbols_meta`。
- `node scripts/market-sync/sync-us-market.cjs --dry-run` 或限額測試：驗證限流防禦與 Checkpoint 正常推進。

---

## 6. 後續推進流程

```
[/grill-with-docs 對齊完畢] ➔ [/to-spec 產出規格書 Spec 0158] 
  ➔ [使用者審核確認] ➔ [/to-tickets 拆解任務票券] ➔ [/triage 分流] ➔ [TDD 實作]
```
