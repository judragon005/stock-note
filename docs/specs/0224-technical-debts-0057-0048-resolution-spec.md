# 0224 Spec: Zavy 慢富模組代碼氣味清理、測試職責解耦與智策提示詞技術債閉環規格書 (Technical Debts 0057 & 0048 Resolution)

## 1. 概述與元數據 (Overview & Metadata)

* **規格編號：** Spec 0224
* **標題：** Zavy 慢富模組代碼氣味清理、測試職責解耦與智策提示詞技術債閉環 (Technical Debts 0057 & 0048 Resolution: Zavy Test Decomposition, Engine Helper Sinking, Credit Risk Localization and Prompt Digest Closure)
* **目標版本：** v9.17.0
* **關聯 Issue：** #500
* **關聯技術債：**
  - [技術債 0057](file:///d:/APP/股票紀錄/docs/debts/0057-zavy-workspace-test-decomposition-and-engine-helper-refactor.md) (Zavy 慢富工作區測試職責解耦、預估年股息輔助函式下沉與信用雷達枚舉中文化)
  - [技術債 0048](file:///d:/APP/股票紀錄/docs/debts/0048-strategic-prompt-workspace-financial-records-injection.md) (個股分析工作區已載入之量化財務報表與本益比深度注入智策提示詞事實清單)
* **關聯架構決策：** [`docs/adr/0224-technical-debts-0057-0048-resolution.md`](file:///d:/APP/股票紀錄/docs/adr/0224-technical-debts-0057-0048-resolution.md)
* **規格狀態：** `APPROVED`
* **版本：** V1.0
* **建立日期：** 2026-11-12

---

## Problem Statement

使用者與開發團隊在維護專案演進至 v9.16.2 後，面臨以下三個架構維護性與領域語言一致性的痛點：

1. **Zavy 慢富工作區測試單一檔案職責膨脹 (Divergent Change & Test Smell)**：
   - 在完成 Spec 0223 後，`src/components/zavy/ZavyMacroCompassCard.test.tsx` 檔案聚集了羅盤卡片、工作區頂部導覽列、第二鏡頭市場寬度卡片與第三鏡頭 A/B 雙軌決策卡片等多個不同組件的測試案例。當任一子卡片進行佈局微調時，均需修改此一巨大測試檔，違反單一職責原則。
2. **業務邏輯外溢至 UI 渲染層 (Feature Envy)**：
   - `src/components/zavy/ZavySlowWealthWorkspace.tsx` 在渲染層中以 `reduce` 直接計算所有持倉部位的加權成本殖利率、幣別匯率折算與單年預估股息活水 (`annualEstimatedDividendsTwd`)，使核心金融會計邏輯耦合於 React 組件生命週期內，無法在無 DOM 環境下以純函式方式進行獨立極限測試。
3. **報告導出語言不一致 (Domain Language Gap)**：
   - 在 `zavySlowWealthEngine.ts` 導出 Markdown 報告時，潮汐、波浪與美債狀態均已完成繁體中文化，但信用雷達的風險等級依舊輸出為原始英文枚舉 (`LOW`, `ELEVATED`, `HIGH`, `CRITICAL`)，損害中文使用者的閱讀體驗。
4. **智策提示詞技術債 0048 歷史狀態脫鉤與董監質押補充**：
   - 經深度調研，技術債 0048 所要求的量化財報（PE、PB、殖利率、季 EPS、毛利率、營利率與月營收歷史）已在 Spec 0181/0195/0196/0197 中隨提示詞引擎物理遷移至主力戰情室並由 `aiForcePromptAdapter.ts` 完整注入，但技術債看板仍停留在 `OPEN`，且 `directorPledgeRatioPct` 目前仍置為 `undefined`。需補全董監質押安全讀取並正式完成技術債結清閉環。

---

## Solution

依循 KISS 原則與零造輪子準則，以最小成本完成精準重構：

1. **下沉股息活水純函式**：在 `src/engine/zavySlowWealthEngine.ts` 新增具備匯率折算、平倉過濾與防禦性底標 (4.5%) 容錯的純函式 `estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate)`，並由 `ZavySlowWealthWorkspace.tsx` 委託調用。
2. **信用雷達繁中化適配器**：在 `zavySlowWealthEngine.ts` 新增 `formatCreditRiskLevelLabel(level)` 函式，將信貸風險等級映射為「低風險穩健 / 偏高警戒 / 高風險承壓 / 極端危急」，並於 Markdown 導出中全面採用。
3. **測試檔案依組件物理拆分**：將 `ZavyMacroCompassCard.test.tsx` 拆分為 4 個高凝聚度測試檔：
   - `ZavyMacroCompassCard.test.tsx` (專責第一鏡頭總經三級週期羅盤)
   - `ZavySlowWealthWorkspace.test.tsx` (專責慢富工作區導覽列與 30 秒白話心法)
   - `ZavyMarketBreadthCard.test.tsx` (專責第二鏡頭市場寬度、融資去槓桿與落底檢核)
   - `ZavyDualTrackDecisionCard.test.tsx` (專責第三鏡頭見自己 A/B 雙軌決策與真假防彈衣)
4. **技術債 0048 正式驗收與閉環**：在 `aiForcePromptAdapter.ts` 確保董監質押安全映射，並更新 `docs/debts/README.md` 及 `0048`、`0057` 之狀態為 `RESOLVED`。

---

## User Stories

1. 作為慢富長期投資人，我希望在匯出 Zavy 慢富分析報告時，信用雷達的風險等級以親切精準的繁體中文呈現（如「低風險穩健」），以便清晰理解當前信貸環境。
2. 作為系統架構師，我希望年度預估股息活水計算為獨立純函式，以便在任何投資組合分析時無副作用複用並獲得 100% 覆蓋的單元測試保護。
3. 作為前端工程師，我希望 Zavy 各卡片擁有對應的獨立測試檔，以便在修改單一卡片 UI 時不會因巨石測試檔互相干擾。
4. 作為 AI 智策分析使用者，我希望主力戰情室的 XML 事實清單能完整整合量化財報、估值指標與董監質押率，以確保 LLM 生成的決策具備最高事實定錨度。
5. 作為專案維護者，我希望技術債看板與實際代碼進展完全對齊，以便精準掌握系統健康狀況。

---

## Implementation Decisions

### 1. 純函式下沉與簽名契約 (`src/engine/zavySlowWealthEngine.ts`)
```typescript
/**
 * 依據在席持股市值與成本殖利率 (yieldOnCostPercent) 計算年度預估股息現金活水 (TWD)
 * 具備平倉過濾、幣別匯率換算與防禦性底標 4.5% 兜底機制。
 */
export function estimateHoldingsAnnualDividendsTwd(
  holdings: HoldingPosition[] = [],
  usdToTwdRate: number = 32
): number;

/**
 * 將信用雷達風險等級英文枚舉轉為繁體中文標籤
 */
export function formatCreditRiskLevelLabel(
  level: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | string | undefined | null
): string;
```

### 2. UI 渲染層委託 (`src/components/zavy/ZavySlowWealthWorkspace.tsx`)
- 移除原本 inline 的 `holdings.reduce`，直接改為：
  ```typescript
  const annualEstimatedDividendsTwd = estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate);
  ```

### 3. Markdown 導出中文化
- 在 `exportZavyReportMarkdown` 中：
  ```markdown
  - **信貸利差風險**：${formatCreditRiskLevelLabel(evaluation.creditRadar.creditRiskLevel)} (${evaluation.creditRadar.warningMessage})
  ```

### 4. 測試解耦架構
- 物理拆分為四個獨立測試，每個測試檔僅匯入其所測之特定組件，去除未使用的 props 與跨組件 mock。

---

## Testing Decisions

1. **外部行為測試 (External Behavior)**：
   - 僅對 `estimateHoldingsAnnualDividendsTwd` 的輸入輸出進行極限測試（空陣列、已平倉股票 `isClosed: true`、零股數、USD/TWD 匯率乘數、自訂殖利率、未提供殖利率時的預設 4.5% 兜底）。
   - 僅對 `formatCreditRiskLevelLabel` 進行所有枚舉與邊界 fallback 驗證。
   - UI 測試僅透過 `renderToStaticMarkup` 驗證 DOM 輸出中是否正確包含文案與屬性，不刺探內部私有 state。
2. **零回歸保證 (Zero Regression)**：
   - 本地執行全量測試，確保專案 279+ 個測試檔全數綠燈通過。

---

## Out of Scope

- 不重構 `AnalysisMetricView.tsx`（保留於技術債 0050）。
- 不涉及伺服器端 NAS 金鑰庫開發（保留於技術債 0046）。
- 不修改現有 Zavy UI 的視覺排版與 Tailwind 樣式。

---

## Further Notes

- 本規格實施後，專案中待處理之技術債將由 6 項降至 4 項（僅餘 0046, 0049, 0050, 0051）。
- 嚴格遵循單一 PR 閉環工作流，確保變更集中、自包含且具備完整 ADR。

