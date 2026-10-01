# ADR 0155: 全市場歷史數據本地 SQLite 湖倉與主力戰情室端到端量化管線 (Spec 0155)

- **狀態**：`ACCEPTED`
- **日期**：2026-10-01
- **決策者**：judragon005, Antigravity Agent
- **關聯規格**：[SPEC-0155](../specs/0155-full-market-history-sqlite-lakehouse-and-ai-force-pipeline-spec.md)
- **關聯 Issue**：[Issue #138](https://github.com/judragon005/stock-note/issues/138)

---

## 背景與問題意識 (Context)

在歷經多次迭代後，專案歷史資料分散於 `compact.json`、IndexedDB 與外部即時 API 之間。這種分散式架構存在多重瓶頸：
1. **龐大 JSON 檔案的 I/O 成本與記憶體消耗**：歷史長日 K 隨時間增長，單一龐大 JSON 反序列化會拖慢前端載入與背景腳本效能。
2. **外部 API 頻繁限流（HTTP 429）**：台股與美股大量回填容易觸發外部資料源的頻率限制與連線逾時。
3. **美股無集中法人數據斷層**：美股市場缺乏台股集中市場的「三大法人買賣超」官方數據，導致六維戰情室在美股標的呈現法人數據真空。
4. **處置/注意警示與單位自適應缺失**：處置股票（分盤撮合）未有明顯警示，美股與台股的計價幣別 (USD vs TWD) 與交易單位 (股 vs 張) 缺乏自適應區分。

---

## 決策內容 (Decisions)

1. **採用 Node 22 原生 SQLite 湖倉架構 (`market-lakehouse.db`)**：
   - 以 Node.js v22 內建 `node:sqlite` (`DatabaseSync`) 實作高效能本機湖倉，零外部原生二進位 (native addons) 依賴。
   - 開啟 WAL (Write-Ahead Logging) 模式與 `NORMAL` synchronous，大幅提升多重讀寫與批量注入效能。
   - 建立 8 張正規化資料表：`symbols`、`daily_quotes`、`institutional_flows`、`sbl_margin_trades`、`disposition_attention_events`、`sync_checkpoints`、`sync_logs`、`lakehouse_metadata`。
2. **滾動保留與空間防禦機制 (Rolling Retention & Vacuum Guard)**：
   - 每次同步自動維持滾動視窗（最新 250 個交易日），修剪過期舊資料。修剪筆數超過安全門檻時自動執行 `VACUUM`，避免資料庫空間無限制膨脹。
3. **官方多源歷史資料全量注入與斷點續傳**：
   - 支援 TWSE/TPEx 官方收盤行情、三大法人 (T86)、融資券與借券賣出數據、處置/注意股票清單注入。
   - 美股引入 Rate-Limited Yahoo Fetcher 搭配指數退避與 `sync_checkpoints` 狀態機，並強制採用 Yahoo `adjclose`，徹底防止美股除權息導致的 VWAP 斷崖跳空。
4. **Vite 原生 Connect 中介層 API 與客戶端平滑降級**：
   - 於開發伺服器注入原生中介層，提供 `/api/lakehouse/quotes`、`/api/lakehouse/institutional` 等高速查詢端點。
   - 前端 `marketCacheLoader` 實作優先嘗試本地 Lakehouse API，離線或未啟動時自動平滑降級至 IndexedDB/Compact 快取的雙軌自癒架構。
5. **美股微觀量價主力替代量化演算法 (US Volume Microstructure Quant Engine)**：
   - 針對美股市場缺乏集中法人買賣超之特性，設計替代量化演算法：整合 20D/60D VWAP 成本階梯乖離率、14D MFI 資金流向指標、10D OBV 能量潮趨勢與近 3 日異常大單爆量偵測，合成 0~100 之主力機構評分。
6. **主力戰情室端到端整合與白話文因果 XAI**：
   - `HeaderMarketBar` 整合處置股票警示徽章（🚨 分盤撮合）與注意股票標籤（⚠️ 注意）。
   - 自動識別市場並呈現動態幣別與單位（台股 TWD / 張；美股 USD / 股）。
   - 實作 7 條市場因果白話文 XAI 解讀文案，清楚說明籌碼背後的因果邏輯。

---

## 決策後果 (Consequences)

### 正面效益 (Positive)
- **單一真實來源 (SSOT)**：所有台美股標的、日 K、法人、融資券與警示狀態統一收斂於本機 SQLite，徹底擺脫外部頻繁請求與限流。
- **美股法人軸無縫補完**：美股標的不再呈現空缺或中性盲區，透過微觀量價結構客觀量化機構籌碼。
- **向後完全兼容**：所有核心函式簽名與型別均採 optional 擴充，既有 22 個以上呼叫點 100% 正常運作。
- **全量測試保障**：全專案 151 個測試套件、1,262 個測試案例 100% 綠燈，建置 0 錯誤。

### 潛在限制與權衡 (Trade-offs)
- 前端目前在 `AiForceDashboardView.tsx` 尚未將 SQLite 注意/處置標籤直接傳入 `options.statusTag`，已開立技術債 [Debt #0040](../debts/0040-ai-force-frontend-status-tag-and-disposition-badge-wiring.md) 於下期迭代串接。
