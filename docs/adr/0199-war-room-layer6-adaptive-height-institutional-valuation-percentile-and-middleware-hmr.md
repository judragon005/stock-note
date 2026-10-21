# ADR 0199: 戰情室第二列自適應高度、機構級歷史估值分位數與中介層自動熱載架構

## 狀態 (Status)
已通過 (ACCEPTED)

## 上下文 (Context)
1. **中介層脫鉤**：原 Vite 開發伺服器長達 52 小時持續運行，Node 原生 `require.cache` 凍結了中介層舊模組，導致檔案系統中新增的資料庫查詢邏輯無法熱生效。
2. **卡片過矮與擁擠**：戰情室第二列（Layer 6: 卡片 10·13、12、21、14）寫死固定高度 295px，使得 21 號卡片排版局促，且無法承載更多有價值的單季獲利基石資訊。
3. **靜態估值失真**：原先估值位階缺乏個股自身長期歷史倍數的量化評估，無法真實反映不同行業（如成長型 CPO vs 成熟傳產）的真實合理區間。

## 決策 (Decision)
1. **中介層動態載入與快取失效 (HMR Middleware)**：
   - 在 `vite.config.ts` 中配置 `server.watcher` 監聽 `scripts/market-sync/`，變更時主動從 `require.cache` 刪除該目錄模組。
   - 透過 `getMarketApiMiddlewareDynamic()` 動態載入中介層，徹底終結長開脫鉤問題。
2. **第二列高度解鎖與 Flex 垂直彈性伸展**：
   - 第二列容器升級為 `minHeight: 315px`，四卡統一採用 `height: 100%`，內部採用均勻分佈消除擁擠。
3. **機構級歷史倍數分位數演算法 (Institutional Valuation Percentile Rank)**：
   - 實作 `calculateValuationPercentile()`，統計個股自身歷史有效 PE 數列，計算超越樣本百分比 (PR)。
   - $PR \le 20\%$ 為低估便宜，$20\% < PR \le 80\%$ 為合理常態，$PR > 80\%$ 為高估偏貴。
   - 若虧損或無有效 PE，自動防禦切換為 PB Ratio 歷史分位數。
4. **21 號卡片高價值財務資訊展示**：
   - 展示自身歷史倍數區間：`Min x (低) — Median x (中位) — Max x (高)`。
   - 自適應渲染最新單季 EPS、毛利率與營業利益率膠囊徽章。

## 效益與驗證 (Consequences & Verification)
- **零手動重啟**：中介層隨代碼修改即時生效，伺服器 24/7 在線免干預。
- **實戰量化可信度**：4979 華星光即時呈現自身歷史倍數評估，告別 `--` 假死。
- **全量測試保證**：1,790 個測試 100% 綠燈，TypeScript 建置 0 錯誤。
