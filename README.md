# 股票紀錄與投資分析儀 (Stock Tracker & Analyzer)

一個專為台股與美股投資人打造的現代化多資產記帳、視覺化資產配置與即時公司行動分析系統。

[![GitHub CI](https://github.com/judragon003/-/actions/workflows/ci.yml/badge.svg)](https://github.com/judragon003/-/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Vitest-45%2F45%20Passed-brightgreen)](https://github.com/judragon003/-)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20Errors-blue)](https://github.com/judragon003/-)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ 核心特色與功能 (Key Features)

### 1. 雙市場獨立記帳與高精度會計引擎 (Dual Market Accounting)
- **台股 (TWD) & 美股 (USD) 雙軌並行**：支援匯率動態切換與換算，資產損益與現金流分項精確加總。
- **移動加權平均成本模型**：精確處理分批買進、部分賣出已實現損益、台股券商手續費折數（2.8折/5折/6折/自訂）與 20 元低消門檻。
- **台股整數股數嚴格對齊**：依台灣市場規則，台股持股與異動一律四捨五入為整數 1 股（零小數點股數）。

### 2. 全市場純線上即時公司行動掃描 (Full Market Live Scanner)
- **官方開放資料端點直連**：串接台灣證券交易所 (TWSE) 官方減資預告表 (`TWT48U_ALL`) 與除權息預告表 (`TWT49U_ALL`)。
- **全市場涵蓋**：支援台股上市 (`.TW`)、上櫃／債券 ETF (`.TWO`) 與美股全市場代碼。
- **多重 CORS 代理池自動輪替**：內建 `corsproxy.io`、`allorigins.win` 與 `codetabs` 代理池，具備超時熔斷與高可用連線。
- **自動時間窗口與持有回溯**：自動以持股「最早買進日」至今日掃描待補登事件，調用 `getHoldingsAsOfDate` 依基準日時點持股精準試算。

### 3. 5 大特殊公司行動會計核心 (Special Corporate Actions)
支援 12 種交易與公司行動型別之完整會計處理：
- 🔄 **換股合併 (`STOCK_MERGER`)**：原標的持股歸零，目標標的增加換算股數並承接原始投入成本。
- 💰 **特別股贖回 (`PREFERRED_REDEMPTION`)**：收回後持股歸零，以贖回現金與原始成本結算已實現損益。
- 🌿 **企業分拆 (`SPIN_OFF`)**：母公司持股數不變但依比例拆分成本；新子公司以分拆成本與獲配股數建倉。
- 📜 **可轉債換股 (`CB_CONVERSION`)**：原始債券投入本金轉為新普通股的持股成本基準。
- 🤝 **公開收購 (`TENDER_OFFER`)**：依收購價全額結算賣出並結算損益。

### 4. 視覺化資產配置與互動圖表 (Visualizations & Treemap)
- **純原生 SVG Squarified Treemap**：面積精確對應市值比重，色彩深度即時反映損益率（零外部臃腫圖表套件依賴）。
- **雙主題漲跌色彩模式**：支援「台灣紅漲綠跌」與「國際綠漲紅跌」一鍵即時切換。
- **持股歷程時間軸 (Timeline)**：持倉列表支援折疊展開查看單一標的所有歷史買賣、除權息與減資歷程。

### 5. 本地隱私與雙向資料備份 (Privacy & Persistence)
- **資料 100% 留存於本地瀏覽器**：無須註冊，不將資產資料上傳第三方伺服器。
- **JSON / CSV 雙向無損備份還原**：支援 UTF-8 BOM 與 18 欄位公司行動結構完整相容。

---

## 🛠️ 技術架構 (Tech Stack)

- **核心框架**：React 18 + TypeScript + Vite
- **樣式系統**：Vanilla CSS + CSS 變數全域主題系統（現代深色玻璃擬態風格）
- **測試框架**：Vitest（45/45 單元測試，100% 測試驅動開發 TDD）
- **圖示庫**：Lucide React
- **CI / CD**：GitHub Actions 自動化測試與型別檢查

---

## 📂 專案目錄結構 (Project Structure)

```text
.
├── .github/workflows/ci.yml         # GitHub Actions 自動化 CI 流程
├── .scratch/                        # 本地任務切片與 Ticket 追蹤
├── docs/
│   ├── adr/                         # 架構決策紀錄 (ADR-0001 ~ ADR-0004)
│   ├── handoff/                     # 專案全量交付手冊 (handoff_stock_tracker_final.md)
│   ├── specs/                       # 功能規格需求書 (PRD-0001 ~ PRD-0004)
│   └── guides/                      # 分支保護與協作規範指南
├── src/
│   ├── components/                  # 前端 UI 元件
│   │   ├── CorporateActionScannerModal.tsx # 純線上即時掃描彈窗
│   │   ├── HoldingsTable.tsx        # 持倉總覽與時間軸展開
│   │   ├── SummaryCards.tsx         # 關鍵財務指標卡片
│   │   ├── TradeHistoryTable.tsx    # 交易歷程明細表
│   │   ├── TradeModal.tsx           # 12 種事件動態表單與即時試算
│   │   └── TreemapChart.tsx         # 原生 SVG Treemap 樹狀圖
│   ├── engine/                      # 核心會計與金融計算引擎
│   │   ├── calculator.ts            # 移動加權平均成本與特殊事件計算
│   │   ├── calculator.test.ts       # 會計核心單元測試 (25 tests)
│   │   ├── corporateActionScanner.ts # TWSE/Yahoo 多源線上掃描模組
│   │   └── corporateActionScanner.test.ts # 掃描與日期標準化測試 (5 tests)
│   ├── types/                       # 全域 TypeScript 型別定義
│   └── utils/                       # Treemap 演算法與 Storage 存取工具
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

### 建置生產環境版本 (TypeScript 檢查 + Vite 打包)
```bash
npm run build
```

---

## 📜 授權協議 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
