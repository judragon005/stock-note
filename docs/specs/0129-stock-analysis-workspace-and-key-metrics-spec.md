# 0129. 個股深度分析工作區與關鍵量化估值體系規格 (Stock Analysis Workspace & Key Advanced Metrics Spec)

- **狀態**：Draft
- **建立日期**：2026-09-14
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0127](0127-stock-health-check-diagnosis-engine-and-workspace-spec.md), [0128](0128-stock-health-check-ux-redesign-and-glassmorphism-spec.md)
- **目標分支**：`feature/stock-analysis-workspace-and-key-metrics`

---

## 1. 需求背景與核心目標 (Problem & Goals)

### 1.1 痛點背景
使用者在進行台股與美股投資決策時，需參照領先專業平台（如財報狗）的系統化分析架構。
目前專案已具備「股票健診 (Stock Health Check)」與「穿透式財報彈窗」，但散落於不同介面，缺乏一個統一的「**個股深度研究中心**」，無法以系統化之雙層導航結構（8 大維度 × 37 項細部指標）全方位檢視個股營運體質、安全邊際、成長動能與內在價值折現。

### 1.2 核心目標
1. **一級工作區整合**：於頂部導航列新增一級專屬頁籤 **「📊 個股分析 (stock-analysis)」**，將現有「股票健診」收攏為其內部核心子模組。
2. **雙層深色毛玻璃側邊欄導航 (Two-Tier Navigation)**：忠實還原使用者提供之財報狗雙層選單結構（8 大一級主題 + 37 項二級子指標）。
3. **Phase 1 核心實作範疇**：
   - 二級導航框架與佈局容器 (`StockAnalysisWorkspace.tsx`)。
   - 整合現有「🏥 股票健診」作為子分頁。
   - 實作「📄 財務報表」、「💲 獲利能力」、「🛡️ 安全性分析」、「📊 成長力分析」四大核心維度圖表。
   - 實作「🐺 關鍵指標」7 大頂級量化估值模型（Piotroski F-Score 9 分制評分卡、自由現金流報酬率、長短期借款、現金週轉循環 CCC、彼得林區評價、DDM 股利折現、DCF 現金流折現 + 動態滑桿）。
4. **極致設計標準 (No Tailwind)**：全面採用專案原生 CSS 變數與 Inline Styles，支援深淺色主題與響應式排版。

---

## 2. 系統架構與選單拓撲 (Menu Topology)

```
[頂部導航列] ➔ 新增一級分頁: 📊 個股分析 (stock-analysis)
   │
   ├─ [頂部標的列]: 股票名稱代碼、收盤報價、Stock Pills 快捷標的膠囊列、ETF 智慧防呆橫幅
   │
   └─ [雙層側邊欄主工作區]:
        │
        ├── 1. 📢 最新動態 (News & Events)
        │
        ├── 2. 🏥 股票健診 (Stock Health Check) ➔ [已整合] 4 大健診幫手與 21 項量化指標
        │
        ├── 3. 📄 財務報表 (Financial Statements)
        │     ├── 每股盈餘 (EPS 歷史 20 季趨勢柱狀圖)
        │     ├── 每股淨值 (BVPS 走勢圖)
        │     ├── 損益表 (營收 / 毛利 / 營益 / 淨利 雙向階梯圖)
        │     ├── 總資產 (流動資產 vs 非流動資產堆疊長條圖)
        │     ├── 負債和股東權益 (資產負債結構與財務槓桿分佈)
        │     ├── 現金流量表 (CFO / CFI / CFF / FCF 雙向瀑布圖)
        │     ├── 股利政策 (歷年現金股利與配發紀錄)
        │     └── 電子書 (公開資訊觀測站季報/年報外部捷徑)
        │
        ├── 4. 💲 獲利能力 (Profitability)
        │     ├── 利潤比率 (毛利率 / 營業利益率 / 稅後淨利率 三率同圖走勢)
        │     ├── 營業費用率拆解 (研發費用率 / 銷售費用率 / 管理費用率)
        │     ├── 業外佔稅前淨利比例 (本業造血純度與業外損益佔比)
        │     ├── ROE / ROA (股東權益報酬率與總資產報酬率走勢)
        │     ├── 杜邦分析 (淨利率 × 資產週轉率 × 權益乘數 三分解模型)
        │     ├── 經營週轉能力 (應收帳款週轉率 / 存貨週轉率 / 總資產週轉率)
        │     ├── 營運週轉天數 (DSO / DIO / CCC 現金轉換週期)
        │     └── 現金股利發放率 (歷年配息發放率階梯)
        │
        ├── 5. 🛡️ 安全性分析 (Solvency & Safety)
        │     ├── 財務結構比率 (負債比率 / 股東權益比率)
        │     ├── 流速動比率 (流動比率 / 速動比率 安全警戒線)
        │     ├── 利息保障倍數 (Interest Coverage Ratio)
        │     ├── 現金流量分析 (營業現金流對流動負債比)
        │     ├── 營業現金流對淨利比 (CFO / Net Income 盈餘含金量)
        │     └── 盈餘再投資比率 (Reinvestment Rate)
        │
        ├── 6. 📊 成長力分析 (Growth Momentum)
        │     ├── 營收成長率 (YoY 年增率 & MoM 月增率)
        │     ├── 毛利成長率 (YoY 年增柱狀圖)
        │     ├── 營業利益成長率 (本業營業利益成長動能)
        │     ├── 稅後淨利成長率 (最終盈餘成長動能)
        │     └── 每股盈餘成長率 (EPS YoY 成長率)
        │
        ├── 7. ⚖️ 價值評估 (Valuation) [Phase 2 核心]
        │     ├── 本益比評價與河流圖 (5 階層 PE Band 彩帶河流圖)
        │     ├── 股價淨值比評價與河流圖 (5 階層 PB Band 彩帶河流圖)
        │     └── 現金股利殖利率與河流圖 (Dividend Yield River Chart)
        │
        └── 8. 🐺 關鍵指標 (Key Advanced Metrics) [⭐ Phase 1 核心實作]
              ├── 自由現金流報酬率 (FCF Yield = 每股 FCF / 現價)
              ├── Piotroski F 分數 (9 分制量化評分卡：獲利能力4分 + 資本結構3分 + 營運效率2分)
              ├── 長短期金融借款 (短借、長借、應付商業本票分佈與負債壓力)
              ├── 現金週轉循環 (CCC = DSO + DIO - DPO 營運資金被卡天數)
              ├── 彼得林區評價 (Peter Lynch Fair Value = 盈餘成長率 G 乘上 EPS，PEG 評價)
              ├── 股利折現評價 (DDM Gordon Growth Model 內在價值估算)
              └── 現金流折現評價 (DCF 內在價值估算，附動態 WACC 折現率與永續成長率互動滑桿)
```

---

## 3. 關鍵量化估值模型演算法 (Algorithm Specifications)

### 3.1 Piotroski F-Score (9 分制評分卡)
以最新 4 季（TTM）或最新季對照去年同期數據計算，總分 0 ~ 9 分（8-9 分優秀，0-2 分危險）：
1. **獲利性指標 (4 分)**：
   - `F_ROA`: 當季 Net Income > 0 則得 1 分。
   - `F_CFO`: 當季 Operating Cash Flow > 0 則得 1 分。
   - `F_DROA`: 本期 ROA 較去年同期提升則得 1 分。
   - `F_ACCRUAL`: 當期 CFO > Net Income（盈餘品質健康）則得 1 分。
2. **資本結構與償債能力 (3 分)**：
   - `F_DLEVER`: 本期長期負債比率較去年同期下降（或持平 0）則得 1 分。
   - `F_DLIQUID`: 本期流動比率 (Current Ratio) 較去年同期提升則得 1 分。
   - `F_EQ_OFFER`: 近一年無增資發行新股稀釋每股盈餘則得 1 分。
3. **營運效率指標 (2 分)**：
   - `F_DMARGIN`: 本期毛利率較去年同期提升則得 1 分。
   - `F_DTURN`: 本期資產週轉率較去年同期提升則得 1 分。

### 3.2 自由現金流報酬率 (FCF Yield)
$$\text{FCF Yield} = \frac{\text{TTM Free Cash Flow} / \text{Total Shares}}{\text{Current Stock Price}} \times 100\%$$
- 評價基準：$> 7\%$ 為極具吸引力（超值防守），$< 2\%$ 為昂貴或現金流吃緊。

### 3.3 彼得林區評價 (Peter Lynch Fair Value & PEG)
$$\text{Lynch Fair Value} = \text{TTM EPS} \times \min(\text{Earnings Growth Rate } G, 25)$$
$$\text{PEG Ratio} = \frac{\text{PE Ratio}}{G}$$
- $G$ 取近 3 年複合盈餘年增率或近一季 YoY 成長率。PEG $< 1.0$ 為超值買點，PEG $> 2.0$ 為高估警示。

### 3.4 現金流折現評價 (DCF Model with Interactive Sliders)
$$\text{PV} = \sum_{t=1}^{5} \frac{\text{FCF}_0 \times (1+g)^t}{(1+r)^t} + \frac{\text{FCF}_5 \times (1+g_n)}{(r - g_n) \times (1+r)^5}$$
- 預設參數：折現率 $r = 9\%$ (滑桿範圍 $6\% \sim 15\%$)，永續成長率 $g_n = 2.5\%$ (滑桿範圍 $1\% \sim 4\%$)，預測期 5 年成長率 $g$。
- 提供即時雙滑桿，滑動即時重新渲染合理每股內在價值與溢/折價空間。

### 3.5 股利折現評價 (DDM Gordon Growth Model)
$$\text{Fair Value} = \frac{\text{Annual Dividend} \times (1+g)}{r - g}$$
- 適用於具備連續穩定配息紀錄之定存股標的。

---

## 4. UI/UX 與視覺設計準則 (Native Glassmorphism)

1. **嚴禁 Tailwind Utility Classes**：
   - 全面使用專案原生 Design Tokens (`var(--bg-card)`, `var(--bg-secondary)`, `var(--border-color)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--gain-color)`, `var(--loss-color)`)。
2. **雙層導航結構**：
   - 第一層：左側縱向 Icon + 8 大類別標籤（固定寬度 110px），選中時呈現藍色發光垂直指示線與高亮背景。
   - 第二層：右側相鄰子選單（寬度 160px），展示該類別下的二級子項目清單。
   - 右側主視圖：寬敞的主視窗，呈現當前子指標的 20 季高對比柱狀/折線圖表、量化卡片與專家白話解讀。
3. **響應式適配**：
   - 平板與行動端支援抽屜式折疊選單，保證在各種視窗寬度下不破版。

---

## 5. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1 (一級工作區導航)**：導覽列新增「📊 個股分析」，點擊可順暢切換，並保留現有所有一級頁籤功能。
- [ ] **AC-2 (雙層導航連動)**：點選左側 8 大一級項目，次級選單即時更新；點選二級項目，右側主視圖無延遲切換對應視覺化模組。
- [ ] **AC-3 (股票健診子分頁整合)**：於「🏥 股票健診」子項中完整內嵌並正常運作現有 4 大健診幫手、21 項指標與穿透報告。
- [ ] **AC-4 (財務報表/獲利能力/安全性/成長力)**：各子項目具備 20 季歷史柱狀圖/走勢圖與純函式計算數據。
- [ ] **AC-5 (🐺 關鍵指標 7 大模型)**：
  - Piotroski F-Score 9 分卡計算正確且具備各項得分明細。
  - DCF 與 DDM 模型提供即時互動滑桿，滑動時即時更新合理價。
  - 彼得林區 PEG 與 FCF 報酬率準確計算。
- [ ] **AC-6 (工程與品質防護)**：
  - 單元測試套件 100% 綠燈通過。
  - `npm run build` TypeScript 0 錯誤、打包成功。
