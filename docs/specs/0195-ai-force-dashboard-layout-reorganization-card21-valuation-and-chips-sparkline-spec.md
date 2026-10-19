# 0195 Spec: AI 主力戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline 規格書

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0195
* **標題：** AI 主力戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline 對稱對齊
* **英文標題：** AI Force Dashboard Layer 6 Twin-Tile Reorganization, Card 21 Valuation Metrics, and Card 15 Wide Sparkline Alignment
* **關聯架構決策：** `docs/adr/0195-ai-force-dashboard-layout-reorganization-card21-valuation.md`
* **規格狀態：** `APPROVED` (經 /grill-with-docs 深度壓力測試、雙市場對齊與防禦性調研完畢)
* **版本：** V1.0
* **建立日期：** 2026-10-19

---

## 2. 背景與問題陳述 (Problem Statement)

使用者於實際操作主力戰情室時，提出三項視覺佈局優化需求與驗證疑點，經深入調研後梳理出以下核心工程與金融痛點：

1. **照片 1：Card 19 (TDCC 集保千張大戶趨勢) 動態疑慮與美股廢卡缺陷**：
   - 使用者切換標的時，畫面顯示千張大戶 `64.64%`、總股東 `6,951` 人（實為預設標的 `0050` 於 2026-10-16 基準日之真實集保數據）。因缺乏明顯的「當前標的確認」與「每週五結算滯後性提示」，容易被誤判為靜態固定假圖。
   - 美股模式下，Card 19 直接退回灰色的 Honest Empty State，在美股市場毫無決策價值。
2. **照片 2：Layer 6 橫向排版浪費空間，缺乏核心基本面估值指標**：
   - 目前 Layer 6 採用 4 欄單卡平鋪（Card 10 多空能量棒、Card 12 主力動態信號、Card 13 市場情緒儀表板、Card 14 AI 信心維度）。Card 10 與 Card 13 皆為能量與情緒類型指標，各佔一整個寬幅欄位過於稀疏。
   - 系統欠缺投資人最關鍵的進場定錨維度：**本益比 (PE)、股價淨值比 (PB) 與現金殖利率**。
   - 使用者提議將 Card 10 與 Card 13 於欄 1 做上下堆疊，原 Card 13 的位置讓給全新估值指標卡。
3. **照片 2 隱藏的佈局與跨市場陷阱**：
   - **破版陷阱**：若簡單將 Card 10 與 13 上下堆疊，欄 1 高度將超過 320px，導致右側三欄被強行縱向拉長變形。
   - **美股情緒真空**：Card 13 目前寫死為「台股市場合情緒儀表板」，切換至美股時產生市場不一致。
   - **估值計算盲區**：一般個股遇負本益比（虧損股）會崩潰；遇 ETF（如 0050, VOO）無傳統 PE/PB 會出現 `N/A`；未考慮季配/月配年化處理；美股未提示台灣投資人 30% 股息預扣稅。
4. **照片 3：Card 15 (籌碼異動摘要) 中間資訊比例失衡**：
   - 目前中間排版為 3/4 (四大法人張數) : 1/4 (Sparkline 固定 80px)。右側走勢圖過小、波折縮成一團；左側文字區留白過多。使用者希望改為 **1/2 比 1/2**（等寬 50% : 50%）。
   - 美股模式下 Card 15 目前退化為純文字框，缺乏圖表對稱性。

---

## 3. 核心設計原則與防禦護欄 (Core Principles & Defensive Guardrails)

遵循 **KISS 原則 (Keep It Simple, Stupid)** 與 **雙市場零造假原則 (Zero-Mock Policy)**，100% 複用本地既有 SQLite 湖倉表，拒絕過度工程化：

### 3.1 Card 19 動態性確認與雙市場對稱護欄
* **台股模式 (TW)**：
  - 標題顯式綁定標的確認：`CARD 19 · {symbol} TDCC 集保趨勢`。
  - 整合 `tw_tdcc_distribution` 的 `under_10_ratio`，顯示散戶持股變動，達成大戶增持 vs 散戶退場的「籌碼剪刀差」判定。
* **美股模式 (US)**：
  - 標題切換為 `CARD 19 · 美股機構持股與放空籌碼 (13F & Short Float)`。
  - 三宮格對齊：`機構持股比 (%)`、`空單佔流通比 (Short Float %，>10% 警示)`、`內部人持股比 (%)`。
  - 以 SVG 堆疊長條呈現持股結構，徹底消除美股空白佔位。

### 3.2 Layer 6 雙子容器 (Twin-Tile) 緊湊堆疊護欄
* **欄 1 封裝**：將 Card 10 (AI 多空能量棒) 與 Card 13 (市場情緒) 包裝在同一卡片外框中。
* **等高對齊**：
  - 上半部 (120px)：Card 10 緊湊版多空能量棒（保留 20 日紅黑 K 能量比）。
  - 下半部 (130px)：Card 13 緊湊版情緒儀表。
  - 總高鎖定為 **`250px`**，與右側 Card 12、Card 21、Card 14 達成像素級 1:1 齊平，杜絕縱向破版。
* **Alpha 共振仲裁標籤**：
  - 在兩卡交界處提供微型判定標籤（如：個股強+大盤恐慌 ➔ `逆勢抗跌 (Alpha 領頭羊)`；個股弱+大盤貪婪 ➔ `拉指數出個股 (主力背離)`）。

### 3.3 Card 13 美股宏觀情緒激活 (Zero New Dependencies)
* 切換至美股時，Card 13 標題自動切換為 `13 美股宏觀情緒 (CNN Fear & Greed / VIX)`。
* 100% 讀取本地已有的 `macro_sentiment_daily` 資料表：
  - 指針角度直接映射 `cnn_fear_greed_score`。
  - 數值行切換為：`CNN 恐懼貪婪 (XX分)`、`VIX 恐慌指數 (XX.X)`、`10Y 美債殖利率 (X.XX%)`。

### 3.4 Card 21 估值與殖利率量化卡 (ValuationMetricsCard)
* **卡片編號**：定名為 **Card 21**，放置於 Layer 6 第 3 欄（原 Card 13 位置）。
* **自適應模式矩陣**：
  1. **台股一般個股**：
     - `盤中動態 PE (本益比)`：即時價連動基期 EPS 運算。
     - `PB (股價淨值比)`。
     - `年化現金殖利率 (%)`：季配×4、月配×12，附帶歷史三段位階條（低估 / 合理 / 偏高）。
  2. **美股一般個股**：
     - `Forward / TTM PE`、`PB`。
     - `實質現金殖利率`：標註台灣投資人扣除 30% IRS 預扣稅後之淨收益率。
  3. **高成長無盈利科技股 (PE 負值或 > 100)**：
     - 第一格自動切換為 **PS (股價營收比)**，避免負本益比破版。
  4. **ETF 標的 (0050, VOO 等)**：
     - 讀取 `etf_daily_nav` 表：第一格切換為 **即時折溢價率 (Premium %)**（溢價 > 0.5% 發出追價警告），第二格切換為 **年化殖利率**，第三格為 **總費用率/資產規模**。

### 3.5 Card 15 (籌碼摘要) 1/2 比 1/2 寬幅與美股微觀量價對稱
* **容器佈局**：由 `1fr auto` 重構為 `1fr 1fr` (各 50%)。
* **左側數值區 (50%)**：
  - `minWidth: 0`、`whiteSpace: 'nowrap'`，字體採用 `fontFamily: 'monospace'`。
  - 台股：外資、投信、自營商、三大法人合計（張數紅綠對齊）。
  - 美股：RVOL (相對均量比)、VWAP 偏離幅、MFI 機構量能評分、ATR 日振幅。
* **右側走勢區 (50%)**：
  - SVG 寬度自適應 100%，增加 **0 軸水平分水嶺基準線**（上方為買超/量增，下方為賣超/量縮）。
  - 頂部呈現連續性動態標籤（台股如 `投信連 3 買`，美股如 `機構量價增溫`）。

### 3.6 戰情室全域外聯提示詞中樞連動 (WarRoom Prompt Integration)
* 在 `createWarRoomPromptDigest.ts` 中，將 Card 21 之估值位階與 Card 13 之美股 CNN/VIX 宏觀情緒同步注入 Prompt Digest，確保一鍵匯出之戰情提示詞 100% 包含最新估值狀態。

---

## 4. 詳細架構與資料合約 (Data Contracts & Types)

### 4.1 TypeScript 型別擴充 (`src/types/aiForceDashboard.ts`)

```typescript
/**
 * 21 估值與殖利率量化卡資料模型 (Card 21, Spec 0195)
 */
export interface ValuationMetricsData {
  isEtf: boolean;
  isUsMarket?: boolean;
  // 一般個股欄位
  pe?: number;
  forwardPe?: number;
  pb?: number;
  psRatio?: number;
  dividendYield?: number;
  netDividendYieldUs?: number; // 美股扣除 30% 稅後實質殖利率
  valuationTier?: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED'; // 便宜 / 合理 / 偏高
  valuationTierText?: string;
  isLossMaking?: boolean;      // 是否處於虧損轉機期
  // ETF 自適應欄位
  etfPremiumDiscountRate?: number; // 折溢價率 (%)
  etfExpenseRatio?: number;        // 總費用率 (%)
  asOfDateText?: string;
  isEmpty?: boolean;
}

export interface AiForceDashboardReport {
  // ... 既有卡片保持 100% 向後相容
  valuationMetrics?: ValuationMetricsData; // 新增 Card 21 數據模型
}
```

### 4.2 佈局網格拓撲 (`AiForceDashboardView.tsx`)

```tsx
{/* Layer 6: 短線能量、市場情緒與估值矩陣 (Spec 0195: 4 欄等寬，高度精準鎖定 250px) */}
<div
  data-layer="6-energy-sentiment-valuation"
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '12px',
    alignItems: 'stretch',
    minHeight: '250px',
  }}
>
  {/* 欄 1: Twin-Tile 雙子容器 [Card 10 AI 多空能量棒] + [Card 13 市場情緒儀表板] */}
  <div style={{ minWidth: 0, height: '100%' }}>
    <EnergySentimentTwinCard
      bullBearData={report.bullBearEnergy}
      sentimentData={report.marketSentiment}
      market={market}
    />
  </div>

  {/* 欄 2: Card 12 AI 主力動態信號判斷 */}
  <div style={{ minWidth: 0, height: '100%' }}>
    <DynamicSignalsCard data={report.dynamicSignals} />
  </div>

  {/* 欄 3: Card 21 全新估值與殖利率量化卡 */}
  <div style={{ minWidth: 0, height: '100%' }}>
    <ValuationMetricsCard data={report.valuationMetrics} market={market} />
  </div>

  {/* 欄 4: Card 14 AI 信心維度 */}
  <div style={{ minWidth: 0, height: '100%' }}>
    <AiConfidenceCard data={report.aiConfidence} />
  </div>
</div>
```

---

## 5. 驗收標準 (Acceptance Criteria)

- [ ] **AC 1：Card 19 動態切換與雙市場對稱驗收**
  - 在台股模式切換標的（0050 ➔ 2330 ➔ 2317），Card 19 標題明確標示當前標的，數值與雙軸 SVG 圖表即時重算重繪。
  - 在美股模式（如 AAPL, TSLA），Card 19 正確呈現「美股機構持股與放空籌碼」，顯示機構持股%、空單佔流通比與堆疊結構圖，不再顯示空白。
- [ ] **AC 2：Layer 6 雙子容器 (Twin-Tile) 等高與 Alpha 共振驗收**
  - 欄 1 成功將 Card 10 與 Card 13 上下堆疊於同一容器，總高控制在 `250px` 左右，與欄 2、3、4 齊平。
  - 容器中段能依據個股多空與大盤情緒輸出「Alpha 共振標籤」。
- [ ] **AC 3：Card 13 美股宏觀情緒激活驗收**
  - 在美股模式下，Card 13 標題切換為「美股宏觀情緒」，半圓指針正確連動 CNN 恐懼指數與 VIX。
- [ ] **AC 4：Card 21 估值卡四態自適應驗收**
  - 台股個股：呈現 PE、PB、現金殖利率與三段式位階條。
  - 美股個股：呈現 PE/Forward PE、PB、扣 30% 稅後殖利率。
  - 虧損股/SaaS 股：無本益比時自動切換為 PS 比，無報錯崩潰。
  - ETF 標的：自動切換為折溢價率（溢價 > 0.5% 發出警戒）、費用率與配息率。
- [ ] **AC 5：Card 15 籌碼摘要 1/2:1/2 佈局與美股對稱驗收**
  - 中間排版嚴格為 50% : 50%。
  - 左側數值在窄視窗下字字對齊、不發生折行。
  - 右側 Sparkline 自適應 100% 展開，包含 0 軸水平虛線分水嶺與頂部動態結論標籤。
  - 美股模式下展示 RVOL、VWAP 偏離與機構量能走勢，徹底拔除純文字佔位。
- [ ] **AC 6：外聯提示詞與術語庫閉環驗收**
  - `TermTooltip` 補全 Card 21 之相關金融名詞。
  - `WarRoomPromptCard` 匯出之提示詞內包含估值指標與市場宏觀情緒。

---

## 6. 測試縫隙 (Test Seams) 與驗收計畫

1. **單元測試 (Unit Tests)**：
   - `src/components/aiForceDashboard/cards/ChipsSummaryCard.test.ts`：驗證 1/2:1/2 佈局與台美雙市場輸出。
   - `src/components/aiForceDashboard/cards/ValuationMetricsCard.test.ts`：驗證個股、虧損股、美股與 ETF 之四態自適應。
   - `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.test.ts`：驗證 Card 10 + 13 雙子容器在台美雙市場之排版與標籤。
2. **端到端與回歸測試 (E2E & Regression)**：
   - 執行 `npm test`，確保既有 20+ 個戰情室測試無破壞性損壞。
   - 執行 `npm run build`，確保 TypeScript 0 錯誤。
