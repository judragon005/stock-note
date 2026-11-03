# Spec 0214: 肌肉書僮·動能雷達全量進化、量化風控防禦與無重複模組化重構規格 (Muscle Booker Momentum Radar Full-Spectrum Evolution Spec)

## 1. 概述 (Overview)

本規格針對「肌肉書僮·動能雷達 (`MuscleBookerWorkspace` & `muscleBookerEngine`)」進行深度全量進化、量化風控補強與架構解耦重構。
本設計綜合了 **肌肉書僮 (波段實戰交易員)**、**機構法人 (Buy-side PM & Quant)**、**實戰投資者 (Active Trader)** 與 **長期開發金融軟體團隊 (Senior Architect)** 的四維聯審共識。

遵循 **KISS 原則 (Keep It Simple, Stupid)** 與 **防禦性開發 (Defensive Development)**，**堅決拒絕過度工程化，深度復用專案內成熟模組（`omniIndicatorEngine`、`volumeProfileEngine`、`dualMomentumEngine`、`forensicRadarEngine`），不重複造輪子**。徹底解決「虛胖風益比幻覺」、「靈魂指標缺失」、「持股防守警報真空」、「2,464 行巨型上帝組件」與「50 次 Re-render 渲染掉幀」等重大歷史技術債。

---

## 2. 核心痛點與根本病因分析 (Root Cause Analysis)

### 2.1 靈魂指標缺席與偽實現 (Fake/Omitted Indicators)
* **現象**：
  1. 宣傳與文檔中強調的「OBV 能量潮驗證真金白銀」與「MACD 0 軸以上多頭主控」，在目前的引擎中**完全零引用**。
  2. 均線扣抵望遠鏡僅用當前價格與 20 天前的單日價格相比，未預判未來 3～5 天扣抵高低價區的均線引力；當未來幾天即將扣抵歷史天價時，均線即將暴力下彎壓頂，系統卻誤判為翻揚並發出 BUY 訊號。
  3. 未檢驗上方分價量表密集成交套牢量峰，突破箱頂後上方立即面臨沉重解套賣壓，容易誘騙投資人接刀。
  4. 缺乏 11 天時間停損追蹤，無法防禦散戶「資金被卡死、凹單到爆」的反模式。

### 2.2 量化期望值模型陷阱 (Near-Zero Denominator Fallacy)
* **現象**：
  突破箱頂 0.1 元時，停損價死板設在箱頂，分母 $\text{Risk} = \text{Price} - \text{StopLoss}$ 趨近於 0，而分子 $\text{Reward}$ 採用固定對稱測幅或硬性 8% 兜底，導致計算出的風益比虛胖至 **16.0R ~ 20.0R**。
* **病因**：
  缺乏動態最小防守緩衝，實盤中隨便一個日內造市正常波動（Noise）或 1 檔跳動即被掃損出場。看似超高 R 倍數，實質勝率 $P_{win} \to 0$，期望值為負。且目標價脫離近 60 日歷史高點現實。

### 2.3 實戰交易防守警報真空 (Defense Blindspots)
* **現象**：
  1. 股票突破箱頂進場後，隔日若跌回箱內（假突破），系統僅變回 `INSIDE_BOX`，操盤動作判定為 `HOLD (區間觀望)`，導致投資人眼睜睜看著獲利回吐轉為大幅套牢。
  2. 引擎計算了 `calculateAtrTrailingDefense`，但在動作矩陣中**完全未被調用**，波段利潤缺乏 ATR 移動防守保護。
  3. 列表中缺乏當日漲跌幅 (%)、距防守線安全緩衝值 (Buffer %)、以及量能放大倍數 (Volume Ratio)，無法秒級輔助盤中決策；且無代碼一鍵複製與 OmniInspector 跳轉按鈕。

### 2.4 上帝組件與重複渲染壞味道 (God Component & Render Waterfall)
* **現象**：
  1. `MuscleBookerWorkspace.tsx` 長達 **2,464 行、115KB**，混雜非同步並發排程、IDB 讀取、成分股探針、自選股 CRUD 與四套看板渲染。
  2. 組件內部拷貝貼上渲染了 **7 處高度重複的股票卡片 UI**（重複率 > 80%），修改一處防守價顯示需改 7 處。
  3. 50 檔標的背景回補時，每完成一檔即觸發一次全頁面 State 更新，導致 **50 次密集 Re-render 瀑布**，11 個衍生陣列反覆計算，造成 CPU 負載驟升與畫面卡頓。
  4. 通用指標庫 `technicalIndicatorEngine.ts` 反向引用業務專用庫 `muscleBookerEngine.ts`，且手寫重複的 SMA 邏輯。

---

## 3. 詳細技術規格 (Technical Specifications)

### 3.1 引擎層量化模型與真實期望值重構 (`muscleBookerEngine.ts`)

#### 1. 修復真實風益比計算 (消除微小分母幻覺)
- 引入**動態最小風險緩衝 (Min Risk Buffer)**，分母不得小於現價的 2% 或 1 倍 ATR14：
  $$\text{EffectiveRisk} = \max(\text{StructuralRisk}, \max(\text{CurrentPrice} \times 0.02, \text{ATR14} \times 1.0))$$
- 目標價引入近 60 日高點結構壓制：
  $$\text{TargetPrice} = \min(\text{Lookback60High}, \text{MeasuredMoveTarget})$$
  （若現價已高於 60 日高點，則使用測幅目標）。

#### 2. 連線專案既有指標庫 (復用 `omniIndicatorEngine.ts`)
- 直接復用 `calculateOBV(closes, volumes)` 與 `calculateMACD(closes)`：
  - **MACD 0 軸主控檢驗**：買進先決條件需滿足 `macd.macdHist >= 0 || macd.dif12_26 >= 0`（多頭控盤架構）。
  - **OBV 資金流檢驗**：`obv.trend !== 'FALLING'`，排除放量價跌或量價背離之假突破。

#### 3. 升級均線扣抵時空望遠鏡
- 廢除單日 `candles[len-21]` 比對，改為未來 3 日扣抵陣列均值比對：
  - 抓取 `[candles[len-21], candles[len-20], candles[len-19]]`。
  - 只有當現價高於未來 3 天即將扣抵的最高價格時，確立均線具備「持續助漲動能」(`ma20Slope: 'UP'`)；若未來 3 天扣抵高價區且現價低於扣抵價，則標記為 `ma20Slope: 'DOWN'`（均線反壓）。

#### 4. 擴充三級防守矩陣 (Three-Tier Defense Action Matrix)
在 `evaluateMuscleBookerAction` 中納入持倉與波段防禦狀態：
1. **一級防守 (假突破跌回)**：若原先為突破買點，收盤跌破原箱頂（`currentPrice < boxUpper * 0.99`），動作觸發為 `SELL: 🔴 建議賣出 (假突破跌回箱內，保本離場)`。
2. **二級防守 (ATR 移動停利)**：股價自波段高點拉回，收盤跌破 `atrTrailingDefense.trailingDefensePrice`，動作觸發為 `SELL: 🔴 建議賣出 (跌破 ATR 移動防守線，獲利了結)`。
3. **三級防守 (破底清倉)**：收盤跌破箱底防守線，維持 `SELL: 🔴 建議賣出 (破底停損)`。

#### 5. 大盤體系與地雷股負向篩選 (連動 `dualMomentumEngine` & `forensicRadarEngine`)
- **大盤 Regime 多空閘門**：
  - 讀取基準大盤指數（TW: `0050.TW`, US: `SPY`）之 20MA/60MA 狀態或 `dualMomentumEngine` 之 `safeHavenTriggered`。
  - 當大盤處於空頭或避險觸發時，個股買進門檻自適應提高至 **3.0R**，且必須滿足 `rsRank === 'EXTREME_STRONG'`（逆勢抗跌領先股），否則強制降級為 `HOLD: 🟡 觀望 (大盤偏空，等待好買點)`。
- **鑑識防雷負向排除**：
  - 若標的在本地財報庫有數據且被判定為 `severity === 'DANGEROUS'`，強制覆寫決策為 `AVOID: ⛔ 鑑識雷達示警 (財報造假風險，絕對禁買)`。

---

### 3.2 實戰交易員 UX 與 HUD 戰情儀表板升級

#### 1. 收斂為「雙層戰情架構 (Two-Layer HUD Layout)」
- **第一層：頂部作戰指揮所 (Action HUD)**：
  - 整合「Top 3 今日買進先鋒」與「在庫賣出停損看板」，以高資訊密度橫向排列，醒目提示今日最急迫的操作動詞。
- **第二層：動能實戰矩陣清單 (Radar Matrix Board)**：
  - 合併三色導航儀與四象限看板，消滅同一標的重複出現 3 次的混亂。
  - 提供快速篩選膠囊：`[ 全部 (N) ]`、`[ 🟢 建議買進 (X) ]`、`[ 🟡 區間觀望 (Y) ]`、`[ 🔴 建議賣出 (Z) ]`。

#### 2. 補齊盤中關鍵量價數據
在卡片與表格上直接暴露：
- **當日漲跌點數與幅度 (%)**：色彩語意標註（台股紅漲綠跌/美股綠漲紅跌自適應）。
- **距離防守線安全緩衝值 (Buffer %)**：`((現價 - 防守價) / 現價) * 100%`。當 `Buffer% <= 1.5%` 時閃爍紅色警報 `⚠️ 瀕臨防守線 (-1.2%)`。
- **量能放大倍數 (Volume Ratio)**：當日成交量 / 5日均量。`Vol Ratio >= 1.5` 標記 `🔥 爆量攻擊`，`< 0.8` 標記 `❄️ 窒息量`。

#### 3. 下單連動與摩擦消除
- 標的代碼旁掛載 **一鍵複製代碼按鈕 (Click-to-Copy)**，點擊後彈出輕量綠色 Toast `已複製代碼`。
- 每檔標的掛載 **快捷跳轉按鈕組**：
  - `[透視]`：一鍵開啟專案既有之 `onOpenOmniInspector(symbol, market)`。
  - `[圖表]`：另開分頁直通 TradingView / Yahoo 股市 K 線圖。

---

### 3.3 架構重構與組件解耦藍圖 (`src/components/muscleBooker/`)

#### 1. 單一職責組件拆分 (KISS 原則)
主檔案壓降至 200 行以內，將功能拆分至專業子組件：
```
src/components/muscleBooker/
├── MuscleBookerWorkspace.tsx      <-- [主容器] 保持既有公開介面與 Props (~180 行)
├── hooks/
│   ├── useMuscleBookerSync.ts     <-- [非同步資料流] IDB 批次讀取、並發回補、批次節流更新
│   └── useMuscleBookerFilter.ts   <-- [篩選與衍生] 標的池切換、風益比排序、在倉交叉過濾
└── subcomponents/
    ├── MuscleStockCard.tsx        <-- [核心共用卡片] 統一 7 處重複渲染邏輯 (~220 行)
    ├── MuscleBookerHeader.tsx     <-- 頂部導航、搜尋列、自選股 CRUD
    ├── ActionDirectivesHUD.tsx    <-- 今日核心作戰指令 (Top 3 買進先鋒 vs 在庫停損)
    ├── TrafficLightMatrix.tsx     <-- 三色實戰操盤導航儀 (買進/觀望/賣出)
    ├── DarvasQuadrantGrid.tsx     <-- 四大象限動能看板
    └── DeductionTelescopeTable.tsx<-- 均線扣抵望遠鏡數據表格
```

#### 2. 消滅 7 處拷貝貼上：抽取共用卡片 (`MuscleStockCard.tsx`)
- 統一封裝現價、防守價、風益比、漲跌幅、Buffer%、量比、一鍵複製與 OmniInspector 跳轉。
- 支援受控/非受控的 `isExpanded` 局部展開，徹底消滅 1,000+ 行重複代碼。

#### 3. 解決 50 次 Re-render 瀑布：批次節流更新 (`useMuscleBookerSync.ts`)
- 將逐檔回補的頻繁 `setState` 改為批次收集，每 5 檔或每 300ms 批次更新一次快取映射表。
- 初次快取檢查改用 `Promise.all` 批次查詢 IndexedDB，將初次加載耗時縮短至 20ms。

#### 4. 理順相依方向與清理技術債
- 修正 `technicalIndicatorEngine.ts` 反向引用 `muscleBookerEngine.ts` 的架構壞味道，統整移動平均 (SMA) 函數。
- 移除硬編碼的 `s !== '3175'` 髒資料清洗，改由通用無效代碼過濾器處理。

---

## 4. 驗收標準 (Acceptance Criteria)

1. **AC-1 (量化期望值模型驗收)**：
   - 突破箱頂買進標的之風益比分母嚴格受到 `minRiskBuffer` 保護，杜絕 10R~20R 虛胖分母數值；目標價受近 60 日歷史高點壓制。
2. **AC-2 (靈魂指標與大盤多空連動驗收)**：
   - 買進決策需通過 MACD 0 軸主控與 OBV 非下降趨勢檢驗；大盤處於空頭下彎時，買進門檻自適應提高至 3.0R 且需 RS 極強。
3. **AC-3 (防守警報完備性驗收)**：
   - 突破後跌回箱頂以下時，動作精準發出 `SELL (假突破跌回箱內)`；跌破 ATR 防守線時發出 `SELL (ATR 移動停利)`。
4. **AC-4 (架構與效能指標驗收)**：
   - `MuscleBookerWorkspace.tsx` 檔案大小由 2,464 行降至 250 行以內；共用卡片 `MuscleStockCard.tsx` 100% 替換 7 處重複渲染。
   - 50 檔標的背景同步期間，全頁面 Re-render 次數控制在 3 次以內，滑動流暢度達 60fps。
5. **AC-5 (公開契約與測試全綠驗收)**：
   - `MuscleBookerWorkspace` Props 保持 100% 相容。
   - 既有 35 個單元測試 100% 通過，並補齊新增之風益比緩衝、OBV 檢驗、ATR 移動防守與扣抵望遠鏡測試，TypeScript 0 錯誤。

