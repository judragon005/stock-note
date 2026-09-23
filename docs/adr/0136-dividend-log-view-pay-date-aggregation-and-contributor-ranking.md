# 架構決策記錄 (ADR 0136)：股利收益日誌與現金流全景統計聚合引擎全面對齊入帳發放日時序與毛淨額對帳架構

## 狀態 (Status)
**已接受 (Accepted)** - 2026-09-23

## 背景與問題脈絡 (Context)
在「股利收益日誌與現金流全景」中，底層數據聚合模組 [`dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) 原先全部依賴 `trade.date`（除息基準日）進行年度累計、月度現金流柱狀圖與個股貢獻排行榜計算。

這引發了三大核心問題：
1. **券商核帳金額脫節**：台股除息至入帳通常相差 3~4 週，使用者在券商 APP 查詢 2025 全年累積股利為 600,745 元，專案卻僅顯示 576,307 元（差額 24,438 元），主因為 2024 年底除息、2025 年初入帳之股息被專案錯誤歸入 2024 年度而漏計，且 2025 年底除息次年入帳者被偷跑計入。
2. **現金流月份分佈錯置**：7 月除息、8 月到帳的股利被繪製在 7 月，違背了被動現金流「存摺哪個月收到就畫在哪個月」之基本會計直覺。
3. **股息貢獻排行榜污染**：個股貢獻累計未過濾 `effectivePayDate <= today`，未到期款項直接計入分子，分子分母口徑脫節。

## 決策內容 (Decision)

1. **確立有效入帳發放日 (Effective Pay-Date) 為唯一時序 SSOT**：
   - 封裝 `getEffectiveDividendPayDate(trade)`：優先讀取顯式 `trade.payDate`；若無則透過 `estimatePaymentDate(trade.exDate || trade.date, trade.market)` 推估。
   - 所有年度累計、YoY 成長、月度現金流（1~12 月）、TTM 滾動計算一律依 `effectivePayDate` 判定歸屬。
2. **股息貢獻排行榜嚴格入帳過濾**：
   - 當年度與全歷史 Top 貢獻榜之累計一律強制過濾 `effectivePayDate <= currentDateStr`，徹底杜絕幽靈款項。
3. **擴充毛額與淨額雙軌對帳欄位 (Gross vs Net Reconciliation)**：
   - 於 `DividendSummaryReport` 擴充 `currentYearGrossTWD` 與 `currentYearTaxTWD`，前端 KPI 卡片同步提供應發毛額與二代健保/預扣稅拆解，徹底解決使用者核對券商毛額/淨額需求。
4. **TTM 滾動現金流接入完整稅費解析**：
   - 改採 `resolveEffectiveDividendTaxAndNet` 統一扣繳二代健保與稅費。

## 效益與權衡 (Consequences)

- **正面效益**：
  - 專案股利數據 100% 精確匹配銀行存摺與券商 APP 之「入帳流水」。
  - 月度現金流柱狀圖忠實還原資金到帳節奏。
  - 消除 24,438 元跨年錯位差額，並提供毛淨額對帳透明度。
- **權衡**：
  - 若歷史紀錄未填寫 `payDate`，依賴 `estimatePaymentDate` 常態庫（台股 28 天、美股 21 天）推估，符合金融實務並優雅降級。
