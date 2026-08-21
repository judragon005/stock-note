# 股票紀錄與投資分析儀 (Stock Tracker & Analyzer)

一個專為台股與美股投資人打造的現代化多資產記帳、視覺化資產配置與即時公司行動分析系統。

[![GitHub CI](https://github.com/judragon003/-/actions/workflows/ci.yml/badge.svg)](https://github.com/judragon003/-/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Vitest-83%2F83%20Passed-brightgreen)](https://github.com/judragon003/-)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20Errors-blue)](https://github.com/judragon003/-)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ 核心特色與功能 (Key Features)

### 1. 持倉雙階自然排序與證交所端點校正 (Holdings Sort & TWSE Endpoint Fix) *(V1.8 新增)*
- **雙階自然排序 (Multi-Tier Natural Sort)**：當前持倉庫存嚴格依「台股優先、美股置底；同市場內依標的代碼字母數字自然升冪 (Natural Alphanumeric Sort)」排列（例如：`00403A` ➔ `0050` ➔ `00919` ➔ `2330` ➔ `9927` ➔ `VT`），與券商標準看盤軟體 100% 體驗對齊。
- **TWSE 除權除息預告端點精確解析**：正確將台灣證交所 `TWT48U_ALL` 歸類為除權除息預告表，讀取現金股利與股票股利資訊。
- **無效減資安全閘門 (Invalid Reduction Shield)**：過濾變更股數與金額皆為 0 之假減資事件，根絕除息預告誤產生「2026-10-01 虧損減資 0 股 0 元」之假資料問題。

### 2. 虛擬時序動態配股與高精準公司行動 (Virtual Holdings Timeline & Accuracy) *(V1.7 新增)*
- **虛擬時序動態持股推進器 (Virtual Timeline)**：連續除權配股（如永豐金歷年除權）動態累加前次配股股數，徹底杜絕多次除權基準股數失準問題。
- **台股現金減資集保向下取整 (Floor New Ratio)**：依規定以 `Math.floor` 精確計算換發新股，泰銘 (9927) 減資 2,829 股 100% 精準對齊整數持股。
- **除權息 T-1 前一日收盤在倉判定**：嚴格依證券法規以除權日前一日收盤持股為基準，除權日當日買進不享配股。
- **零持股平倉安全守護 (Zero-Holding Shield)**：已平倉（0 股）標的自動鎖定歷史股票分割與配股，杜絕已賣光標的死灰復燃。
- **全量台灣時區 (Asia/Taipei UTC+8) 轉換**：支援 Ghostfolio 交易資料無損匯入與官方名稱自動校準。

### 2. 智慧掃描公司行動進度可視化、受控並行與斷點接續 (Scanner Progress & Resume) *(V1.6 新增)*
- **即時動態進度條與個股反饋**：現代漸變發光進度條，展示完成比例、已完成檔數與當前比對個股名稱/代號 (`正在比對：2330 台積電 (3/15)`)。
- **受控並行池與防頻控微延遲**：採用 Promise Worker Pool (`concurrency = 3`) 並行加速，輔以 60~100ms jitter 微延遲，將多檔股票掃描時間縮短 3~5 倍並防護 Rate Limit。
- **原生 AbortSignal 中斷機制**：隨時點擊「中止掃描」或關閉彈窗立即停止連線，完整保留已掃描事件供即時勾選套用。
- **斷點記錄與接續掃描 (Resume)**：中止或部分完成時，提供「接續掃描剩餘 (X 檔)」按鈕精準續掃，新事件平滑無縫合併。
- **Session 級記憶體快取與強制重整**：已查詢個股在當前 Session 秒開載入；提供「強制全量重掃」一鍵清空快取重新查詢。

### 2. 美金台幣 (USD/TWD) 匯率自動更新與平滑備援 (Auto USD/TWD Rate) *(V1.5 新增)*
- **純前端免 Key 自動抓取**：透過 Yahoo Finance (`USDTWD=X`) 與多節點 CORS 代理池自動抓取最新盤中匯率與前日收盤價。
- **四層平滑降級備援 (Fallback Cascade)**：即時匯率 ➔ 前日收盤價 (`chartPreviousClose`) ➔ LocalStorage 本地歷史快取 ➔ 基準預設值 (32.5)，斷線不崩潰。
- **行情機制完全同步**：進站自動抓取、開盤期間 60 秒智慧輪詢、點擊「重整行情」按鈕同步強制刷新。
- **純自動化 UI 徽章**：頂部 Header 呈現優雅匯率徽章，背景刷新時展示微旋轉動畫，滑鼠懸停 (Tooltip) 提示來源狀態與時間。

### 3. 雙市場獨立記帳與高精度會計引擎 (Dual Market Accounting)
- **台股 (TWD) & 美股 (USD) 雙軌並行**：支援匯率動態切換與換算，資產損益與現金流分項精確加總。
- **移動加權平均成本模型**：精確處理分批買進、部分賣出已實現損益、台股券商手續費折數（2.8折/5折/6折/自訂）與 20 元低消門檻。
- **台股整數股數嚴格對齊**：依台灣市場規則，台股持股與異動一律四捨五入為整數 1 股（零小數點股數）。

### 4. 全市場即時與延遲報價系統與自訂價格鎖定 (Realtime Quotes & Price Lock) *(V1.4 新增)*
- **純前端免費多源報價**：Yahoo Finance API (v8/v7) 支援台美全市場，搭配 TWSE 官方 OpenAPI 盤後每日收盤價備援。
- **健全 CORS 代理池**：多節點輪替重試（`corsproxy.io`、`allorigins`、`codetabs`）與 4000ms 超時熔斷。
- **智慧開盤自動輪詢**：自動判定台股與美股交易時段，開盤時每 60 秒背景自動輪詢，休市期間暫停以節省資源；進站自動發起全持股同步。
- **自訂價格手動鎖定保護 (🔒)**：手動編輯價格自動套用鎖定保護，避免被自動輪詢覆蓋；支援一鍵解鎖。
- **持久化快取降級 (⚠️)**：離線或請求受限時平滑退回 `localStorage` 本地最後有效報價，保證 100% 離線可用。
- **透明化狀態徽章與當日漲跌**：呈現 🟢 盤中即時/延遲、🟡 昨收、🔒 鎖定、⚠️ 快取四大徽章與當日漲跌額幅。

### 5. 全市場純線上即時公司行動掃描 (Full Market Live Scanner)
- **官方開放資料端點直連**：串接台灣證券交易所 (TWSE) 官方減資預告表 (`TWT48U_ALL`) 與除權息預告表 (`TWT49U_ALL`)。
- **全市場涵蓋**：支援台股上市 (`.TW`)、上櫃／債券 ETF (`.TWO`) 與美股全市場代碼。
- **自動時間窗口與持有回溯**：自動以持股「最早買進日」至今日掃描待補登事件，調用 `getHoldingsAsOfDate` 依基準日時點持股精準試算。

### 6. 5 大特殊公司行動會計核心 (Special Corporate Actions)
支援 12 種交易與公司行動型別之完整會計處理：
- 🔄 **換股合併 (`STOCK_MERGER`)**：原標的持股歸零，目標標的增加換算股數並承接原始投入成本。
- 💰 **特別股贖回 (`PREFERRED_REDEMPTION`)**：收回後持股歸零，以贖回現金與原始成本結算已實現損益。
- 🌿 **企業分拆 (`SPIN_OFF`)**：母公司持股數不變但依比例拆分成本；新子公司以分拆成本與獲配股數建倉。
- 📜 **可轉債換股 (`CB_CONVERSION`)**：原始債券投入本金轉為新普通股的持股成本基準。
- 🤝 **公開收購 (`TENDER_OFFER`)**：依收購價全額結算賣出並結算損益。

### 6. 視覺化資產配置與互動圖表 (Visualizations & Treemap)
- **純原生 SVG Squarified Treemap**：面積精確對應市值比重，色彩深度即時反映損益率（零外部臃腫圖表套件依賴）。
- **雙主題漲跌色彩模式**：支援「台灣紅漲綠跌」與「國際綠漲紅跌」一鍵即時切換。
- **持股歷程時間軸 (Timeline)**：持倉列表支援折疊展開查看單一標的所有歷史買賣、除權息與減資歷程。

### 7. 本地隱私與雙向資料備份 (Privacy & Persistence)
- **資料 100% 留存於本地瀏覽器**：無須註冊，不將資產資料上傳第三方伺服器。
- **JSON / CSV 雙向無損備份還原**：支援 UTF-8 BOM 與 18 欄位公司行動結構完整相容。

---

## 🛠️ 技術架構 (Tech Stack)

- **核心框架**：React 18 + TypeScript + Vite
- **樣式系統**：Vanilla CSS + CSS 變數全域主題系統（現代深色玻璃擬態風格）
- **測試框架**：Vitest（77/77 單元測試，100% 測試驅動開發 TDD）
- **圖示庫**：Lucide React
- **CI / CD**：GitHub Actions 自動化測試與型別檢查

---

## 📂 專案目錄結構 (Project Structure)

```text
.
├── .github/workflows/ci.yml         # GitHub Actions 自動化 CI 流程
├── .scratch/                        # 本地任務切片與 Ticket 追蹤
├── docs/
│   ├── adr/                         # 架構決策紀錄 (ADR-0001 ~ ADR-0007)
│   ├── handoff/                     # 專案全量交付手冊 (handoff_stock_tracker_final.md)
│   ├── specs/                       # 功能規格需求書 (PRD-0001 ~ PRD-0007)
│   └── guides/                      # 分支保護、PR 工作流與驗證手冊
├── src/
│   ├── components/                  # 前端 UI 元件
│   │   ├── CorporateActionScannerModal.tsx # 純線上即時掃描彈窗（進度條、斷點接續與 Session 快取）
│   │   ├── Header.tsx               # 頂部導航、一鍵更新市價與開休市狀態
│   │   ├── HoldingsTable.tsx        # 持倉總覽、報價徽章與 PriceDisplayView
│   │   ├── SummaryCards.tsx         # 關鍵財務指標卡片
│   │   ├── TradeHistoryTable.tsx    # 交易歷程明細表
│   │   ├── TradeModal.tsx           # 12 種事件動態表單與即時試算
│   │   └── TreemapChart.tsx         # 原生 SVG Treemap 樹狀圖
│   ├── engine/                      # 核心會計與金融計算引擎
│   │   ├── calculator.ts            # 移動加權平均成本與特殊事件計算 (25 tests)
│   │   ├── corporateActionScanner.ts # TWSE/Yahoo 多源線上掃描模組（受控並行與斷點接續）(9 tests)
│   │   └── priceFetcher.ts          # 多源即時/延遲報價核心引擎 (16 tests)
│   ├── hooks/                       # 自訂 React Hooks
│   │   └── usePriceAutoRefresh.ts   # 交易時段判定與 60 秒自動輪詢 Hook (6 tests)
│   ├── types/                       # 全域 TypeScript 型別定義 (stock.ts)
│   └── utils/                       # Treemap 演算法、Storage 存取與 Logger 工具 (21 tests)
├── CONTEXT.md                       # 領域模型通用語言詞彙表
└── README.md                        # 專案說明文件
```

---

## 🚀 快速開始 (Getting Started)

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```

### 執行單元測試 (Vitest)
```bash
npm test
```

### 建立生產版本 (TypeScript 檢查 + Vite 打包)
```bash
npm run build
```

---

## 📜 授權協議 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
