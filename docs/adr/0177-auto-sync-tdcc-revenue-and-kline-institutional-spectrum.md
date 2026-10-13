# ADR 0177: TDCC 集保大戶與月營收自動新鮮度管線、主 K 線重疊雙灰線修復與券商法人均線色譜

## 狀態
已採納 (Accepted) - 2026-10-13

## 背景與痛點
1. **數據新鮮度停擺需手動介入**：
   - 卡片 19（TDCC 集保股權分散）與卡片 20（月營收成長走勢）之數據庫基準日停留在舊日期（TDCC 停在 2026-10-02、月營收停在 2026-08）。
   - 舊有中介層僅自動補齊日 K 線交易行情，缺少 TDCC 與月營收之動態過期檢測與自動追蹤，導致必須由使用者手動執行腳本更新。
2. **非 ETF 標的可用性疑慮**：
   - 經調研，非 ETF（個股）為兩大卡片的主要分析主體；舊有數據停留在 10-02 係因爬蟲腳本寫死靜態日期而非 API 結構問題。
3. **主 K 線圖重疊雙灰線困擾**：
   - 主 K 線圖 Y=220（主圖底部）與 Y=230（副圖頂部）各自繪製白色/灰色分界線，10px 間距形成平行鐵軌雙線，造成使用者視覺干擾與語意困惑。
4. **均線色彩分佈缺乏券商專業度**：
   - MA20 與 MA250 同為紫色系，造成短期月線與長期年線混淆；MA60 採用淡灰色虛線，辨識度低且降低了季線決策重要性。

## 決策核心架構

### 1. 動態擬真時間序列自動推進 (Dynamic Settlement Anchors)
- **集保 TDCC**：每週五 21:00 基準日結算。在 `market-freshness-service.cjs` 實作 `getLatestSettledTdccFriday(now)`，若當週五已過 21:00 則錨定當週五，否則回退至前一週五。
- **月營收 Revenue**：每月 10 日 17:30 截止申報。實作 `getLatestSettledRevenueMonth(now)`，若當月已過 10 日 17:30 則結算上個月份（`YYYY-MM`），否則回退兩個月。
- **新鮮度統一檢驗 (`checkMarketFreshness`)**：
  - 擴充返回 `tdcc` 與 `revenue` 狀態物件，包含 `isFresh`、`latestSettledDate`/`latestSettledMonth` 與 `databaseDate`/`databaseMonth`。

### 2. 中介層靜默入庫與防抖冷卻鎖 (Silent Ingestion & 10-Min Cooldown)
- 改寫 `vite-market-middleware.cjs`：
  - 統一在 `triggerCatchupTask()` 中納入 TDCC 與月營收入庫邏輯，以 Promise 隊列靜默入庫。
  - 實作 10 分鐘冷卻保護機制 (`CATCHUP_COOLDOWN_MS = 600,000`)，防止前端頻繁切換股票或多 tab 同步觸發重複計算與資料庫鎖競爭。
  - 在 `/api/market/sync-status` 介面序列化 `tdcc` 與 `revenue` 之健康狀態，向前端提供透明化指標。

### 3. 主 K 線雙灰線修復與券商法人色譜 (`KLINE_MA_COLORS`)
- **雙線消除**：移除主 K 線 SVG 內部 Y=220 處之 `<line y1={klineHeight} y2={klineHeight} />`，保留 Y=230 (`subchartTop`) 單一微光分割線。
- **券商法人標準色譜**：
  - `ma5`: `#eab308` (亮黃 - 短線進出)
  - `ma10`: `#06b6d4` (青藍 - 雙週波段)
  - `ma20`: `#ec4899` (洋紅 - 月線生命線，徹底與年線紫色脫鉤)
  - `ma60`: `#f97316` (亮橘實線，粗度 1.5 - 季線決策線，廢除灰色虛線)
  - `ma250`: `#a855f7` (尊爵紫 - 年線多空分水嶺)
- **全面同步**：頂部圖例、查價列 Tooltip、SVG Polyline 折線 100% 同步引用常數。

## 影響與驗收標準
- 全市場 TDCC 動態結算推進至 2026-10-09（78,330 筆）。
- 全市場月營收動態結算推進至 2026-09（93,996 筆）。
- 全專案 210 個測試檔案、1,553 個測試案例 100% 綠燈通過。
- 生產環境 `npm run build` 0 型別錯誤。
