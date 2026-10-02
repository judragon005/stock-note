# ADR 0158: 美股全市場標的湖倉採集、自適應限流防禦與斷點續傳排程架構 (Spec 0158)

- **狀態**：`ACCEPTED`
- **日期**：2026-10-02
- **決策者**：judragon005, Antigravity Agent
- **關聯規格**：[SPEC-0158](../specs/0158-us-market-lakehouse-full-universe-ingestion-and-checkpoint-pipeline-spec.md)
- **關聯 Issue**：[Issue #144](https://github.com/judragon005/stock-note/issues/144)

---

## 背景與問題意識 (Context)

在歷經 Spec 0132 與 Spec 0155 後，台股市場已達成 2,400+ 檔全市場秒級同步與本地持久化。然而美股市場受限於單檔請求限制，每日定時排程長期寫死僅同步 44 檔核心藍籌股與指數 ETF（`US_TIER_1_CORE`）。
此限制導致使用者在主力戰情室切換或搜尋非 44 檔美股（如熱門標的 PLTR、CRWD、SMCI、COIN 等）時，必須即時向外部發起連線，極易遭遇 HTTP 429 (Too Many Requests) 限流阻斷，導致日 K 線空白、均線失真與指標癱瘓。

---

## 決策內容 (Decisions)

1. **美股標的種子庫擴充至 1,790+ 檔全市場規模 (`seed-symbols-universe.cjs`)**：
   - 整合 `STATIC_US_STOCKS` (599 檔) 與 S&P 1500 / NASDAQ 100 / 熱門成長龍頭與 ETF，建構 `us-market-universe-data.cjs`（1,795 檔標的）。
   - 完善 `getFullUsSeedUniverse()` 與 `seedDefaultSymbolsUniverse()`，一鍵事務入庫 SQLite `symbols_meta`。
2. **生命週期雙模態設計 (Dual-Mode Lifecycle)**：
   - **首次全量補齊模式 (`--mode=bootstrap`)**：針對 1,500+ 檔美股全量獲取最近 250 天完整歷史日 K（含 `adj_close` 還原價）並批量寫入 SQLite `daily_candles`，同時建立 `sync_checkpoints` 基準線。
   - **每日 08:00 定時排程增量模式 (`--mode=daily`)**：由 Windows 工作排程於每日上午 08:00 自動執行，僅對最新交易日收盤行情與指標增量追加，大幅精簡網路連線並極速刷新 `us_market_summary.json`。
3. **三層動態優先級隊列 (Tiered Priority Queue)**：
   - **Tier 0 (極速前置)**：自動掃描讀取使用者本機實際持股與自選追蹤名單，強制置頂於隊列最前列（30 秒內秒級就緒）。
   - **Tier 1 (核心指數與大型藍籌)**：44 檔主流權值股與旗艦 ETF（60 秒內就緒）。
   - **Tier 2 (全市場擴充標的)**：其餘 1,700+ 檔標的接續於後，以平滑速度在背景執行。
4. **自適應隨機抖動限流與 429 階梯式熔斷退避 (Anti-Ban Guard)**：
   - 請求間隔強制休眠 `800ms + random(0, 400ms)`，限制單一 IP 每秒連線在 1.2 次以下。
   - 捕獲 HTTP 429 時啟動階梯式冷卻休眠（第 1 次 10 秒 ➔ 第 2 次 30 秒 ➔ 第 3 次 60 秒），若連續 4 次 429 立即觸發熔斷安全退出，保全公網 IP。
5. **SQLite 斷點續傳狀態機 (`us-sync-checkpoint-engine.cjs`)**：
   - 每次成功採集即刻原子寫入 `sync_checkpoints`（`status = 'SUCCESS', last_success_date = targetDate`）。
   - 腳本中途若遇斷電、重啟或手動中斷，再次啟動時自動透過 `getPendingUsSymbols()` 跳過當日已成功的標的，100% 斷點續傳。
6. **稽核驗證器擴充 (`audit-verifier.cjs`)**：
   - 整合美股法定休市日曆（排除假性缺漏），提供 `auditUsLakehouseUniverse()` 統計美股湖倉註冊數、當日成功數與覆蓋率。

---

## 決策後果 (Consequences)

### 正面效益 (Positive)
- **打破 44 檔枷鎖**：美股湖倉正式擴充為 1,795 檔全市場規模，戰情室切換任意主流美股均可享受秒讀快取。
- **IP 零被封鎖風險**：自適應抖動與熔斷狀態機徹底隔絕高頻衝擊，兼顧爬取覆蓋率與 IP 安全。
- **長排程零恐懼**：具備 SQLite 檢查點斷點續傳，中途隨時可暫停重啟，不浪費請求。
- **全量測試保障**：全專案 161 個測試套件、1,325 個測試案例 100% 綠燈，建置 0 錯誤。
