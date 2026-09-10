# PRD #0115: ETF 穿透透視、交易心理量化覆盤與跨券商對賬審計系統規格書

- **關聯技術債**：
  - [Debt #0024: ETF 穿透式成分股透視與產業因子集中度分析](file:///d:/APP/股票紀錄/docs/debts/0024-etf-look-through-and-sector-factor-concentration.md) (核心主體)
  - [Debt #0026: 交易行為心理學與情緒偏誤量化覆盤審查系統](file:///d:/APP/股票紀錄/docs/debts/0026-trading-behavioral-bias-and-psychology-audit.md) (強相關伴隨 1)
  - [Debt #0028: 跨券商持倉對賬審計與匯入衝突智能消解器](file:///d:/APP/股票紀錄/docs/debts/0028-multi-broker-reconciliation-and-smart-import-conflict-resolver.md) (強相關伴隨 2)
- **版本**：`v8.34.0`
- **狀態**：`READY_FOR_SPEC`
- **建立日期**：2026-09-10

---

## 一、問題陳述與真實情境故事 (Problem Statement & User Story Arc)

### 1. 使用者真實痛點情境故事 (The Story of Alex)

Alex 是一位注重資產配置的台灣投資人，他在富邦證券與國泰證券進行台股投資，同時使用 Firstrade 投資美股。隨著過去兩年的投資積累，他的投資組合逐漸擴大，但近來他遇到了三個令人極度焦慮且無法自拔的死角：

#### 場景一：自以為分散投資的「假性分散 (False Diversification)」危機
Alex 堅信「不要把雞蛋放在同一個籃子裡」。為了做好風險分散，他在台股買進了被視為國民 ETF 的 `0050`（元大台灣50）、ESG 主題的 `00923`（群益台ESG低碳50）、以及高人氣的 `006208`（富邦台50），同時因為看好半導體龍頭，他自己也定期定額買進 `2330 台積電` 零股，美股部位則買入了全球型的 `VT`。

在既有的股票紀錄系統中，持倉表格與資產樹狀圖 (Treemap) 將它們分為 5 個獨立方塊：
- 2330 台積電：佔比 15%
- 0050 元大台灣50：佔比 30%
- 00923 群益台ESG低碳50：佔比 20%
- 006208 富邦台50：佔比 15%
- VT 全球股票 ETF：佔比 20%

Alex 每次打開系統，看著五顏六色平均分佈的 Treemap，心裡總覺得自己的配置非常健康且分散。然而，當某天台積電因地緣政治傳聞單日重挫 6% 時，Alex 驚駭地發現自己的整戶總資產竟然跟著跳水將近 4.8%！

他拿起計算機一檔一檔拆算才恍然大悟：
- 0050 裡面有超過 56% 是台積電；
- 00923 裡面有超過 34% 是台積電；
- 006208 裡面有超過 56% 是台積電；
- VT 裡面台積電也是前十大持股。

**殘酷的真相是：Alex 的淨資產對「台積電單一公司」的實質總曝險竟然超過了 58%！半導體產業曝險甚至突破 70%！**
既有系統完全沒有「穿透式 (Look-Through)」透視能力，讓 Alex 長期活在「假性分散」的虛假安全感中，承擔了隨時可能被黑天鵝擊穿的集中度毀滅性風險。

---

#### 場景二：反覆折磨的交易心理盲區——「賺一點就跑、賠錢死命凹」
除了核心 ETF 存股外，Alex 也撥出 20% 資金進行台股短線動能交易。Alex 自認嚴守紀律，還在備註欄寫下買進理由與停損價位。

但每到季度回顧，他總是百思不得其解：**為什麼自己的勝率高達 68%，年度最終總結算卻是虧損的？**

真相隱藏在散戶最普遍的人性心理偏誤中：
1. **處置效應 (Disposition Effect)**：當股票上漲 5% 時，Alex 內心極度焦慮利潤回吐，平均抱了不到 4 天就匆忙獲利了結；但當股票跌破停損點時，Alex 卻開始自我合理化「這家公司體質很好，短線套牢轉長線存股」，結果虧損部位平均抱了超過 160 天，甚至在腰斬前死不認賠（截斷利潤、讓虧損奔馳）。
2. **FOMO 追高情緒進場**：他常常在各大財經論壇與社群瘋狂轉發「突破歷史新高」、「爆量起漲」的當天按耐不住追高買進。事後檢視，這些買在季線（60MA）正乖離 $> 15\%$ 的追高單，勝率低至慘不忍睹的 22%。
3. **過度交易的摩擦稅費吞噬**：他頻繁在不同熱門股之間進出，卻從未計算過累積的手續費與千分之三證交稅，不知不覺間吃掉了他將近 2.3% 的年化淨報酬率。

既有系統僅有冰冷的交易紀錄表格，完全缺乏「客觀量化心理偏誤與處置效應」的診斷鏡子，無法幫助 Alex 克服人性弱點。

---

#### 場景三：跨券商記帳後的「幽靈零股與對賬失真」
Alex 為了省手續費與領取股東會紀念品，在不同券商之間操作。他經常在國泰證券盤中分批下單零股（例如早上買 200 股、午盤買 300 股、尾盤買 500 股），晚上記帳時順手記了 3 筆買進流水。
然而，一個月後他從國泰證券後台匯出月對賬單 CSV 匯入系統時，券商的對賬單只顯示一筆匯總後的「買進 1000 股」。既有的重複檢查模組（`tradeDeduplicator`）因為指紋包含 `shares`，無法識別這是同日的拆合交易，結果把這筆 1000 股當作新交易匯入，導致系統庫存變成 2000 股！

更糟糕的是，面對除權息配發零股時間差或現金減資退款折讓，系統計算出來的持股股數，常與券商 App 當下實際庫存相差 3 股或十幾元。過去 Alex 唯一的辦法是「硬改以前的歷史交易」，但這一改就導致前年的已實現損益、稅務紀錄和 XIRR 全部大失真。

Alex 極度渴望能直接將券商 App 的「即時庫存快照」貼進來，系統自動逐檔比對差異，並自動生成一筆無損的「審計調整單 (ADJUSTMENT)」，在不破壞歷史真實紀錄的前提下，將數據完美校準平整。

---

## 二、解決方案願景 (Solution Vision)

本規格書提出**三大一體化高階金融量化架構**，徹底終結 Alex 的三大困境：

1. **ETF 穿透式成分股透視引擎 (Look-Through Engine - Debt #0024)**：
   - 內建台美核心主流 ETF（0050, 006208, 0056, 00878, 00919, 00923, 00713, SPY, QQQ, VT, VTI 等）之前十大與關鍵成分股權重庫。
   - 實作遞歸穿透聚合演算法，精準拆解「直接持股市值」與「各 ETF 間接穿透持股市值」，呈現底層企業與實質產業權重分佈。
   - 在 TreemapChart 提供一鍵切換「標的視圖」與「穿透透視視圖」，並針對單一企業穿透總曝險 $> 25\%$ 或單一產業 $> 50\%$ 自動點亮高亮警示邊框。

2. **交易行為心理與情緒偏誤量化覆盤引擎 (Behavioral Audit Engine - Debt #0026)**：
   - 自動量化計算處置效應強度：獲利部位平均持有天數 vs. 虧損部位平均持有天數、獲利實現比率 (PGR) 與虧損實現比率 (PLR)。
   - 結合歷史 K 線與 60MA 季線，自動審計買進日當天的「正乖離率」與「量能」，揭露「追高進場勝率 vs. 回檔冷靜進場勝率」的真實殘酷差距。
   - 精算年化週轉率與手續費/證交稅摩擦成本拖累率 (Friction Drag Rate %)，生成 AI 交易心理覆盤建議卡片。

3. **跨券商持倉對賬審計與衝突消解器 (Reconciliation & Smart Resolver - Debt #0028)**：
   - 支援「券商即時庫存快照對賬 (Holdings Snapshot Reconciliation)」：使用者可直接貼上或上傳券商庫存表格，系統自動逐檔比對，標記吻合、股數落差、系統多出或遺漏標的。
   - 增強交易去重模組，支援「同日零股分批拆合智能匹配 (Fuzzy Multi-Lot Matcher)」：自動識別 $\sum \text{零股} = \text{整股}$，提供一鍵合併消解。
   - 引入全新非侵入式 `ADJUSTMENT`（審計調整單）交易型別，差額一鍵平衡，絕不污染歷史不可變交易分錄與 XIRR。

---

## 三、詳細使用者故事 (User Stories)

### 模組 A：ETF 穿透式成分股透視 (Debt #0024)

1. **身為同時持有個股與 ETF 的投資人**，我希望在資產樹狀圖 (Treemap) 上方看到「標的視圖 / 穿透透視視圖」的切換按鈕，以便能隨時在「表面持有工具」與「底層實質公司」之間無縫切換。
2. **身為持有 0050 與 2330 的台股投資人**，我希望切換至穿透視圖時，系統能將 0050 中的台積電權重與我手動買進的 2330 股票市值精確累加，顯示我對台積電的「穿透真實總曝險金額」與「佔整戶 NAV 百分比」。
3. **身為美股與全球資產配置者**，我希望系統能同時穿透 VT、SPY、QQQ 等美股主流 ETF，讓我看清楚微軟 (MSFT)、蘋果 (AAPL)、輝達 (NVDA) 在我跨市場資產池中的真實穿透佔比。
4. **身為重視風險控制的投資人**，我希望當某家公司（例如台積電）的穿透總曝險佔比超過整戶資產的 25% 時，系統在穿透 Treemap 上以醒目的琥珀黃/緋紅霓虹警示邊框提醒我，避免不知不覺承擔過度集中風險。
5. **身為注重產業因子平衡的投資人**，我希望在穿透視圖中能查看「穿透產業因子甜甜圈圖/分佈清單」（資訊科技、金融保險、半導體、傳產、通訊服務、現金等），一眼看出我的產業曝險是否過度向科技業傾斜。
6. **身為想要深究 ETF 細節的使用者**，我希望點擊穿透視圖中的任一公司（如聯發科）時，能彈出詳細分解卡片，清楚列出「直接持有：$NT 100,000 (40%)」、「來自 0050：$NT 90,000 (36%)」、「來自 00923：$NT 60,000 (24%)」，讓我完全掌握數據來源。
7. **身為離線使用的使用者**，我希望主流 ETF 的前十大成分股數據預設內建於本地種子字典中，離線或冷啟動時 0 毫秒立即呈現，聯網時則可選擇性更新快取。
8. **身為持有未收錄小型 ETF 的使用者**，我希望在標的未收錄於官方字典時，系統能友善提示「此標的暫無官方穿透成分，已按母標的獨立計入」，維持圖表穩定不崩潰。

### 模組 B：交易行為心理學與情緒偏誤量化覆盤 (Debt #0026)

9. **身為常懷疑自己交易紀律的投資人**，我希望在交易紀錄或量化戰情室中擁有獨立的「🧠 交易心理與行為偏誤覆盤 (Behavioral Bias Audit)」工作區，檢驗自己的真實交易決策品質。
10. **身為受處置效應困擾的波段交易者**，我希望系統能統計並對比「獲利平倉批次的平均持有天數」與「虧損部位的平均持有天數」，量化呈現我是否有「賺錢急著賣、賠錢死命抱」的人性偏誤。
11. **身為量化交易愛好者**，我希望系統計算行為金融學經典指標 PGR (Proportion of Gains Realized) 與 PLR (Proportion of Losses Realized)，並給予「健康 (Healthy) / 輕度偏誤 (Moderate) / 嚴重處置效應 (Severe)」的客觀評級。
12. **身為容易被市場情緒影響的投資人**，我希望系統能檢核我所有買進日當天的 60MA 季線乖離率，標記出有多少筆交易是買在「季線正乖離 $> +15\%$」的極度過熱區。
13. **身為想提升進場勝率的交易者**，我希望系統能產出「追高進場勝率 vs. 回檔冷靜進場勝率」的對比數據矩陣，用客觀統計數字打醒我盲目追高的衝動。
14. **身為頻繁進出市場的短線交易者**，我希望系統能精確統計我歷年/特定期間累積的手續費與證交稅總額，並換算為「年化投報率拖累率 (Friction Cost Drag % on NAV)」，讓我知道自己為券商和國庫貢獻了多少無謂的摩擦成本。
15. **身為渴望進步的散戶**，我希望系統能根據我的診斷結果，動態生成 3~4 條直言不諱的「客觀交易心理改善建議」（例如：「您的虧損部位持有天數是獲利的 4.2 倍，請嚴格落實買進當下設定的停損價」）。

### 模組 C：跨券商持倉對賬審計與匯入衝突智能消解 (Debt #0028)

16. **身為使用多家券商（如富邦、國泰、Firstrade）的投資人**，我希望在資料管理或持倉頁面提供「📑 跨券商庫存對賬審計 (Reconciliation)」功能。
17. **身為需要核對真實庫存的使用者**，我希望能夠直接以文字貼上（如複製自券商網頁表格或 Excel）或匯入券商當天庫存 CSV，欄位只要包含代碼與股數即可啟動對賬。
18. **身為對賬中的使用者**，我希望系統能將對賬結果分類呈現：
    - 綠色：`完全吻合 (Matched)`
    - 黃色：`股數差異 (Shares Discrepancy)`（清晰標註：系統 1,000 股 vs 券商 1,005 股，差異 +5 股）
    - 藍色：`券商有持股但系統遺漏 (Missing in System)`
    - 灰色：`系統有持股但券商已平倉 (Orphaned in System)`
19. **身為分批買進零股的使用者**，當我匯入券商每日成交匯總單（如買進 1,000 股）時，若系統同日已存在該標的的多筆零股手動記錄（如 300+300+400 股），系統應智慧提示「檢測到同日零股拆合匹配」，並允許我選擇「✅ 合併消解 (Merge & Deduplicate)」，而不是重複插入 1,000 股。
20. **身為不希望竄改過去交易歷史的使用者**，當對賬確認存在微小股數或金額落差（如因除權息配發零股或減資折讓遺漏）時，我希望點擊「一鍵產生審計調整單」，系統自動生成一筆不可變的 `type = 'ADJUSTMENT'` 分錄，將持倉平滑校準為券商實際數值。
21. **身為重視投資報酬率準確度的使用者**，我希望 `ADJUSTMENT` 調整單在計算 XIRR 與已實現損益時，不會被誤算為巨大的外部出入金或虛假交易，保持所有財務量化指標嚴謹精確。
22. **身為重視隱私與防呆的使用者**，我希望所有的對賬比對與調整單生成完全在瀏覽器本地記憶體與 IndexedDB 完成，無需任何遠端傳輸，且提供預覽確認對話框以防止誤操作。

---

## 四、架構與實作決策 (Implementation Decisions)

### 1. 模組邊界與職責劃分

```
src/
├── data/
│   └── etfHoldingsData.ts             # 台美核心 ETF 成分股權重種子庫
├── engine/
│   ├── lookThroughEngine.ts           # 穿透式總曝險聚合演算法與集中度警示引擎
│   ├── lookThroughEngine.test.ts      # 穿透演算法單元測試 (TDD Seam 1)
│   ├── behavioralAuditEngine.ts       # 交易心理學 (PGR/PLR/乖離追高/摩擦成本) 診斷引擎
│   ├── behavioralAuditEngine.test.ts  # 行為金融診斷單元測試 (TDD Seam 2)
│   ├── reconciliationEngine.ts        # 跨券商庫存對賬、零股拆合匹配與調整單引擎
│   └── reconciliationEngine.test.ts   # 對賬與衝突消解單元測試 (TDD Seam 3)
├── types/
│   ├── lookThrough.ts                 # 穿透透視資料結構
│   ├── behavioralAudit.ts             # 行為心理診斷資料結構
│   └── reconciliation.ts              # 對賬審計資料結構
└── components/
    ├── TreemapChart.tsx               # 升級：支援視圖切換與穿透節點渲染
    ├── LookThroughDetailModal.tsx     # 新增：穿透成份與產業權重透視抽屜
    ├── BehavioralAuditWorkspace.tsx   # 新增：交易心理與處置效應量化覆盤工作區
    └── ReconciliationModal.tsx        # 新增：跨券商持倉對賬審計與衝突消解對話框
```

---

### 2. 核心資料模型與介面契約

#### (1) ETF 穿透透視資料模型 (`src/types/lookThrough.ts`)

```typescript
export interface ETFConstituent {
  symbol: string;               // 底層標的代碼 (如 2330, MSFT, AAPL)
  name: string;                 // 底層標的中文或通用名稱 (如 台積電, 微軟)
  weightPercent: number;        // 成分股佔該 ETF 權重 % (例如 56.2 表示 56.2%)
  sector: string;               // 產業分類 (如 '資訊科技', '半導體', '金融保險')
  country: 'TW' | 'US';
}

export interface ETFProfile {
  symbol: string;               // ETF 代碼 (如 0050, 00878, SPY, VT)
  name: string;
  market: 'TW' | 'US';
  asOfDate: string;             // 權重基準日 (如 '2026-06-30')
  topConstituents: ETFConstituent[];
}

export interface LookThroughExposure {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  sector: string;
  directMarketValue: number;    // 直接買進該個股之市值 (TWD)
  indirectMarketValue: number;  // 透過所持 ETF 間接持有之市值合計 (TWD)
  totalEffectiveValue: number;  // 實質總曝險金額 = 直接 + 間接 (TWD)
  portfolioWeightPercent: number;// 佔整戶 NAV 穿透百分比 %
  isConcentrationAlert: boolean;// 單一標的是否超過 25% 集中度警示門檻
  derivedSources: {
    etfSymbol: string;
    etfName: string;
    weightInETF: number;        // 該個股在該 ETF 的權重 %
    indirectValue: number;      // 該 ETF 貢獻的間接市值 (TWD)
  }[];
}

export interface SectorConcentration {
  sector: string;
  totalMarketValue: number;
  weightPercent: number;
  isConcentrationAlert: boolean;// 單一產業是否超過 50% 集中度警示門檻
}

export interface LookThroughReport {
  asOfDate: string;
  totalPortfolioNAV: number;
  exposures: LookThroughExposure[];
  sectorBreakdown: SectorConcentration[];
  topConcentratedRiskSymbol?: string;
}
```

#### (2) 交易心理量化模型 (`src/types/behavioralAudit.ts`)

```typescript
export interface DispositionEffectMetrics {
  avgHoldingDaysGain: number;       // 獲利平倉批次之平均持有天數
  avgHoldingDaysLoss: number;       // 虧損部位 (含浮虧) 之平均持有天數
  holdingDaysBiasRatio: number;     // 偏誤比率 = avgHoldingDaysLoss / avgHoldingDaysGain
  pgr: number;                      // 獲利實現比率 (Proportion of Gains Realized)
  plr: number;                      // 虧損實現比率 (Proportion of Losses Realized)
  severity: 'HEALTHY' | 'MODERATE' | 'SEVERE';
  diagnosisText: string;
}

export interface FOMOEntryAuditMetrics {
  totalBuyTradesCount: number;
  chasingHighTradesCount: number;   // 買在 60MA 季線正乖離率 > 15% 的筆數
  chasingHighRatio: number;         // 追高交易佔比 %
  chasingHighWinRate: number;       // 追高買進之最終獲利勝率 %
  calmEntryWinRate: number;         // 非過熱進場之最終獲利勝率 %
  alphaDragPercentage: number;      // 因追高導致的勝率減損點數
}

export interface FrictionCostMetrics {
  totalFeesPaid: number;            // 累計手續費 (TWD)
  totalTaxesPaid: number;           // 累計證交稅 (TWD)
  totalFrictionCost: number;        // 總摩擦成本
  annualizedTurnoverRate: number;   // 年化資金週轉率 %
  annualizedDragRatePercent: number;// 佔淨資產之年化侵蝕率 %
}

export interface BehavioralAuditReport {
  period: { startDate: string; endDate: string };
  disposition: DispositionEffectMetrics;
  fomo: FOMOEntryAuditMetrics;
  friction: FrictionCostMetrics;
  actionableInsights: string[];     // 客觀交易紀律覆盤建議清單
}
```

#### (3) 跨券商對賬與衝突消解資料模型 (`src/types/reconciliation.ts`)

```typescript
export type DiscrepancyType = 
  | 'MATCH'              // 完全吻合
  | 'DIFF_SHARES'        // 股數落差 (如手動漏記或除權配股)
  | 'MISSING_IN_SYSTEM'  // 券商有但系統無 (完全漏記)
  | 'ORPHAN_IN_SYSTEM';  // 系統有但券商無 (已在外部賣出但系統未平倉)

export interface BrokerSnapshotItem {
  symbol: string;
  broker?: string;
  shares: number;
  currentPrice?: number;
  marketValue?: number;
}

export interface ReconciliationDiscrepancy {
  symbol: string;
  broker: string;
  discrepancyType: DiscrepancyType;
  expectedShares: number;           // 系統依據歷史紀錄計算之股數
  actualShares: number;             // 券商快照實際回報股數
  diffShares: number;               // 差額 (actual - expected)
  expectedMarketValue: number;
  actualMarketValue: number;
  suggestedAction: 'AUTO_ADJUST' | 'MANUAL_INSPECT' | 'NONE';
}

export interface MultiLotMatchCandidate {
  date: string;
  symbol: string;
  aggregatedIncomingShares: number;
  matchingExistingTrades: TradeRecord[];
  isExactSumMatch: boolean;
}

export interface ReconciliationReport {
  timestamp: string;
  totalComparedSymbols: number;
  matchedCount: number;
  discrepancyCount: number;
  items: ReconciliationDiscrepancy[];
  splitLotMatches: MultiLotMatchCandidate[];
}
```

---

### 3. 核心演算法架構決策 (Core Algorithmic Decisions)

#### (1) 穿透式總曝險聚合演算法 (`lookThroughEngine.ts`)
- **輸入**：使用者當前所有活躍持倉 `HoldingPosition[]`、美股/台幣匯率 `usdRate`、ETF 權重字典庫 `ETFProfile[]`。
- **步驟**：
  1. 遍歷每檔持倉，按標的計價幣別折算為統一 TWD 市值。
  2. 若標的非 ETF（或未收錄於 ETF 字典），直接將其市值計入該標的的 `directMarketValue`。
  3. 若標的為收錄之 ETF，讀取其前十大成分股清單，將「該 ETF 持股市值 $\times$ 成分股權重」分配至各底層公司之 `indirectMarketValue`，並在 `derivedSources` 記錄貢獻來源。
  4. 計算各底層公司之 `totalEffectiveValue = direct + indirect` 與 `portfolioWeightPercent = totalEffectiveValue / totalPortfolioNAV`。
  5. 將非前十大成分股的剩餘權重歸類為「其他分散持股 (Diversified Others)」。
  6. 匯總產業類別市值，計算產業因子集中度。
  7. 觸發閾值檢驗：`portfolioWeightPercent > 25%` 或產業集中度 `> 50%` 時，標記 `isConcentrationAlert = true`。

#### (2) 交易心理處置效應與 FOMO 診斷演算法 (`behavioralAuditEngine.ts`)
- **步驟**：
  1. 篩選所有已實現交易（`type = 'SELL'`）搭配既有 `taxLotEngine` 的批次沖銷資訊：
     - 統計獲利賣出批次之持股天數，計算 $\text{AvgDays}_{\text{Gain}}$。
     - 統計虧損賣出批次之持股天數，計算 $\text{AvgDays}_{\text{Loss}}$。
  2. 納入當前未平倉浮動虧損批次（避免忽略死抱未賣的嚴重套牢部位）。
  3. 計算偏誤比率 $\text{BiasRatio} = \text{AvgDays}_{\text{Loss}} / \max(1, \text{AvgDays}_{\text{Gain}})$：
     - $\le 1.5$：健康 (`HEALTHY`)
     - $1.5 \sim 3.0$：輕度處置效應 (`MODERATE`)
     - $> 3.0$：嚴重處置效應 (`SEVERE`)
  4. 結合歷史價格資料庫，提取每次 `BUY` 交易日的 60 日均線（60MA），計算價格乖離率 $\text{Bias} = (P_{\text{buy}} - \text{MA}_{60}) / \text{MA}_{60}$：
     - 當 $\text{Bias} > +15\%$ 時標記為追高交易。
     - 統計追高交易的最終平倉勝率與未追高交易的勝率對比。
  5. 匯總手續費與證交稅，除以平均 NAV，年化得出摩擦成本拖累率。

#### (3) 跨券商對賬與無損調整單機制 (`reconciliationEngine.ts`)
- **零股拆合模糊除重**：
  若當天匯入一筆 `shares = S` 的交易，且本地現有記錄在同日、同標的、同市場中有多筆零股買進，且 $\sum s_i = S$，系統判定為「同日分批成交合單」，在對賬時予以標記匹配，避免重複計算。
- **無損審計調整單 (`TradeRecord.type = 'ADJUSTMENT'`)**：
  當使用者點擊「自動校準差異」時：
  - 若系統少計 $\Delta S$ 股，產生一筆：
    `{ type: 'ADJUSTMENT', symbol, shares: ΔS, price: 0, fee: 0, tax: 0, note: '系統對賬校準自動補平' }`
  - 若系統多計 $\Delta S$ 股，產生一筆：
    `{ type: 'ADJUSTMENT', symbol, shares: -ΔS, price: 0, fee: 0, tax: 0, note: '系統對賬校準扣減多餘股數' }`
  - 持倉引擎在累加總股數時將其納入，但成本基準計算引擎保持原始成本不變，確保歷史損益零失真。

---

## 五、測試決策與驗收縫隙 (Testing Decisions & Seams)

依據 TDD 與專案核心原則，測試只在最高公開介面縫隙 (Public Seams) 進行，嚴格杜絕測試內部實作細節：

### 1. 測試縫隙規劃 (Test Seams)

| 測試檔案 | 測試縫隙 (Test Seam) | 驗證外部行為重點 |
| :--- | :--- | :--- |
| `src/engine/lookThroughEngine.test.ts` | `calculateLookThroughExposure(...)` | 1. 0050 與台積電重疊持股加權累加正確性<br>2. 跨市場美股 ETF (VT, SPY) 穿透與匯率折算<br>3. 超過 25% 標的集中度與 50% 產業集中度警示判斷<br>4. 未收錄 ETF 之優雅降級回退機制 |
| `src/engine/behavioralAuditEngine.test.ts` | `calculateBehavioralAuditReport(...)` | 1. 處置效應 PGR/PLR 與平均持有天數偏誤比計算<br>2. 60MA 季線正乖離 $>15\%$ 追高交易識別與勝率矩陣<br>3. 年化週轉率與摩擦成本拖累率 (Friction Drag %)<br>4. 交易心理改善建議文字生成邏輯 |
| `src/engine/reconciliationEngine.test.ts` | `reconcileWithBrokerSnapshot(...)`<br>`detectMultiLotMatches(...)`<br>`generateAuditAdjustmentTrade(...)` | 1. 逐檔比對：完全吻合、股數落差、遺漏標的判定<br>2. 同日零股拆合模糊匹配 (300+300+400 = 1000)<br>3. `ADJUSTMENT` 調整單分錄生成格式與股數正負平衡<br>4. 調整單對總持倉與 XIRR 的相容性驗證 |

### 2. 測試先例 (Prior Art)
- `src/engine/quantEngine.test.ts` (量化指標計算測試規範)
- `src/engine/holdingPeriodEngine.test.ts` (持倉天數與批次時間差測試)
- `src/engine/tradeDeduplicator.test.ts` (去重指紋與狀態枚舉測試)
- `src/utils/treemap.test.ts` (幾何佈局與節點計算測試)

---

## 六、範圍界定 (Out of Scope)

為堅守 KISS 原則，以下項目**明確不在**本次 v8.34.0 開發範圍內：
1. **不即時抓取全市場數千檔 ETF 之全成分股爬蟲**：僅內建台美最核心主流之權值型與高股息 ETF 字典庫（覆蓋 85% 散戶持倉），非主流 ETF 採回退為獨立標的模式。
2. **不實施全自動券商 Open Banking API 直連**：台灣券商目前未開放個人帳戶 Open Banking 唯讀 API，對賬採「上傳/貼上 CSV 快照」半自動審計模式。
3. **不直接修改既有歷史不可變分錄**：對賬差異一律以 `ADJUSTMENT` 調整單處理，嚴禁程式自動竄改或刪除使用者的不可變歷史買賣分錄。

---

## 七、後續備忘 (Further Notes)

- 本 PRD 完成後，將由 `/to-tickets` 拆解為微小可驗收的獨立工單，並於 GitHub Issues 開立對應票券。
- 遵循專案之 GitHub ToS 與 PR 工作流，在專屬分支完成 TDD 綠燈後，統一合併並同步更新 `CONTEXT.md` 與 ADR。
