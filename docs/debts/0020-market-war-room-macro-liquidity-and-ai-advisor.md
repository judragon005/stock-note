# 技術債 #0020: 宏觀戰情室、全球流動性監控與 AI 智慧每日操作決策儀表板 (Market War Room, Macro Liquidity & AI Strategy Advisor)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 宏觀與券商級決策儀表板需求調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `Macro` · `WarRoom` · `AI-Advisor` · `Liquidity` · `Quant` · `Dashboard`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備完善的個人資產管理與微觀層級交易功能：
1. **微觀與個股帳本完備**：包含持倉雙軌記帳、現金帳本（[src/engine/cashLedgerEngine.ts](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts)）、股票質押借貸風控（[src/engine/loanInterestEngine.ts](file:///d:/APP/股票紀錄/src/engine/loanInterestEngine.ts)）、XIRR 內部報酬率（[src/engine/xirrEngine.ts](file:///d:/APP/股票紀錄/src/engine/xirrEngine.ts)）、在途交割資金管理（[src/engine/inTransitEngine.ts](file:///d:/APP/股票紀錄/src/engine/inTransitEngine.ts)）與目標資產偏離度再平衡（[src/engine/rebalancingEngine.ts](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts)）。
2. **缺乏「宏觀總體經濟與市場情緒戰情室」**：
   - 使用者登入系統後，能看清「自己的口袋損益」，但**無法一目瞭然當前總體經濟景氣位階、全球資金流動性水位、跨資產風險偏好與市場極端恐慌度**。
   - 缺乏將「宏觀大盤環境 (Macro)」與「個人持倉防禦力 (Micro Portfolio)」進行交叉診斷的統一視圖。
3. **缺乏 AI 智慧每日一句話操作建言**：
   - 投資人在面臨市場暴跌或狂熱時，容易陷入情緒化決策。系統尚未能依據「當日宏觀指標（利率/VIX/M2/美元）+ 個人財務體質（現金比率/槓桿維持率/偏離度）」輸出具備紀律性、客觀防禦性的每日一句話戰略方針。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **多源宏觀數據的整合與跨域調用瓶頸**：
   - 宏觀經濟指標來源分散：利率/黃金/原油/VIX 來自金融期貨與指數（Yahoo Finance），M2 貨幣供給量來自各國央行統計（聯準會 FRED、台灣中央銀行），Fear & Greed Index 來自市場情緒指數。
   - 需建立純前端、零依賴、具備 CORS 代理池與本地 IndexedDB 歷史快取的「宏觀數據同步管道 (Macro Data Ingestion Pipeline)」，避免第三方 API 頻控或斷流。
2. **AI 建言的客觀性與防幻覺架構 (Deterministic Rule Engine + Optional LLM)**：
   - 純仰賴外部 LLM 生成投資建議存在幻覺風險、API 額度消耗與網路延遲問題。
   - 必須採用「雙軌制」：
     - **底層規則專家系統 (Deterministic Rule Engine)**：依據量化矩陣（如 VIX 位階 × 現金水位 × 質押維持率）保證 100% 離線即時輸出精準風控建言。
     - **頂層 AI 深度洞察 (Optional Gemini/Claude LLM)**：在使用者填入 API Key 時，提供深度多維度的個人化宏觀解讀。
3. **資訊過載與 UI/UX 視覺分層**：
   - 戰情室若塞滿雜亂數據將失去決策價值。需依照券商頂級交易室的「金字塔佈局」：頂部即時核心脈搏 ➔ 中部個人防禦與交叉診斷 ➔ 底部宏觀流動性與日曆時鐘。

### 暫緩理由 (Deferral Rationale)
1. 現有 v7.0 版本的核心會計與再平衡功能健全，戰情室為全新獨立的「決策輔助與總經視圖 (War Room Dashboard)」模組。
2. 先行收錄於技術債中完成數據源、指標公式、UI 模組與 AI 評估矩陣的架構規劃，待下一階段專題開發時無縫實作。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 宏觀戰情室六大核心維度指標庫 (Macro Indicators Registry)

| 維度 | 指標名稱 | 數據代號 / 來源 | 經濟意涵與警示門檻 |
| :--- | :--- | :--- | :--- |
| **1. 利率與資金成本** | **美國 10 年期公債殖利率** | `^TNX` (Yahoo Finance) | 無風險利率基準，科技股估值之錨。 |
| | **美債殖利率曲線倒掛 (10Y - 2Y)** | `^TNX` - `^IRX` (Yahoo Finance) | 經濟衰退與降息循環領先信號（負值為倒掛）。 |
| | **聯準會基準利率 / 台灣央行重貼現率** | 央行公告 / FRED 快取 | 官方借貸政策成本與升降息週期。 |
| **2. 全球流動性水庫** | **美國 M2 貨幣供給量 (YoY 年增率)** | FRED / St. Louis Fed | 全球美元水龍頭放水或緊縮趨勢。 |
| | **台灣 M2 貨幣供給量 (YoY 年增率)** | 台灣央行 CBC 統計 | 台股資金動能指標（M1B 向上突破 M2 為黃金交叉）。 |
| | **美元指數 (DXY)** | `DX-Y.NYB` (Yahoo Finance) | 全球避險與新興市場資金流向風向球。 |
| | **USD/TWD 匯率與變動** | `USDTWD=X` (既有引擎) | 外資進出台股與匯率損益指標。 |
| **3. 大宗商品與通膨** | **黃金現貨/期貨 (Gold)** | `GC=F` (Yahoo Finance) | 地緣政治風險、去美元化與終極避險資產。 |
| | **原油期貨 (WTI / Brent)** | `CL=F` (Yahoo Finance) | 製造業景氣活力、運輸成本與通膨輸入壓力。 |
| | **銅金比 (Copper/Gold Ratio)** | `HG=F` / `GC=F` | 全球實體經濟成長動能領先指標。 |
| **4. 市場情緒與波動** | **VIX 恐慌指數 (CBOE VIX)** | `^VIX` (Yahoo Finance) | S&P 500 選擇權隱含波動率（`<15` 樂觀鈍化，`>30` 極度恐慌）。 |
| | **CNN 恐慌與貪婪指數 (Fear & Greed)** | CNN API / 多指標合成 (0~100) | 全球散戶與機構綜合情緒計量。 |
| | **台股選擇權 Put/Call Ratio** | 台灣期交所 TAIFEX | 台股法人多空避險未平倉籌碼（`>100%` 偏多，`<100%` 偏空）。 |
| | **台股大盤融資維持率** | 台灣證交所 TWSE | 散戶斷頭防線（`<130%` 斷頭追繳警戒，`>160%` 健康）。 |
| **5. 個人組合宏觀體質** | **實質現金水位比率 (Cash Ratio %)** | 專案 `cashBalance / NAV` | 熊市防禦緩衝與低檔掃貨購買力（建議常態 10%~30%）。 |
| | **質押與借貸槓桿維持率** | 專案 `totalCollateral / totalLoan` | 質押借款斷頭安全防線（`>200%` 極安全，`<140%` 警戒）。 |
| | **投資組合 Beta 係數** | 專案 `quantMetrics.ts` | 組合對總體大盤波動的放大倍數。 |
| | **資產配置偏離度 (Max Drift %)** | 專案 `rebalancingEngine.ts` | 偏離目標配置最大幅度，是否需啟動再平衡。 |
| **6. 宏觀重大財經日曆** | **央行決議與經濟數據倒數** | 內建行事曆 + 快取 | FOMC 會議、台央行理監事會、美國 CPI、非農公布倒數。 |

---

### B. 券商級戰情室版面架構 (War Room UI Layout)

```
+-----------------------------------------------------------------------------------+
|  🏛️ 總體戰情室 (Market War Room)          [🟢 即時連線中]  [🔄 手動整理] [⚙️ 設定] |
+-----------------------------------------------------------------------------------+
|  🤖 AI 智慧每日作戰方針 (AI Morning Brief & Action Directive)                      |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ 💡 今日定調：【防禦蓄勢・謹慎加碼】                                          │  |
|  │ 「市場情緒處於極度恐慌 (VIX 31.8)，10Y美債利率回落至 3.85%；個人帳戶現金水位     │  |
|  │  達 28.5%、質押維持率 265% 處於安全防區。今日建議：嚴禁追高殺跌，可啟動注水式    │  |
|  │  再平衡，針對低配之核心 ETF (0050/VT) 分批掛單加碼，維持資金紀律。」           │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
|  📊 第一層：市場四柱即時脈搏 (Market Core Pillars)                                |
|  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        |
|  │ 利率與美債    │ │ 恐慌情緒      │ │ 避險與商品    │ │ 全球流動性    │        |
|  │ 10Y: 3.85%    │ │ VIX: 31.8     │ │ 黃金: $2,510  │ │ 美元: 101.2   │        |
|  │ 倒掛: -0.15%  │ │ F&G: 22(極恐) │ │ 原油: $73.5   │ │ 台幣: 31.85   │        |
|  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘        |
+-----------------------------------------------------------------------------------+
|  🛡️ 第二層：個人投資組合宏觀防護盾 (Portfolio Macro Shield)                        |
|  ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐  |
|  │ 現金購買力防禦水位     │ │ 質押與借貸安全維持率  │ │ 資產再平衡偏離度      │  |
|  │ NT$ 850,000 (28.5%)   │ │ 265.4% (🟢 極度安全)   │ │ 最大偏離: +4.2% (正常)│  |
|  └───────────────────────┘ └───────────────────────┘ └─────────────────────────┘  |
+-----------------------------------------------------------------------------------+
|  📈 第三層：宏觀流動性水庫與 M2 現金流趨勢 (Macro Liquidity & M2 Tide)             |
|  [折線趨勢圖：台美 M2 年增率 vs S&P500 / 台股加權指數 歷史對比]                     |
+-----------------------------------------------------------------------------------+
|  📅 第四層：關鍵財經事件倒數日曆 (Upcoming Catalysts Countdown)                    |
|  - 🇺🇸 美國 8 月 CPI 公布：倒數 3 天 (2026-09-05)                                 |
|  - 🏛️ FOMC 利率決議會議：倒數 14 天 (2026-09-16)                                  |
|  - 🇹🇼 台灣央行 Q3 理監事會議：倒數 21 天 (2026-09-23)                             |
+-----------------------------------------------------------------------------------+
```

---

### C. AI 智慧操作建議引擎演算法 (Deterministic Heuristic Matrix + LLM Prompt)

#### 1. 離線純規則專家系統 (Deterministic Expert Matrix)
系統計算下列 5 大維度評分：
- $S_{vix}$：VIX 水位分數（低於 15 為亢奮高估、15~25 為常態、高於 30 為恐慌錯殺）。
- $S_{cash}$：個人現金水位分數（$<10\%$ 緊繃脆弱、10%~30% 適中、$>30\%$ 購買力充裕）。
- $S_{loan}$：借貸維持率分數（$<140\%$ 高危追繳、140%~180% 警戒、$>200\%$ 穩固）。
- $S_{rate}$：10Y 美債殖利率與倒掛趨勢（倒掛加深、降息初期、升息末期）。
- $S_{drift}$：組合配置偏離狀態（正常、偏離、嚴重失衡）。

根據矩陣交集，輸出結構化操作四字定調（如：`【分批低接】`、`【獲利調節】`、`【拉高現金】`、`【維持定律】`）與客觀執行清單。

#### 2. LLM 深度分析提示詞結構 (AI Prompt Payload)
當使用者於設定頁填入 API Key (Gemini 1.5 Pro / Flash 等) 時，傳入結構化 JSON：
```json
{
  "macro": {
    "us10yYield": 3.85,
    "yieldInversion": -0.15,
    "vix": 31.8,
    "fearAndGreedIndex": 22,
    "goldPrice": 2510.5,
    "wtiOilPrice": 73.5,
    "dxy": 101.2,
    "usM2GrowthYoY": 1.8,
    "twM2GrowthYoY": 5.4
  },
  "portfolio": {
    "nav": 3500000,
    "cashRatioPercent": 28.5,
    "loanMaintenanceRatio": 265.4,
    "topOverweightSymbol": "0050 (+4.2%)",
    "topUnderweightSymbol": "VT (-3.8%)",
    "portfolioBeta": 0.88
  },
  "upcomingEvents": [
    { "name": "US CPI", "daysLeft": 3 },
    { "name": "FOMC Meeting", "daysLeft": 14 }
  ]
}
```
由 AI 生成精煉、富有洞見且絕不給出違法具體報牌的個人化宏觀資產守則。

---

### D. 數據存儲與資料庫擴充 (IndexedDB Schema)

於 IndexedDB 擴充 `macroIndicators` 與 `macroSnapshots` Store：
```typescript
export interface MacroIndicatorSnapshot {
  date: string;              // YYYY-MM-DD
  us10y: number;             // 10Y 美債利率
  us2y: number;              // 2Y 美債利率
  vix: number;               // 恐慌指數
  fearAndGreed: number;      // 貪婪指數 (0~100)
  gold: number;              // 黃金 (USD/oz)
  oil: number;               // 原油 (USD/bbl)
  dxy: number;               // 美元指數
  usdtwd: number;            // 美元台幣
  usM2YoY?: number;          // 美國 M2 年增率 %
  twM2YoY?: number;          // 台灣 M2 年增率 %
  putCallRatio?: number;     // 台股選擇權 Put/Call Ratio
  marginMaintenance?: number;// 台股融資維持率 %
  updatedAt: number;
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本架構實作：
1. 開發全新「🏛️ 戰情室 (War Room)」主導覽頁籤與儀表板模組時。
2. 整合「宏觀多源即時數據管線 (Macro Ingestion Pipeline)」與 Yahoo Finance / FRED 資料串接時。
3. 引入「AI 智慧助理 / 每日晨報 (AI Morning Brief)」分析功能時。
