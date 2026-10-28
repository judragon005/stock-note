# 0207 ADR: 資產成長全歷史管線修復、券商隔離與量化複利指標 (Portfolio NAV Pipeline Repair, Account Isolation, and Quantitative Compounding Metrics)

## 狀態 (Status)

* **狀態：** `APPROVED`
* **決策日期：** 2026-10-28
* **關聯 Issue：** #340
* **對應規格書：** [`docs/specs/0207-portfolio-nav-pipeline-repair-and-cagr-alignment-spec.md`](file:///d:/APP/股票紀錄/docs/specs/0207-portfolio-nav-pipeline-repair-and-cagr-alignment-spec.md)

---

## 脈絡與問題陳述 (Context & Problem Statement)

在對「資產成長 (NAV)」頁面進行多輪深度代碼查驗與買方量化風控審查後，發現四項關鍵資料管線斷層與三項實戰指標缺失：
1. **除息平滑漏接**：`App.tsx` 調用 `calculateHistoricalNavSeries` 時漏傳 `receivableDividends`，使 `Spec 0206` 的除息平滑機制形同虛設，除息月份造成虛假淨值假摔。
2. **券商帳戶篩選穿透失效**：`App.tsx` 漏傳 `selectedAccountId`，使單一券商視圖無法獨立展示該券商之 NAV 折線與金流 XIRR。
3. **無風險利率寫死**：`PortfolioGrowthChart.tsx` 寫死 `1.5%`，未調用已封裝的動態匯率函式（美股 4.5% / 台股 1.8%），導致夏普率虛高。
4. **大盤日 K 未動態連線**：大盤切換時僅同步讀取 fallback 常數，未非同步請求本機 SQLite 湖倉 API `/api/market/history/`。
5. **實戰維度缺乏**：AUM 折線缺乏出入金跳空標記、關鍵卡片缺乏長期複利年化報酬率 (CAGR)、水下回撤圖缺乏歷史最長水下天數。

---

## 決策結果 (Decision Outcome)

遵循極簡與事實為本原則（KISS）：
1. **補通 App 頂層管線縫隙**：在 `App.tsx` 補齊 `receivableDividends` 與 `selectedAccountId` 傳參，徹底修復除息假凹洞並實現單一券商資產成長曲線隔離。
2. **無風險利率動態適配**：組件改為調用 `resolveDynamicRiskFreeRate(null, baseCurrency)`，USD 4.5% / TWD 1.8%。
3. **大盤非同步日 K 載入**：以輕量 `useEffect` 觸發 `loadBenchmarkDailyPricesAsync(type)`，零延遲利用記憶體快取。
4. **實戰三大指標原創補強**：
   - 於折線圖懸停事件注入「💵 入金」與「💸 出金」打點標籤。
   - 於總損益卡片新增年化複合成長率 (CAGR) 計算。
   - 於水下回撤面板新增「歷史最長水下天數 (Longest Drawdown Duration)」。
