# 規格書 0199：戰情室第二列自適應高度、卡片 21 歷史估值分位數矩陣與中介層自動熱載規範 (Spec 0199)

## 1. 摘要與目標 (Executive Summary & Objectives)

本規格書旨在針對戰情室 Layer 6（卡片 10·13、12、21、14）進行垂直佈局自適應改造，並以法人實戰數學模型重新定義「21 號估值與殖利率量化矩陣」，同時從架構底層根治 Vite Dev Server 在 24 小時全年無休運作下的中介層程式碼脫鉤問題。

核心目標：
1. **解除固定高度限制**：將戰情室第二列高度由原固定 `295px` 提升至 `minHeight: '315px'`，四張卡片啟用 Flex 垂直彈性空間自適應分佈，徹底消除擁擠窒息感與截斷風險。
2. **根治中介層重啟脫鉤 (24/7 Long-running Resilience)**：在 `vite.config.ts` 與中介層核心實作自動快取失效（Cache Invalidation）與檔案變更即時重載，終身免手動重啟終端機。
3. **機構級歷史估值分位數矩陣 (Institutional Valuation Percentile Rank)**：廢除全市場一刀切的靜態 PE 判定，改採標的自身歷史長期的本益比/股價淨值比數學分位數（Percentile Rank）與倍數區間（Min / Median / Max），並具備景氣循環/虧損股 PB 自動防禦切換。
4. **單季高價值財務情報自適應渲染**：利用拉高後的垂直空間，在卡片 21 渲染單季 EPS、毛利率與營業利益率，形成完整的量化估值閉環。

---

## 2. 第一性原理架構與問題診斷 (Root Cause & First Principles)

### 2.1 Vite 51 小時長開脫鉤機制
- **機制**：Node.js 原生 `require()` 具備強快取機制（`require.cache`）。開發伺服器啟動後，即使磁碟上的 `.cjs` 中介層程式碼已被編輯，運作中的記憶體依然參照舊模組。
- **解法**：在 Vite 的 `configureServer` 中將 `scripts/market-sync/` 列入監聽，並在開發請求時動態清理該目錄的 `require.cache`，或透過熱模組重新載入，達成「存檔即生效」。

### 2.2 法人估值相對論 vs 靜態絕對論
- 每一檔個股的商業模式、獲利能力、成長爆發力皆不同：
  - 華星光 (4979) 的市場溢價倍數不能套用大同 (2371) 或台塑 (1301) 的標準。
  - 必須統計該標的自身在過去日 K 與日估值中的數列分佈，計算出當前 PE/PB 處於該股歷史的百分位數。
- **數學模型**：
  $$PR = \frac{\text{Count}(PE_{\text{hist}} < PE_{\text{curr}})}{N_{\text{total}}} \times 100\%$$
  - $PR \le 20\%$：自身歷史低估區間（`UNDERVALUED`，便宜綠燈）
  - $20\% < PR \le 80\%$：自身歷史合理常態（`FAIR`，合理黃燈）
  - $PR > 80\%$：自身歷史高估過熱（`OVERVALUED`，偏貴紅燈）
  - **防禦邊界**：若當前 $PE \le 0$ 或無有效 PE（虧損期），自動切換為 PB Percentile 計算。

---

## 3. 系統架構與變更清單 (System Architecture & Modifications)

### 3.1 檔案變更矩陣

| 檔案路徑 | 變更性質 | 變更職責說明 |
| :--- | :--- | :--- |
| `vite.config.ts` | 增強 | 監聽 `scripts/market-sync` 變更並對中介層實施熱模組即時重新加載 |
| `scripts/market-sync/vite-market-middleware.cjs` | 增強 | 確保 `/api/market/history/:symbol` 每次查詢皆能精準抽取 `valuation` 與歷史數列 |
| `src/types/aiForceDashboard.ts` | 擴充 | `ValuationMetricsData` 新增 `pePercentile`, `peMin`, `peMedian`, `peMax`, `pbPercentile`, `historySampleSize` 欄位 |
| `src/engine/aiForceDashboardEngine.ts` | 核心增強 | 實作 `calculateValuationPercentile()` 演算法，將歷史樣本動態轉譯為機構分位數與位階判定 |
| `src/components/aiForceDashboard/AiForceDashboardView.tsx` | 佈局優化 | 第二列容器升級為 `minHeight: 315px`，四卡統一 `height: 100%` |
| `src/components/aiForceDashboard/cards/ValuationMetricsCard.tsx` | 視覺與資料重構 | 渲染歷史倍數區間 (Min / Med / Max)、分位點光譜條與單季財報 (EPS/毛利) |
| `src/components/aiForceDashboard/cards/EnergySentimentTwinCard.tsx` | 佈局優化 | 垂直空間均勻分佈，拉伸呼吸感 |
| `src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx` | 佈局優化 | 提高文字行高與底部燈號間距，自適應拉伸 |
| `src/components/aiForceDashboard/cards/AiConfidenceCard.tsx` | 佈局優化 | 5 條信心進度條自適應間距，均勻分佈 |

---

## 4. 模組規格與詳細邏輯 (Module Specifications)

### 4.1 估值歷史分位數演算法 (Valuation Percentile Algorithm)
```typescript
export interface ValuationDistributionResult {
  currentPe?: number;
  peMin?: number;
  peMedian?: number;
  peMax?: number;
  pePercentile?: number; // 0 ~ 100
  currentPb?: number;
  pbMin?: number;
  pbMedian?: number;
  pbMax?: number;
  pbPercentile?: number; // 0 ~ 100
  valuationTier: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';
  valuationTierText: string;
  sampleCount: number;
}
```
1. 收集該標的歷史有效 PE 數列（排除 $\le 0$ 與 null）。
2. 計算 `Min`、`Median`（中位數）、`Max` 與當前數值的百分位數。
3. 若有效 PE 樣本不足（如轉機股/虧損股），則對有效 PB 數列執行相同計算。
4. 依據百分位數賦予 `valuationTier` 與直觀中文描述（例如：「歷史偏低 (PR 15%)」、「歷史合理 (PR 54%)」、「歷史高估 (PR 88%)」）。

### 4.2 卡片 21 UI 佈局規範 (Card 21 Architecture)
- **頂部**：[21] 估值與殖利率量化矩陣 + [歷史分位數徽章：例如「歷史合理區間 (PR 54%)」]。
- **核心指標三宮格**：PE / PB / 殖利率（美股顯示 Forward PE / 扣除 30% 稅後殖利率；ETF 顯示折溢價與總費用率）。
- **法人倍數分佈條 (Institutional Band)**：
  - 展示文字：`歷史區間: 15.2x (低) — 28.5x (中位) — 48.0x (高)`。
  - 三段進度條高亮當前歷史分位點（20% 以下綠、20%~80% 黃、80% 以上紅）。
- **最新單季獲利基石**（若有單季數據）：
  - 膠囊徽章顯示：`2024Q3 EPS: 2.15元`、`毛利率: 45.2%`、`營利率: 22.8%`。
- **頁尾**：標註資料來源與基準日。

---

## 5. 測試驗收條件 (Acceptance Criteria & Test Seams)

1. **單元測試 (TDD 100% 綠燈)**：
   - `aiForceDashboardEngine.test.ts`：驗證 `calculateValuationPercentile` 演算法在正常股、高本益比股、虧損轉機股的正確性。
   - `ValuationMetricsCard.test.ts`：驗證傳入歷史倍數區間與單季財報時，卡片正確渲染且無任何 HTML 標籤錯誤。
   - `AiForceDashboardView.test.tsx`：驗證第二列高度樣式包含 `minHeight: 315px`。
2. **中介層熱重載驗收**：
   - 驗證修改中介層代碼後，不重啟 Vite 伺服器即可直接回傳最新 JSON 結構。
3. **實機渲染驗收**：
   - 4979 華星光在戰情室能立即顯示真實 PE、PB、殖利率與自身歷史倍數評估，徹底告別 `--`。
