# 0132. 每日收盤全市場台美股定時同步、本地快取秒讀與零遺漏稽核架構 (Scheduled Market Sync & Zero Latency Cache ADR)

## 狀態 (Status)
已採納 (Accepted) - 2026-09-15

## 上下文 (Context)
使用者要求建立每日盤後自動數據更新與儲存機制：
1. 台股每日下午 16:00 自動整包更新全市場三大法人籌碼 (T86)、日 K 線與技術指標，打開網頁秒讀。
2. 美股每日收盤後（上午 08:00 UTC+8）自動更新日 K 與技術指標，防禦 429 限制。
3. 確保全市場標的更新零遺漏 (Zero Data Loss)，具備稽核與 Dead-Letter Retry 重試機制。

## 架構決策 (Decisions)
1. **執行宿主**：採用 Node.js 本地排程腳本 (`scripts/market-sync/`) 搭配 Windows 工作排程器 (Task Scheduler)，實現開機定時無黑視窗背景靜默執行。
2. **第一性原理批次獲取**：
   - 台股：呼叫 TWSE / TPEx 官方全市場日報 API，單次請求獲取全市場（2,200+ 檔）籌碼與 MI_INDEX 收盤行情，本地 CPU 增量計算技術指標，徹底消除個別個股請求帶來的 429 限流問題。
   - 美股：以雙層隊列 (Tier 1 核心標的 + Tier 2 平滑退避) 受控抓取。
3. **打開網頁極速秒讀 (Zero Latency)**：
   - 腳本將結果輸出至 `public/market-cache/` 與 `.scratch/market-cache/`。
   - 前端 `App.tsx` 啟動時透過 `marketCacheLoader.ts` 直接以記憶體級熱載入本地快取，0 網路等待，並在背景非同步將資料沉澱至 IndexedDB。
4. **防漏水與零遺漏稽核**：
   - 內建台灣與美國休市日曆過濾機制；
   - 支援 Dead-Letter Queue 自動重試 3 次，輸出 `sync_audit_report.json`；
   - 前端頂部提供 `MarketSyncStatusBadge` 狀態指示徽章，透明呈現同步進度。

## 後果影響 (Consequences)
- **正面優勢**：
  - 打開網頁徹底告別轉圈等待，達成真正的瞬間秒讀。
  - 避免在瀏覽器端併發發送大量 API 請求而遭數據源阻擋。
  - Windows 排程自動執行，即便使用者未開瀏覽器，盤後資料依然定時精準入庫。
- **維護注意事項**：
  - 使用者需在本地透過 `setup-windows-task.bat` 執行一次排程註冊。
