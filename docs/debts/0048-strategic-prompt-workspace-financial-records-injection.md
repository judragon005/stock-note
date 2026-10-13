# 技術債 0048: 個股分析工作區已載入之量化財務報表與本益比深度注入智策提示詞事實清單

- **狀態**：`OPEN`
- **優先級**：`P3`
- **發現來源**：Code Review (Spec 0153 / Issue #135 / PR #225)
- **標籤**：`Feature` · `AI-Advisor` · `PromptEngine` · `FinancialRecords` · `Workspace`
- **建立日期**：2026-10-13

---

## 📌 背景與問題陳述

在 V8.91.0 (Spec 0153) 中，我們落地了「智策精煉投資決策多維提示詞引擎與工作區數據注入生成器」，並在 [StockAnalysisWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) 成功嵌入了 [StrategicPromptPanel.tsx](file:///d:/APP/股票紀錄/src/components/analysis/StrategicPromptPanel.tsx)。

在當前實作中，`StockAnalysisWorkspace` 的 `strategicDigest` useMemo 區塊組裝了：
1. 標的代碼、名稱與所屬市場 (`symbol`, `name`, `market`)。
2. 標的是否為 ETF 之智能判定 (`isEtf`)。
3. 最新收盤市價 (`quote.price`)。
4. 個人持倉之部位權重與未實現損益狀態 (`userPortfolio: { portfolioWeightPct, unrealizedGainLossSign }`)。

而對於未注入之基本面資料（如本益比 PE、股價淨值比 PB、殖利率、季度財報營收與董監質押比率），`synthesizeStockDigest` 均具備完備的容錯兜底，在 XML 事實清單中自動標註為 `N/A`，遵循 Zero-Mock Policy。

然而，工作區在背景已透過 `loadData()` 載入了：
- `financialRecords` (`QuarterlyFinancialRecord[]`，涵蓋季度營收成長率、毛利率、營業利益率、稅後淨利、EPS 等)
- `companyDividends` (`CompanyDividendPolicyRecord[]`，歷年現金與股票股利政策)
- `diagnosis` (`StockHealthDiagnosis`，健康診斷雷達與各項綜合指標評估)

若能將這些已由工作區成功載入的量化財務報表數據進行欄位映射，進一步注入 `synthesizeStockDigest` 的 `fundamental` 物件，個股分析提示詞將能取得真實歷史營收與獲利成長軌跡，使大模型輸出的分析深度與洞察力更加充實。

---

## 🎯 建議重構與解決方案

在 [StockAnalysisWorkspace.tsx](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) 中的 `strategicDigest` 組裝邏輯內，將 `financialRecords` 與 `companyDividends` 映射傳入：

```typescript
const strategicDigest = useMemo(() => {
  // ...既有投資組合與現價計算...

  // 提取最新一季與上一季之財務紀錄進行 YoY / MoM 推導
  const latestFinancial = financialRecords.length > 0 ? financialRecords[financialRecords.length - 1] : undefined;
  const prevYearFinancial = financialRecords.length >= 5 ? financialRecords[financialRecords.length - 5] : undefined;

  return synthesizeStockDigest({
    symbol: selectedSymbol,
    name: stockName || selectedSymbol,
    market,
    isEtf: isCurrentEtf,
    quote: {
      price: currentPrice,
      // 可從最新財報或外部報價注入真實本益比與淨值比
    },
    monthlyRevenue: latestFinancial ? {
      yearMonth: latestFinancial.quarter,
      revenue: latestFinancial.revenue || 0,
      yoyRate: prevYearFinancial && prevYearFinancial.revenue > 0
        ? Number((((latestFinancial.revenue - prevYearFinancial.revenue) / prevYearFinancial.revenue) * 100).toFixed(2))
        : 0,
      momRate: 0,
      isAllTimeHigh: false,
    } : undefined,
    userPortfolio: {
      portfolioWeightPct,
      unrealizedGainLossSign: unrealizedSign,
    },
  });
}, [selectedSymbol, stockName, market, isCurrentEtf, currentPrice, holdings, currentPrices, financialRecords, companyDividends]);
```

---

## 📅 預計觸發時機

本項屬於漸進式增強 (Progressive Enhancement) 優化，待下期進行個股工作區財務報表深探升級，或進行外部 API 即時本益比/股價淨值比欄位對齊時一併實施。
