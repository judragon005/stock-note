# 0106. 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速架構規格書 (Muscle Booker Incremental Backfill & Local Cache Spec)

## 1. 問題意識與背景需求 (Problem Statement)

在肌肉書僮動能雷達（如「台股市值 50」、「美股科技巨頭」等）中，使用者反映畫面長時間卡在「🟡 回補中...」且「資料未就緒」：

1. **觸發漏失缺陷 (Missing Trigger Bug)**：
   - 經代碼剖析，`MuscleBookerWorkspace.tsx` 的背景回補邏輯硬編碼了 `if (missing.length > 0 && selectedPool === 'CUSTOM_WATCHLIST')`。
   - 當使用者切換到「台股市值 50 (TW50)」或「美股 50」時，若本地 IndexedDB 尚未存有該 50 檔日 K，系統雖然識別出 `missing` 標的，卻**完全沒有發起任何回補網路請求**，導致畫面永久停滯於「回補中...」。
2. **全量請求過重與風控風險 (Overweight Full-History Query)**：
   - 現行 `historicalOhlcvBackfill.ts` 每次請求均帶入 `period1=0`，強制抓取標的數十年全量歷史。
   - 50 檔股票的全量歷史數據量龐大，極易觸發遠端（Yahoo Finance）的 HTTP 429 (Too Many Requests) 速率限制。
3. **缺乏增量補齊與可視化進度反饋 (Lack of Incremental Sync & Visual Progress)**：
   - 肌肉書僮量化指標僅需最近 60~120 根日 K 即可精準計算。若本地已具備歷史日 K，日後只需做「短期缺失資料補齊」（如最近 30 天或自最後更新日至今）。
   - 使用者無法得知當前回補進度、剩餘檔數以及本地快取就緒狀態。

---

## 2. 解決方案與核心架構 (Proposed Architecture)

### 2.1 短期增量請求與體積優化 (Short-term Incremental Fetch)
- **本地已有日 K 時**：取本地最後一根 K 線日期往前倒推 7 天為 `period1`，向遠端請求至當前的最新日 K。
- **本地無日 K 時**：請求最近 6 個月（180 天）歷史日 K（足以計算 MA20、MA60 與 Darvas 箱體），資料傳輸量縮減 90% 以上。
- **增量合併與持久化**：透過 `mergeDailyCandles` 去重合併，並立即寫入 IndexedDB（`saveSymbolOhlcv` 與 `saveSymbolIndicators`）。

### 2.2 全目標池受控並行回補隊列 (Controlled Concurrency Queue)
- 移除 `selectedPool === 'CUSTOM_WATCHLIST'` 之單一限制，讓所有目標池（TW50、US50、在籍持股、自訂清單）均受惠於自動回補。
- 採用受控並行池（Concurrency = 3），每完成一檔即時寫入 `cachedCandlesMap`，畫面即時解鎖該檔指標與決策。
- 標的請求間隔 60ms，兼顧極速加載與防止 API 濫用防禦。

### 2.3 頂部日 K 本地快取狀態與進度控制條 (Sync Toolbar & Progress Bar)
- 在肌肉書僮雷達頂部新增「日 K 本地快取狀態列」：
  - 顯示：`已就緒 X / Y 檔 (Z%)`。
  - 當回補進行中時：顯示動態進度條與「⏳ 正在增量同步：2330...」。
  - 全數就緒時：顯示「🟢 本地快取已就緒 (離線高速運算)」，並提供「🔄 增量更新」手動按鈕。

---

## 3. 測試驅動驗證項目 (TDD Verification)

1. **增量請求時間區間測試**：
   - 本地已有日 K 時，驗證發起之請求 `period1` 為最後日期的往前偏移，而非 0。
   - 本地無日 K 時，驗證發起之請求為最近 180 天。
2. **所有目標池回補覆蓋測試**：
   - 驗證切換至 `TW50`、`US_MEGA_50` 時，缺損標的均能正常加入隊列並回補。
3. **並行回補與狀態更新測試**：
   - 驗證受控並發隊列能依序完成回補並即時更新 `cachedCandlesMap`。
4. **全專案回歸測試**：
   - 57 個測試套件 100% 綠燈，TypeScript 0 型別錯誤。
