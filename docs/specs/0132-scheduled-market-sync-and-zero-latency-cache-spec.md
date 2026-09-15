# 0132. 每日收盤全市場台美股定時同步、本地快取秒讀與零遺漏稽核規格 (Scheduled Market Sync & Zero Latency Cache Spec)

- **狀態**：Approved
- **建立日期**：2026-09-15
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0089](0089-taiex-benchmark-and-full-market-stock-dictionary-sync-spec.md), [0091](0091-local-historical-indicators-and-external-backfill-engine-spec.md), [0120](0120-dual-market-smart-money-zero-loss-and-atomic-resilience-spec.md)
- **關聯 GitHub Issue**：[#63](https://github.com/judragon005/stock-note/issues/63)
- **目標分支**：`feature/63-scheduled-market-sync-and-cache`

---

## 1. 需求背景與核心痛點 (Problem & Context)

使用者對投資組合與市場分析的日常使用情境具備高度時效性與流暢度要求：
1. **收盤後數據更新分散與手動負擔**：
   - 過去籌碼、日 K 線與技術指標多在使用者打開網頁時透過瀏覽器非同步發送 API 請求。當標的眾多時，會面臨網路延遲、等待轉圈，甚至因併發過高觸發數據源 HTTP 429 封鎖。
2. **純前端沙盒無法主動背景執行**：
   - 瀏覽器 SPA 在分頁關閉狀態下無法自行喚醒執行排程，若使用者未打開網頁，盤後資料就無法在背景落地。
3. **打開網頁要求「極速秒讀 (Zero Latency)」**：
   - 使用者明確要求在每日收盤後（台股 16:00、美股 08:00），所有籌碼、技術指標與日 K 線必須已經在本地端預算完畢並持久化，打開網頁時必須達到毫秒級瞬間讀取，完全零等待。
4. **全市場標的更新零遺漏 (Zero Data Loss)**：
   - 更新範圍為「全市場台美股所有標的」，必須保證所有標的皆更新完畢，具備自動重試、交易日曆校驗與稽核機制，杜絕數據脫節與缺漏。

---

## 2. 核心架構與設計決策 (Architecture & Design Decisions)

### 2.1 排程時間點與市場結算機制 (Timing Alignment)
- **台股市場 (TWSE / TPEx)**：
  - **排程時間**：每日 **16:00 (UTC+8)**。
  - **數據依據**：台股 13:30 收盤，TWSE/TPEx 官方於 15:00~15:30 完成三大法人買賣超 (T86)、盤後定價、信用交易融資融券等清算。16:00 執行可確保 100% 官方資料已發布，避開結算延遲風險。
- **美股市場 (NYSE / NASDAQ)**：
  - **排程時間**：每日 **08:00 (UTC+8)**。
  - **數據依據**：
    - 夏令時間美股 04:00 (UTC+8) 收盤，盤後延長交易 (After-hours) 於美東 20:00（台灣 08:00）完全結束。
    - 冬令時間美股 05:00 (UTC+8) 收盤，至 08:00 已收盤 3 小時，主體結算數據已定錨。
    - 08:00 執行能統一夏冬令，確保日 K 收盤價、成交量與指標計算均已穩定，避開剛收盤時各報價源的暫態修正。

### 2.2 第一性原理：全市場極速批次抓取策略 (Full-Market Batch Strategy)
- **台股全市場 (約 2,200+ 檔)**：
  - **三大法人籌碼 (T86)**：呼叫 TWSE/TPEx 官方日報 API，**單次 HTTP 請求即可取得全市場所有股票當日籌碼清單**，無需對 2,200 檔進行個別迴圈請求。
  - **當日日 K (收盤行情)**：使用 TWSE `MI_INDEX` / TPEx 官方全市場收盤表，**單次請求取得全市場今日開高低收與成交量**。
  - **技術指標增量計算**：在本地端 CPU 記憶體中，讀取既有歷史日 K 數列並滾動追加今日 K 線，於本地毫秒級計算 MA、RSI、MACD 與 Darvas 箱體，**完全不耗費外部 API 額度**。
- **美股全市場 (數千檔標的)**：
  - 採「**雙層優先級隊列 (Tiered Priority Queue)**」與限流器 (Rate Limiter)：
    - **Tier 1 (極高優先)**：使用者持股 + 自選股 + S&P 500 / NASDAQ 100 成份股（約 600~800 檔），以 Concurrency = 3、間隔 150ms 的併發平滑抓取。
    - **Tier 2 (全市場其餘標的)**：以批次塊 (Chunking) 搭配指數退避重試 (Exponential Backoff with Jitter) 穩定抓取。

### 2.3 本地儲存與「打開秒讀」管線 (Zero-Latency Cache Pipeline)
```
[Windows 工作排程 (Task Scheduler)]
       │
       ├─► 16:00: node scripts/market-sync/sync-tw-market.cjs
       └─► 08:00: node scripts/market-sync/sync-us-market.cjs
               │
               ▼ (批次下載 + 本地 CPU 滾動計算技術指標)
       ┌────────────────────────────────────────────────────────┐
       │ 本地持久化快取 (.scratch/market-cache/ & public/cache/)│
       │  ├─ tw_market_summary.json (全台股籌碼 + 日K + 指標)     │
       │  ├─ us_market_summary.json (全美股日K + 指標)           │
       │  └─ sync_audit_report.json (防漏水稽核報告)            │
       └────────────────────────────────────────────────────────┘
               │
               ▼ (使用者開啟瀏覽器打開網頁時)
       [Vite SPA 網頁端 (App.tsx)]
       ├── 步驟 1: 即時熱載入本地快取 (0 網路請求，記憶體級秒讀)
       ├── 步驟 2: 背景非同步寫入 IndexedDB 做長期數據沉澱
       └── 步驟 3: 狀態徽章顯示「數據最新同步：今日 16:01 完成 2,248 檔」
```

### 2.4 防漏水與零遺漏稽核機制 (Zero-Data-Loss Verification)
1. **交易日曆判定 (Holiday Calendar)**：
   - 內建休市日曆判斷，若當日為週末或國定假日，自動記錄 `MARKET_CLOSED` 並略過，防止因休市無資料產生誤報。
2. **覆蓋率稽核與死信補跑 (Dead-Letter Retry Queue)**：
   - 抓取結束後比對預期清單與實收清單，若有遺漏，自動送入 Dead-Letter Queue 進行退避重試（最多 3 次）。
3. **更新水線稽核報告 (`sync_audit_report.json`)**：
   - 記錄每次排程的執行時間、成功檔數、失敗檔數、整體耗時、資料校驗雜湊值 (Hash)，前端介面透明呈現。

---

## 3. 模組與檔案清單 (File Manifest)

### 3.1 本地排程背景腳本 (`scripts/market-sync/`)
1. `scripts/market-sync/sync-tw-market.cjs`：台股全市場 T86 籌碼、日 K 與技術指標整包抓取與增量計算腳本。
2. `scripts/market-sync/sync-us-market.cjs`：美股分級優先隊列抓取與指標計算腳本。
3. `scripts/market-sync/market-sync-core.cjs`：技術指標 (MA/RSI/MACD/箱體) Node.js 共用計算引擎與防漏水稽核模組。
4. `scripts/market-sync/setup-windows-task.bat`：Windows 工作排程器一鍵安裝與註冊腳本（每日 16:00 與 08:00 定時靜默執行）。

### 3.2 前端秒讀整合模組 (`src/engine/` & `src/components/`)
1. `src/engine/marketCacheLoader.ts`：前端快取載入器，開機時立即秒讀本地快取並無感同步至 IndexedDB。
2. `src/components/MarketSyncStatusBadge.tsx`：頂部或底部狀態徽章，即時展示當日排程同步時間、成功檔數與數據新鮮度。

---

## 4. 測試計畫與防禦性驗證 (Testing Plan)

1. **單元測試 (Unit Tests)**：
   - `tests/marketSyncCore.test.ts`：驗證全市場 T86 解析器、日 K 增量合併邏輯與技術指標計算數值正確性。
   - `tests/marketCacheLoader.test.ts`：驗證前端快取載入器在「有快取」、「無快取」、「快取損毀」情況下的降級容錯表現。
2. **防漏水與重試機制測試**：
   - 模擬網路異常，驗證 Dead-Letter Retry 是否能在 3 次內自動修復並產出完整稽核報告。
3. **秒讀性能驗證**：
   - 測量前端載入本地快取的時間，必須小於 100ms，達到肉眼無感之秒讀體驗。

---

## 5. 實作任務拆解 (Execution Tasks Breakdown)

- [ ] **Task 1: 建立核心計算與批次解析引擎**
  - 實作 Node.js 版台股 T86 與收盤行情全市場單包下載。
  - 實作本地 CPU 技術指標 (MA/RSI/MACD/Darvas) 增量計算。
- [ ] **Task 2: 建立防漏水稽核與美股優先隊列**
  - 實作休市日曆過濾與 Dead-Letter 重試隊列。
  - 產出 `sync_audit_report.json` 稽核報告。
- [ ] **Task 3: 前端快取秒讀載入器與狀態徽章**
  - 實作 `marketCacheLoader.ts` 與首頁秒讀熱加載。
  - 實作 `MarketSyncStatusBadge.tsx` 狀態指示徽章。
- [ ] **Task 4: 自動化註冊 Windows 工作排程器**
  - 撰寫 `setup-windows-task.bat`，支援 16:00 與 08:00 自動無感觸發。
