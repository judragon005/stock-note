# 0230. 股利現金流全域同態收縮、時序因果阻斷、跨境稅制隔離與自然鍵防撞

Date: 2026-11-14
Status: ACCEPTED
Deciders: judragon005, AntiGravity Agent

## Context (背景與問題陳述)

在 Spec 0229 完成實質填息標籤與雙軌應收股利對帳統一後，系統在全域切換與時序因果上仍存在微觀漏洞：
1. **時序因果倒灌 (Chrono Taint)**：歷史發放月份學習器 `extractHistoricalPayoutMonths` 缺乏時間門禁，未來未到期預約股利反向倒灌歷史習慣庫，捏造 12 月 NT$ 22,500 幽靈現金流，抹滅枯水期事實並遺漏 00929/00934 填補建議。
2. **全域幾何收縮脫節 (Scoping Fracture)**：切換美股市場或特定帳戶時，持股與質押借貸利息未同態收縮，全量台股與質押利息向美股與獨立子帳戶洩漏。
3. **跨境稅制侵蝕 (Cross-Border Tax Contamination)**：台灣所得稅法 8.5% 股利抵扣額（扣繳代碼 54C，上限 8 萬）直接消費包含美股海外所得換算之台幣總額，違背境內稅制水密隔離。
4. **自然鍵碰撞 (Natural Key Collision)**：以易變的 `payDate` 去重，官方發放日與手動預約日 1~2 天延遲引發 200% 待入帳重複認列。
5. **YOC 尺度與歷史匯率失真**：季配與月配 YOC 未動態年化（台積電單季顯示 0.4%），歷史外幣折合台幣未穿透交易成交匯率快照。

## Decision (決策內容)

1. **時序因果阻斷門禁 (Causal Horizon Wall)**：
   在 `extractHistoricalPayoutMonths` 與 `annualReconciliationList` 注入 `currentDateStr`（`todayStr`），嚴格限制 `payDate <= currentDateStr` 才能納入歷史慣性學習與券商年度對帳小計。
2. **全域過濾同態幾何收縮 (Homomorphic Context Closure)**：
   在 `DividendLogView` 頂層建立 `scopedHoldings` 與 `scopedLoans`，連通 `generate12MonthProjectedCashflow`、`DividendTopContributorsCard`、`DividendHistoryTable` 與 KPI 摘要卡片，保證五大視圖母體 100% 一致。
3. **SSOT 應收同源融合**：
   報表聚合器 `aggregateDividendReport` 直接消費融合去重後的單一事實來源 `activeReceivables`，確保月度長條圖與待入帳行事曆 100% 同源對齊。
4. **法定跨境稅制水密艙隔離 (Watertight Tax Jurisdiction Bulwark)**：
   於 `DividendSummaryReport` 獨立輸出 `currentYearTwDividendsTWD`，專供 `calculateDividendTaxDeductionStats` 使用，物理水密隔離美股 30% 海外所得。
5. **金融事件自然鍵防撞去重協定 (Natural Key Deduplication Protocol)**：
   升級 `buildUnifiedPendingReceivables`，以不可變之除息日自然鍵 `${market}_${symbol}_${exDate || payDate}` 防撞去重，徹底杜絕待入帳款項重複認列。
6. **年化 YOC 邏輯下沉與歷史匯率快照**：
   於 `dividendMetricsEngine` 抽象 `resolveDividendFrequencyMultiplier` 純函式（支援美股月配息標的如 O, JEPI 等 12 次年化），並於折合台幣與券商對帳單全面穿透 `trade.exchangeRate` 快照。
7. **預算邊界守衛**：
   在 `DividendCalendarCard` 為自訂生活費設置 1,000 ~ 1,000,000 元邊界防禦與非負保護，杜絕 `NaN%`。

## Consequences (後續影響)

- **正面效益**：
  - 徹底消除華邦電 12 月 22,500 元幽靈現金流，枯水期覆蓋率自癒恢復為真實 31%，精準觸發 00929/00934 互補推薦。
  - 全看板跨市場（美股 vs 台股）與券商子帳戶切換 100% 同態收縮，質押利息與持股數據零外洩。
  - 台灣境內 54C 抵減額計算純淨，符合所得稅法規範。
  - 待入帳卡片與長條圖待入帳柱狀圖完全同步，券商存摺對帳小計與網銀入帳流水 100% 勾稽吻合。
  - 全量 289+ 測試檔案通過、TypeScript 0 錯誤、Production Bundle 順利產出。
- **後續維護**：
  - 未來若有新型配息頻率（如雙週配），應同步於 `resolveDividendFrequencyMultiplier` 擴充倍數映射。
