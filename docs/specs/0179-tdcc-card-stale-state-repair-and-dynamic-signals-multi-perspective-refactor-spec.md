# 0179 Spec: TDCC 集保卡片狀態殘留修復與 AI 動態信號四重視角全維度重構規格書

## 1. 概述與問題陳述 (Overview & Problem Statement)

### 1.1 背景與問題痛點
在 AI 主力戰情室日常操盤與即時標的切換過程中，使用者回報了兩大核心體驗與量化決策缺陷：

1. **Card 19 (TDCC 集保千張大戶趨勢) 換股時狀態凍結殘留 (Stale State & Missing Key)**：
   - 使用者在搜尋列輸入新個別股票（非 ETF）時，Card 19 圖表與指標完全沒有更新，依然停留在上一檔標的（經資料庫底層交叉比對，畫面數據顯示千張大戶 `85.61%`、近 4 週變動 `+2.05%`、總股東人數 `91,694`、基準日 `2026-10-09`，證實為個股 **`2344` (華邦電)** 之集保數據）。
   - **程式碼根因剖析**：
     - 在 `AiForceDashboardView.tsx` 中，`<TdccDistributionCard data={report.tdccDistribution} />` 未綁定 `key={symbol}`，導致 React Virtual DOM 在同型別節點更新時沿用舊內部渲染狀態。
     - 在非同步載入期間（`loadDataForSymbol`），未先將 `report.tdccDistribution` 重置為待命狀態；若輸入的新標的於本地湖倉無 TDCC 記錄，後續的降級回補函式 `backfillSymbolOhlcvAndIndicators` **僅回補日 K 線，完全遺漏 TDCC 集保回補**，導致卡片無任何新數據推入並殘留上一檔標的。
2. **Card 12 (AI 主力動態信號判斷) 過度簡化且紅燈硬編碼 (Hardcoded Red Light & Lack of Depth)**：
   - 目前 Card 12 僅為極簡的靜態文字清單，且底部「紅燈」為純寫死標籤（`backgroundColor: '#ef4444'`），未能依據多因子量化結果動態變換。
   - 缺乏多維金融實戰視角：無法滿足**交易所**（市場監理、處置股票撮合機制、流動性預警）、**券商**（融資融券槓桿、維持率斷頭警戒、借券放空動向）、**法人**（多因子權重可解釋性、20 日 VWAP 成本標準差乖離）與**個人投資人**（破解「趨勢破線但籌碼集中」的多空矛盾、關鍵防守價與直覺戰略指引）的決策需求。
3. **系統潛在盲點 (Edge Cases & Blindspots)**：
   - 輸入美股代碼時缺乏市場隔離（美股無 TDCC 機制，需展示標準 Honest Empty State）。
   - 盤中未結算與週五盤後結算時序缺乏清楚標示，容易造成即時性認知混淆。

### 1.2 目標 (Goals)
1. **徹底解決 Card 19 切換標的凍結缺陷**：引入 `key={symbol}` 強制重置、標的切換即刻清空舊圖表、強化本地無資料時的優雅 Honest Empty State 與自動備援回補。
2. **重構 Card 12 為四重視角全維度量化面板**：
   - 整合交易所處置/注意監理狀態與撮合機制。
   - 整合券商融資維持率與借券賣出警戒。
   - 建立法人多因子加權量化評分與 VWAP 成本乖離標準差。
   - 實作「多空矛盾智能仲裁演算法」，為個人投資人輸出情境化白話操作指引與防守支撐價。
3. **消除硬編碼燈號**：依據綜合量化總分動態映射為綠燈（偏多/安全）、黃燈（觀望/中性）、紅燈（偏空/高風險）。

---

## 2. 第一性原理與業務領域邏輯 (Domain Logic & Principles)

### 2.1 Card 19 生命週期防禦與狀態洗淨 (State Sanitization)
```
[使用者輸入新標的] ───> [觸發 loadDataForSymbol] ───> [即刻重置 report 為 loading 待命狀態]
                                                    │
                                                    ├───> [本地湖倉載入 (日 K + TDCC)]
                                                    │         │
                                                    │         ├──> 有 TDCC: 正常繪製
                                                    │         └──> 無 TDCC: 呈現 Honest Empty State (集保結算中)
                                                    │
                                                    └───> [React 節點帶有 key={symbol}] (強制重新掛載，零舊狀態殘留)
```

### 2.2 Card 12 四重視角領域模型定義

| 金融視角 | 核心關注重點 | 量化指標與指標邏輯 | UI 呈現與警示規則 |
| :--- | :--- | :--- | :--- |
| **交易所 (Exchange)** | 監理合規、市場撮合、異常波動、流動性防線 | - 處置股票狀態（`NORMAL`, `ATTENTION`, `DISPOSITION`）<br>- 撮合週期（常態逐筆 vs 5分盤/20分盤集合競價）<br>- 當沖比率（當沖成交張數 / 總成交張數） | - 標註處置徽章與撮合限制<br>- 當沖比 > 60% 亮起「當沖過熱投機警戒」 |
| **券商 (Broker)** | 信用交易、融資維持率、追繳斷頭、借券放空動向 | - 融資餘額與增減張數<br>- 融資維持率警戒級距（<130% 斷頭追繳）<br>- 借券賣出餘額與券資比 | - 融資增加但股價跌破 MA20 標註「融資浮額沉重 / 追繳風險」<br>- 券資比 > 30% 標註「軋空/多空對決」 |
| **法人 (Institutional)** | 多因子量化評分、VWAP 成本定錨、土洋同步性 | - 綜合量化分：$0.35 \times \text{籌碼} + 0.30 \times \text{趨勢} + 0.20 \times \text{動能} - 0.15 \times \text{風險}$<br>- VWAP 20 日主力成本乖離標準差（$\sigma$ 偏離）<br>- 外資/投信 5 日累計動態 | - 揭示多因子權重百分制得分（0~100）<br>- 標示 VWAP 主力成本與乖離倍數（如 $-2.1\sigma$ 超跌）<br>- 標示土洋同步鎖碼或土洋對作 |
| **個人使用者 (Retail)** | 破解多空矛盾、白話行動指引、關鍵支撐停損位 | - 多空矛盾仲裁規則<br>- 關鍵防守支撐價位（MA20 或布林下軌）<br>- 轉強壓力價位（MA5 或前高） | - 一句話決策情境總評<br>- 標示「關鍵防守價：XX 元」<br>- 直覺化戰略燈號（綠/黃/紅） |

### 2.3 多空矛盾智能仲裁機制 (Conflict Resolution Matrix)
在實戰盤勢中，「趨勢破線偏空」但「主力籌碼集中」與「動能超跌」屬於典型主力洗盤或左側吸籌型態：
1. **型態一：洗盤破底翻 (Bear Trap)**
   - 條件：`trend = 偏空` 且 `chips = 集中` 且 `momentum = 超跌/超賣`。
   - 仲裁解讀：「**主力逆勢吸籌但短線破線，疑似洗盤破底翻觀察區。建議觀望勿盲目殺低，待放量站回 5 日線轉強再行加碼。**」
   - 燈號：黃燈 (觀望等待)。
2. **型態二：高檔出貨誘多 (Bull Trap)**
   - 條件：`trend = 多頭` 且 `chips = 渙散/調節` 且 `risk = 高風險`。
   - 仲裁解讀：「**股價雖處多頭，但主力法人持續逢高調節，呈現出貨背離。切勿追高，嚴防主力倒貨引發快速回檔。**」
   - 燈號：黃燈偏紅 (警戒減碼)。
3. **型態三：共振主升段 (Harmonic Surge)**
   - 條件：`trend = 偏多` 且 `chips = 集中` 且 `momentum = 強勁`。
   - 仲裁解讀：「**量價齊揚、籌碼高度集中，波段多頭主升趨勢明確，順勢持有或沿 5 日線偏多操作。**」
   - 燈號：綠燈 (偏多積極)。
4. **型態四：共振破位主跌段 (Harmonic Collapse)**
   - 條件：`trend = 破位偏空` 且 `chips = 明顯調節` 且 `risk = 破位警戒`。
   - 仲裁解讀：「**均線全數跌破，籌碼外資投信同步砍倉，主跌段殺盤風險極高。嚴格執行停損退場，切勿猜底。**」
   - 燈號：紅燈 (高風險避險)。

---

## 3. 系統架構變更與模組邊界 (System Architecture)

### 3.1 模組 1：戰情室主容器生命週期修復 (`src/components/aiForceDashboard/AiForceDashboardView.tsx`)
- 為 Card 19 容器與卡片實例綁定 `key={symbol}`：
  ```tsx
  <TdccDistributionCard
    key={symbol}
    data={report.tdccDistribution}
    colorTheme={market === 'US' ? 'international' : 'taiwan'}
  />
  ```
- 在 `loadDataForSymbol` 函式啟動時，若切換為新標的，初始化待命空狀態，防止非同步回傳前畫面停留於前一標的。
- 針對美股市場標的，強制生成符合 Honest Empty State 之集保物件（`concentrationBadge: '美股不適用'`, `emptyMessage: '美股無集保機制 (採 13F 機構申報)'`）。

### 3.2 模組 2：量化決策核心引擎擴充 (`src/engine/aiForceDashboardEngine.ts`)
- 擴充 `DynamicSignalsData` 型別定義：
  - 新增 `compositeScore: number` (0~100 綜合量化分)。
  - 新增 `verdictLight: 'GREEN' | 'YELLOW' | 'RED'`。
  - 新增 `regulatoryBadge?: string` (交易所監理標籤，如「處置 5分盤」)。
  - 新增 `brokerMarginAlert?: string` (券商維持率/浮額警示)。
  - 新增 `vwapBiasStdText?: string` (法人 VWAP 標準差乖離，如 `-1.8σ 超跌`)。
  - 新增 `actionableAdvice: string` (白話情境化操作指引)。
  - 新增 `keySupportPrice?: number` (關鍵防守支撐價)。
  - 新增 `keyPressurePrice?: number` (轉強壓力價)。
- 新增純計算函式 `calculateDynamicSignalsMultiPerspective(...)`：
  - 輸入日 K 陣列、法人記錄、處置狀態、當沖與融資數據。
  - 輸出包含四重視角欄位之完整信號物件。

### 3.3 模組 3：動態信號卡片重構 (`src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`)
- 淘汰硬編碼紅燈，依據 `data.verdictLight` 渲染動態呼吸光暈燈號。
- 畫面重構為階梯式資訊流：
  - **頂部**：綜合燈號徽章 + 綜合量化評分進度條（0~100）。
  - **核心條目**：趨勢、籌碼、動能、風險（附帶動態顏色與 Tooltip）。
  - **專業微觀層**：交易所監理標籤（注意/處置）與券商融資警戒標籤。
  - **法人與戰略指引層**：VWAP 主力偏離度、關鍵支撐/壓力價位、以及一語破的之【AI 決策情境解析】。

### 3.4 模組 4：TDCC 集保卡片容錯與空狀態增強 (`src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`)
- 優化空狀態渲染區塊，當 `history.length === 0` 或 `isEmpty: true` 時，展示友善毛玻璃說明框與「每週五盤後結算」提示。
- 針對新上市未滿一週或非台股標的，杜絕繪製預設座標軸或空白折線。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC 1：Card 19 標的切換即刻卸載與重置驗證**
  - 使用者由標的 A（如 0050 或 2344）切換至標的 B（如 2330）時，Card 19 畫面立即卸載標的 A 之數值與圖表，不產生舊數據殘留。
  - 組件 DOM 具備 `key={symbol}` 特性，保證元件狀態完全隔離。
- [ ] **AC 2：Card 19 美股與空數據 Honest Empty State 驗證**
  - 當查詢美股標的（如 AAPL、NVDA）時，Card 19 明確顯示「美股無集保機制 (採 13F 機構申報)」，不發生破版或計算錯誤。
  - 當查詢尚無 TDCC 資料之台股標的，顯示「集保數據累積中 (週五盤後結算)」。
- [ ] **AC 3：Card 12 動態燈號與顏色即時連動**
  - 綜合量化分 $\ge 60$ 時顯示綠燈（偏多/安全，綠色光暈）。
  - 綜合量化分 $40 \sim 59$ 時顯示黃燈（觀望/中性，黃色光暈）。
  - 綜合量化分 $< 40$ 時顯示紅燈（偏空/高風險，紅色光暈），徹底根除硬編碼純紅燈。
- [ ] **AC 4：Card 12 整合交易所與券商標籤**
  - 當標的處於處置狀態時，顯示「⚠️ 處置股票 (分盤撮合)」。
  - 當當沖率或融資出現背離時，顯示券商風控警示。
- [ ] **AC 5：Card 12 多空矛盾情境智能仲裁驗證**
  - 模擬「趨勢破線偏空 + 籌碼高度集中 + 動能超跌」情境，AI 指引精準輸出為「洗盤破底翻觀察區，建議觀望勿殺低，待站回均線轉強」，並給出關鍵防守價。
- [ ] **AC 6：全套單元測試與型別健全性**
  - 擴充 `DynamicSignalsCard.test.ts` 與 `TdccDistributionCard.test.ts`，100% 通過 Vitest 測試。
  - `npm run build` 0 個 TypeScript 錯誤。

---

## 5. 測試規劃 (Test Plan & TDD Seams)

1. **單元測試縫隙 1：`calculateDynamicSignalsMultiPerspective` 演算法測試**
   - 驗證四種多空矛盾型態之仲裁文字輸出與燈號對應。
   - 驗證綜合量化分在邊界值（0、40、60、100）之燈號映射。
2. **單元測試縫隙 2：`TdccDistributionCard` 渲染生命週期與空狀態測試**
   - 驗證傳入不同標的時，數值與 Y 軸極值計算之隔離性。
   - 驗證美股市場空狀態與台股無資料空狀態。
3. **整合測試縫隙 3：`AiForceDashboardView` 標的切換聯動測試**
   - 模擬由 `0050` 切換至 `2330`，斷言傳入 Card 19 與 Card 12 之 props 已完全更新為最新標的數據。
