# 0220 Spec: 第二梯隊架構技術債清理與算法優化規格書 (WarRoom 狀態抽取與估值河流二元搜尋)

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0220
* **標題：** 第二梯隊架構技術債清理與算法優化 (Technical Debt Batch 2: WarRoom Portfolio Metrics Hook Extraction and Valuation River Binary Search Optimization)
* **目標版本：** v9.15.0
* **關聯 Issue：** #466 (https://github.com/judragon005/stock-note/issues/466)
* **關聯技術債：**
  - [技術債 0055](file:///d:/APP/股票紀錄/docs/debts/0055-warroom-divergent-change-metrics-hook.md) (WarRoomWorkspace 龐大單體元件狀態抽取 useWarRoomPortfolioMetrics)
  - [技術債 0056](file:///d:/APP/股票紀錄/docs/debts/0056-valuation-river-candle-lookup-binary-search.md) (估值河流圖歷史收盤價匹配二元搜尋優化)
* **關聯架構決策：** [`docs/adr/0220-technical-debts-0055-0056-resolution.md`](file:///d:/APP/股票紀錄/docs/adr/0220-technical-debts-0055-0056-resolution.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-11-06

---

## 2. 背景與問題陳述 (Problem Statement)

在專案演進至 v9.14.0 (Spec 0219 全市場機構級個股投研與決策閉環) 後，我們識別出兩項屬於「第二梯隊」高性價比、直接提升維護性與運算效能的技術債：

1. **估值河流圖重複陣列拷貝與線性搜尋 (技術債 0056)**：
   - 在 [`AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx) 中，P/E 與 P/B 估值河流圖為了在歷史各季度結算日疊加真實歷史日 K 線收盤軌跡，使用：
     ```typescript
     const match = [...historicalCandles].reverse().find((c) => c.date <= r.periodDate);
     ```
   - 在渲染歷史 8~20 季資料時，每次渲染對每一個季度都進行全量陣列解構淺拷貝 `[...historicalCandles]` 與 `.reverse()` 反轉，產生無謂的 V8 GC 壓力，且單次反向搜尋複雜度為 $O(N)$，總查詢時間為 $O(M \times N)$。
2. **戰情室巨石元件發散式變化 (Divergent Change) 與風控邏輯耦合 (技術債 0055)**：
   - [`WarRoomWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/WarRoomWorkspace.tsx) 單體已達 2,372 行。
   - 其 L472～L580 混雜了 ETF 穿透曝險、美股加權成本匯率與匯差緩衝墊、質押借貸與擔保品現值、目標配置偏離度、半導體總曝險、斷頭耐受度與自由發射彈藥 (Free Ammo) 計算。
   - 當風控公式、扣除順序（未結算交割款、7日 DCA 承諾金）調整時，必須直接修改頂層龐大 UI 元件，缺乏無 DOM 依賴的獨立 Hook 單元測試，違反單一職責原則。

---

## 3. 核心設計原則 (Core Design Principles)

* **KISS 原則 (Keep It Simple, Stupid)**：
  - 拒絕過度工程化（如引入全域狀態庫 Zustand / Redux，或安裝外部 npm 演算法庫）。
  - 使用純粹的二元搜尋純函式與 React Custom Hook 完成精實重構。
* **零外部相依與零造輪子**：
  - 僅利用日 K 線自然依日期升序排序的特性，撰寫 15 行無副作用純函式。
* **零回歸保證 (Zero Regression)**：
  - 公開介面與計算輸出 100% 保持一致，既有 2,099 個測試完全綠燈。
* **測試驅動開發 (TDD)**：
  - 建立專屬單元測試 `binarySearch.test.ts` 與 `useWarRoomPortfolioMetrics.test.ts`，確保邏輯邊界極限覆蓋。

---

## 4. 詳細功能與架構規格 (Functional Specifications)

### 4.1 模組一：二元搜尋輔助函式與估值河流圖整合 (技術債 0056)

#### 4.1.1 純函式規格 (`src/utils/binarySearch.ts`)
```typescript
import { DailyCandle } from '../types/stock';

/**
 * 在依日期升序排序的日 K 線陣列中，以二元搜尋尋找小於或等於目標日期的最新交易日收盤價。
 * 時間複雜度：O(log N)，空間複雜度：O(1)，零陣列拷貝與反轉。
 * 
 * @param candles 升序排序的日 K 線陣列
 * @param targetDate 目標日期字串 (YYYY-MM-DD)
 * @returns 收盤價數值；若無符合或無日 K 線則回傳 null
 */
export function findLatestCloseBeforeDate(
  candles: DailyCandle[] | undefined | null,
  targetDate: string
): number | null;
```

#### 4.1.2 邊界條件處理
1. `candles` 為 `undefined`、`null` 或長度為 0 ➔ 回傳 `null`。
2. 目標日期早於所有 K 線之首日 (`targetDate < candles[0].date`) ➔ 回傳 `null`。
3. 目標日期晚於所有 K 線之末日 (`targetDate >= candles[candles.length - 1].date`) ➔ 直接回傳最後一根 K 線收盤價。
4. 目標日期恰好等於某交易日 ➔ 回傳該日收盤價。
5. 目標日期落在休市日（週末或國定假日）➔ 透過二分搜尋定位至嚴格小於目標日期的最大交易日，回傳其收盤價。

#### 4.1.3 `AnalysisMetricView.tsx` 整合
- 引入 `findLatestCloseBeforeDate`。
- 在 P/E 河流圖與 P/B 河流圖中，利用 `useMemo` 將各季度的歷史收盤價預先計算為 `quarterlyClosePrices`，不再於每次 JSX 渲染時對陣列進行拷貝與反轉。

---

### 4.2 模組二：WarRoom 投組指標狀態抽取 (`useWarRoomPortfolioMetrics`) (技術債 0055)

#### 4.2.1 自訂 Hook 介面規格 (`src/hooks/useWarRoomPortfolioMetrics.ts`)
```typescript
import { HoldingPosition, LoanRecord, TargetAllocationConfig } from '../types/stock';
import { LookThroughReport } from '../engine/lookThroughEngine';
import { PortfolioMacroShieldResult } from '../engine/portfolioMacroShield';

export interface UseWarRoomPortfolioMetricsParams {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
  pendingSettlementOutflowTwd?: number;
  dcaCommitment7dTwd?: number;
  rebalancingConfig?: TargetAllocationConfig;
  vix?: number;
}

export interface WarRoomPortfolioMetricsResult {
  lookThroughReport: LookThroughReport;
  shield: PortfolioMacroShieldResult;
}

export function useWarRoomPortfolioMetrics(
  params: UseWarRoomPortfolioMetricsParams
): WarRoomPortfolioMetricsResult;
```

#### 4.2.2 內部職責收斂
1. **ETF 穿透曝險**：調用 `calculateLookThroughExposure(holdings, usdToTwdRate)`。
2. **質押負債與擔保品計算**：彙整所有 `loanType === 'PLEDGE'` 之未償還總借貸台幣金額，以及關聯持倉市值。
3. **美股匯差緩衝墊**：針對美股部位計算加權買入成本匯率與未實現匯差損益 (`calculateHoldingFxBreakdown`)。
4. **目標配置偏離度**：若有傳入 `rebalancingConfig` 則計算最大資產配置偏離度 (`calculateAllocationDrift`)，若無則從 LocalStorage 讀取活動配置兜底。
5. **產業集中度**：提取台積電與半導體產業穿透總權重。
6. **質押壓力耐受度**：調用 `calculateMarginStress` 取得距 130% 斷頭線的耐受跌幅。
7. **全資產防禦護盾**：調用 `calculatePortfolioMacroShield`，產出包含維持率、槓桿率、自由發射彈藥 (Free Ammo) 之完整物件。

#### 4.2.3 `WarRoomWorkspace.tsx` 整合
- 移除 L472～L580 的手動計算區塊（約 110 行）。
- 直接呼叫：
  ```typescript
  const { lookThroughReport, shield } = useWarRoomPortfolioMetrics({
    holdings,
    loans,
    cashBalanceTwd,
    totalNavTwd,
    usdToTwdRate,
    pendingSettlementOutflowTwd,
    dcaCommitment7dTwd,
    rebalancingConfig,
    vix: macroSnapshot.vix,
  });
  ```
- 保持所有卡片視圖與 Modal 屬性傳遞 100% 不變。

---

## 5. 測試驅動開發 (TDD) 計畫

1. **Ticket 01 (Red ➔ Green)**:
   - 撰寫 `src/utils/binarySearch.test.ts`，覆蓋二元搜尋各項邊界。
   - 實作 `src/utils/binarySearch.ts`，使測試全綠。
2. **Ticket 02 (Refactor)**:
   - 修改 `src/components/analysis/AnalysisMetricView.tsx`，替換反向搜尋，確認原有 AnalysisMetricView 單元測試通過。
3. **Ticket 03 (Red ➔ Green)**:
   - 撰寫 `src/hooks/useWarRoomPortfolioMetrics.test.ts`，測試自由彈藥扣除、無負債維持率、美股匯差與穿透曝險。
   - 實作 `src/hooks/useWarRoomPortfolioMetrics.ts`，使測試全綠。
4. **Ticket 04 (Refactor)**:
   - 修改 `src/components/WarRoomWorkspace.tsx`，接入 Hook 並精簡程式碼，確保現有 WarRoom 相關測試通過。

---

## 6. 驗收標準 (Acceptance Criteria)

1. **算法與效能**：
   - 估值河流圖收盤價匹配時間複雜度降為 $O(M \log N)$，完全消除 `[...candles].reverse()` 陣列複製。
   - `binarySearch.test.ts` 具備 100% 覆蓋率。
2. **代碼整潔與解耦**：
   - `WarRoomWorkspace.tsx` 精簡 100+ 行純風控計算代碼，消除 Divergent Change 異味。
   - `useWarRoomPortfolioMetrics.test.ts` 獨立通過，不依賴 DOM。
3. **系統基線**：
   - 全專案測試維持 100% 通過（`npm test` 0 失敗）。
   - 全專案編譯維持 0 錯誤（`npm run build` 成功）。
4. **看板維護**：
   - `docs/debts/README.md` 看板將技術債 0055、0056 狀態更新為 `RESOLVED`。
