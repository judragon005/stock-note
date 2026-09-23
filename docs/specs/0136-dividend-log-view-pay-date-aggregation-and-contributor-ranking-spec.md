# 需求規格說明書 (PRD #0136)：股利收益日誌與現金流全景統計聚合引擎入帳日時序對齊、股息貢獻排行過濾與毛淨額對帳系統

## Problem Statement (問題陳述)

在「股利收益日誌與現金流全景」檢視中，底層統計聚合引擎 [`src/engine/dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) 與介面呈現存在嚴重的時序錯位與統計口徑缺陷：

1. **跨年時序錯位導致年度累計與券商對帳落差**：
   - 使用者查詢券商 APP 之 2025/01/01 ~ 2025/12/31 實際現金股利為 **600,745 元**，專案系統卻顯示 **576,307 元**，差額達 **24,438 元**。
   - 核心根因：專案聚合引擎 [`dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) 在計算年度股利時，完全以 `trade.date`（除息基準日）進行過濾（`trade.date.startsWith('2025')`）。
   - 台股除息至入帳通常相隔 21 ~ 35 天（美股約 15 ~ 30 天）。2024 年 11~12 月除息的標的（如季配/月配 ETF、台積電等），款項實際於 2025 年 1 月入帳，券商 APP 認列為 2025 年度現金流，但專案卻因除息日為 2024 而**跨年漏計**；反之，2025 年 12 月除息、2026 年 1 月入帳之款項，專案卻**跨年偷跑**計入。
2. **現金流月份分佈與存摺到帳月份錯置**：
   - 月度現金流柱狀圖使用 `parseInt(trade.date.substring(5, 7), 10)`，直接依除息月份歸類。
   - 導致 7 月除息、8 月底才入帳發放之標的（如 2890 永豐金、金融股或高股息 ETF），其現金流被繪製在 7 月，導致「7 月現金流虛胖、8 月真實到帳時卻為 0」，背離「被動現金流全景」忠實反映資金到帳的初衷。
3. **股息貢獻排行榜 (Top) 累積方式錯誤與幽靈未到期款項污染**：
   - 當年度 Top 貢獻榜依除息年份歸屬，無法反映當年度實領排行榜。
   - 全歷史與當年度 Top 榜在累計個股貢獻時，未檢查該筆交易是否「已實質到達發放日」（未比對 `payDate <= today`），將未到期的除息款項直接累加進分子；而總額分母卻有過濾，導致佔比分母分子失真甚至大於 100%。
4. **TTM 近 12 個月滾動現金流計算粗糙**：
   - 依賴 `trade.date`（除息日）篩選，且淨額計算採用 `trade.shares * trade.price - (trade.tax || 0)`，未呼叫 [`resolveEffectiveDividendTaxAndNet`](file:///d:/APP/股票紀錄/src/engine/taxComplianceEngine.ts)，遺漏了台股二代健保 (2.11%) 合併扣繳與手續費/匯費扣除。
5. **缺乏毛額 (Gross) vs 實領淨額 (Net Cash) 對帳透明度**：
   - 券商報表常以「現金股利應發總額（毛額）」為主或提供雙視角，專案僅顯示實領淨額，未提供該年度的毛額、二代健保扣繳、美股 30% 稅額之明細總和，造成使用者核帳極度困難。
6. **明細表與頂部選定年份割裂**：
   - 頂部切換至特定年份（如 2025 年）時，下方歷史明細表仍為全歷史列表，上下檢視缺乏連動性。

---

## Solution (解決方案)

1. **確立「入帳發放日 (Payment Date)」為現金流單一事實來源 (SSOT)**：
   - 建立共用解析規則：`effectivePayDate = trade.payDate || estimatePaymentDate(trade.exDate || trade.date, trade.market)`。
   - 股利聚合引擎 [`aggregateDividendReport`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) 之**年度累計、YoY 成長、月份分佈、TTM 滾動計算**全面重構，一律以 `effectivePayDate` 作為時序核心。
2. **月度現金流柱狀圖入帳時序校正**：
   - 1~12 月月份分佈依據 `effectivePayDate` 之月份歸屬，真正落實「哪個月存摺入帳，柱狀圖就出現在哪個月」。
3. **股息貢獻排行榜嚴格入帳過濾與分子分母同步**：
   - 當年度個股貢獻榜以 `effectivePayDate.startsWith(selectedYear)` 且 `effectivePayDate <= currentDateStr` 為唯一納入標準。
   - 全歷史個股貢獻榜嚴格限制僅累計 `effectivePayDate <= currentDateStr` 之款項，分子分母口徑 100% 同步，徹底杜絕未入帳幽靈數據。
4. **TTM 近 12 個月滾動現金流邏輯升級**：
   - 篩選條件改為 `effectivePayDate >= twelveMonthsAgoStr && effectivePayDate <= currentDateStr`。
   - 淨額計算全面接入 `resolveEffectiveDividendTaxAndNet`，精準扣除二代健保與稅費。
5. **毛額與淨額雙軌核帳對照 (Gross vs Net Reconciliation)**：
   - 於 `DividendSummaryReport` 擴充 `currentYearGrossTWD`、`currentYearTaxTWD`。
   - 在前端 KPI 卡片中提供「實領淨額」與「應發毛額 / 扣繳稅費」對照提示，使使用者一眼看穿 600,745 元毛額與 576,307 元淨額之勾稽關係。
6. **歷史明細表新增年度連動過濾**：
   - 新增「連動選定年度」與「顯示全歷史」切換按鈕，預設連動頂部 `selectedYear`，維持上下視覺與數據之一致性。

---

## User Stories (使用者故事)

1. 身為使用券商 APP 對帳的投資人，我希望在專案選定 2025 年時，看見的現金股利總額是以 2025 年「實際入帳發放」為準，使跨年入帳款項（如 2024 年底除息、2025 年 1 月入帳）能精確納入 2025 年，與券商 APP 統計完全吻合。
2. 身為長期存股族，我希望 7 月除息、8 月底入帳的股票，現金流柱狀圖出現在 8 月而不是 7 月，以便於我客觀掌握每個月銀行存摺實質增加的被動現金流。
3. 身為檢視股息貢獻排行榜的使用者，我希望排行榜累積的個股金額是「按入帳日」且「已到期入帳」之款項，避免未入帳的預約除息提前跑進排行榜打亂順序。
4. 身為持有高股息股票達 2 萬元門檻的投資人，我希望在當年度實領股息卡片中看到「應發毛額」與「扣繳二代健保/稅費」的拆解，以便於我核對券商毛額 600,745 元與扣除 4% 稅費後實領 576,307 元的對帳關係。
5. 身為觀察滾動被動收入的使用者，我希望近 12 個月滾動現金流 (TTM) 嚴格按過去 365 天實際入帳之淨額計算，且計入二代健保扣繳，避免虛增平均月現金流。
6. 身為跨國投資人，當我持有美股或台股且交易紀錄未特別註記 `payDate` 時，我希望聚合引擎能自動根據市場慣例（台股 28 天、美股 21 天）推估出合理的有效發放日並納入正確的月份統計。
7. 身為查閱特定年度股利明細的使用者，我希望在歷史明細表中能一鍵篩選「僅顯示 2025 年度入帳」或「全歷史」，不需要在一長串流水中翻找當年度項目。
8. 身為追求資料嚴謹性的使用者，我希望當年度股息成長率 (YoY) 是拿「2025 年入帳金額」比對「2024 年入帳金額」，消滅跨年時序扭曲造成的成長率失真。

---

## Implementation Decisions (實作決策)

### 1. 統一時間解析函數 (Effective Pay-Date SSOT)

在 [`src/engine/dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) 中提煉並導出：

```typescript
export function getEffectiveDividendPayDate(trade: TradeRecord): string {
  if (trade.payDate) return trade.payDate;
  const baseDate = trade.exDate || trade.date;
  return estimatePaymentDate(baseDate, trade.market);
}
```

### 2. 擴充 `DividendSummaryReport` 介面

在 [`src/types/dividend.ts`](file:///d:/APP/股票紀錄/src/types/dividend.ts) 中增加毛額與扣稅合計：

```typescript
export interface DividendSummaryReport {
  totalHistoricalDividendsTWD: number;
  currentYearDividendsTWD: number;     // 當年度實領淨額
  currentYearGrossTWD: number;         // 當年度應發毛額 (新增，利於券商對帳)
  currentYearTaxTWD: number;           // 當年度扣繳稅費/二代健保 (新增)
  previousYearDividendsTWD: number;
  yoyGrowthPercent: number;
  trailing12mDividendsTWD: number;
  monthlyDistribution: { ... }[];
  topDividendContributors: { ... }[];
  currentYearTopContributors: { ... }[];
  upcomingDividends: ReceivableDividend[];
}
```

### 3. 聚合引擎計算邏輯重構 (Refactored Pipeline)

```typescript
for (const trade of dividendTrades) {
  const effectivePayDate = getEffectiveDividendPayDate(trade);
  const isSettled = effectivePayDate <= currentDateStr;

  const res = resolveEffectiveDividendTaxAndNet(trade, trades);
  const grossTWD = trade.currency === 'USD' ? Math.round(res.gross * exchangeRate) : Math.round(res.gross);
  const netTWD = trade.currency === 'USD' ? Math.round(res.netCash * exchangeRate) : Math.round(res.netCash);
  const taxTWD = grossTWD - netTWD;

  // 1. 全歷史累計 (僅計入已實質入帳者)
  if (isSettled) {
    totalHistoricalDividendsTWD += netTWD;

    // 全歷史 Top 貢獻榜 (僅計入已實質入帳者)
    const existingAll = allTimeContributorMap.get(symbolKey) || { ... };
    existingAll.totalDividendsTWD += netTWD;
    allTimeContributorMap.set(symbolKey, existingAll);
  }

  // 2. 當年度統計 (以 effectivePayDate 為歸屬基準)
  if (effectivePayDate.startsWith(currentYearStr)) {
    if (isSettled) {
      currentYearDividendsTWD += netTWD;
      currentYearGrossTWD += grossTWD;
      currentYearTaxTWD += taxTWD;

      // 當年度 Top 貢獻榜 (僅計入當年度已實質入帳者)
      const existingYear = currentYearContributorMap.get(symbolKey) || { ... };
      existingYear.totalDividendsTWD += netTWD;
      currentYearContributorMap.set(symbolKey, existingYear);
    }

    // 月度現金流分佈 (僅已實質入帳者，或已到期者)
    const monthPart = parseInt(effectivePayDate.substring(5, 7), 10);
    if (monthPart >= 1 && monthPart <= 12 && isSettled) {
      const targetMonth = monthlyData[monthPart - 1];
      targetMonth.grossTWD += grossTWD;
      targetMonth.netTWD += netTWD;
      targetMonth.taxTWD += taxTWD;
      targetMonth.count += 1;
    }
  } else if (effectivePayDate.startsWith(previousYearStr) && isSettled) {
    previousYearDividendsTWD += netTWD;
  }
}
```

### 4. TTM 滾動計算重構

```typescript
let trailing12mDividendsTWD = 0;
for (const trade of dividendTrades) {
  const effectivePayDate = getEffectiveDividendPayDate(trade);
  if (effectivePayDate >= twelveMonthsAgoStr && effectivePayDate <= currentDateStr) {
    const res = resolveEffectiveDividendTaxAndNet(trade, trades);
    const netTWD = trade.currency === 'USD' ? Math.round(res.netCash * exchangeRate) : Math.round(res.netCash);
    trailing12mDividendsTWD += netTWD;
  }
}
```

### 5. 前端 UI/UX 增強

- **KPI 卡片 1**：主數字顯示 `NT$ currentYearDividendsTWD`，下方副標註顯示 `應發毛額 NT$ currentYearGrossTWD | 扣除稅費 -NT$ currentYearTaxTWD`，並附 Tooltip 解釋「券商 APP 若顯示毛額請核對應發總額」。
- **明細表格過濾器**：在搜尋框旁加入 `[當年度 (${selectedYear})] / [全歷史]` 切換 Toggle，預設依選定年度篩選。

---

## Testing Decisions (測試決策)

1. **嚴格紅-綠-重構循環 (TDD)**：
   - 於 [`src/engine/dividendAggregator.test.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.test.ts) 新增測試用例：
     - **跨年時序測試**：2024-12-25 除息、2025-01-15 入帳之款項，斷言其 100% 計入 2025 年度現金流，而非 2024。
     - **跨月時序測試**：2025-07-23 除息、2025-08-24 入帳之 2890 永豐金，斷言出現在 8 月份分佈中，而非 7 月。
     - **未到期入帳排除測試**：設定未來入帳日之交易，斷言其不計入已實領總額與當年度排行榜。
     - **毛額與淨額測試**：驗證 `currentYearGrossTWD` 與 `currentYearDividendsTWD` 差額精準等於扣除稅額。
     - **TTM 健保稅費扣抵測試**：驗證滾動現金流採用完整稅費解析。
2. **回歸測試保證**：
   - 執行 `npm test` 確保全系統既有 490+ 項測試維持 100% 綠燈。
   - 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。

---

## Out of Scope (範圍界定)

1. **修改券商匯入歷史資料原始檔**：本規格不修改已存在資料庫中的歷史 `TradeRecord` 原始欄位，僅在記憶體中透過推估規則平滑解析時序。
2. **重寫現金帳流水帳結算 (Cash Ledger)**：本規格聚焦於「股利收益日誌與現金流全景」，非股票交割款扣款系統。

---

## Further Notes (後續附註)

- 本規格書對齊架構決策 [ADR 0136](file:///d:/APP/股票紀錄/docs/adr/0136-dividend-log-view-pay-date-aggregation-and-contributor-ranking.md)（將於實作時建立）。
- 關聯先前明細表排版規格 [PRD #0076](file:///d:/APP/股票紀錄/docs/specs/0076-dividend-log-view-pay-date-temporal-separation-and-sorting-spec.md)。
