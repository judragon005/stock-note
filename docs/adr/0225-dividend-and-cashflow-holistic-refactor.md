# 0225 ADR: 股利日誌與現金流全景：證交所發放日時差對齊、法人級實戰指標打通與極簡模組化重構 (Dividend Log & Cashflow Holistic Refactor)

## 狀態 (Status)
`ACCEPTED` (2026-11-12)

## 關聯技術債 (Technical Debts)
- [技術債 0051](file:///d:/APP/股票紀錄/docs/debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md) (未來現金流投影慣性配息庫動態學習與跨市場擴展)
- [技術債 0058](file:///d:/APP/股票紀錄/docs/debts/0058-dividend-log-view-subcomponent-decomposition.md) (DividendLogView 龐大單體神級組件模組化解耦重構)

## 背景 (Context)
在審查 `src/components/DividendLogView.tsx` (1,604 行) 與相關引擎時，發現以下核心痛點：
1. **證交所資料先天無發放日**：TWSE TWT48U 僅提供除息日，系統強制 fallback 為 `除息日 + 28 天`，導致月配/季配 ETF 實務上 20~24 天已入帳，軟體卻判定「未到期還要等幾天」，造成入帳時差與已領股息漏計。
2. **專案現成模組未串接**：`zavySlowWealthEngine` 之股息活水轉向、`cashLedgerEngine` 之現金餘額/累計匯費/質押利息淨利差、`taxOptimizationGuard` 之健保2萬與8.5%抵扣，皆未與主視圖充分聯通。
3. **實戰心智模型缺失**：缺乏 Yield on Cost (YOC, 成本殖利率)、含息實質盈虧標籤（實質填息 vs 貼息中）、生活費開銷目標對齊線、股票股利到期上市追蹤。
4. **單體胖組件違背 SRP**：1,604 行混合了 7 種視圖與計算，效能存在重複過濾與重算。

## 決策 (Decision)
1. **發放日時序雙軌化與微操作**：
   - 優化 `estimatePaymentDate`，ETF 標的分流推估為 `+23 天`，個股為 `+28 天`。
   - 新增「一鍵已入帳 (Instant Settle)」按鈕，使用者收到銀行通知時可手動定錨為今日並轉為已入帳。
   - 明確標示 `[官方公告日]` 或 `[演算法推估]`。
2. **100% 複用專案既有模組 (嚴禁造輪子)**：
   - 串接 `zavySlowWealthEngine.ts` 之 `dividendRedirectPlan` 活水轉向建議。
   - 串接 `cashLedgerEngine.ts` 之質押借貸利息支出，計算實質淨利差現金流 (`股息收入 - 利息支出`)，並統計累計匯費。
   - 串接 `projectedCashflowEngine.ts` 疊加每月 35,000 元生活費基準線與覆蓋率。
3. **實戰指標注入**：
   - 在貢獻榜與明細表展示 `YOC: XX.X%` 與 `[實質填息]` / `[貼息中]` 標籤。
   - 在待入帳卡片展示股票股利 (配股) 待入庫股數與上市日。
4. **單體胖組件無損重構 (4 個高內聚子模組)**：
   - 保持主入口 `DividendLogViewProps` 100% 向後相容，內部拆分為：
     - `DividendCalendarCard.tsx` (月曆 + 開銷對標 + 活水轉向)
     - `DividendKpiSummary.tsx` (4 大 KPI + 質押利差 + 稅費摩擦 + 配股)
     - `DividendMonthlyChart.tsx` (長條圖 + 避讓 Tooltip + 開銷線)
     - `DividendHistoryTable.tsx` (明細搜尋 + YOC + 填息標籤 + 一鍵入帳 + 對帳抽屜)
5. **UI/UX 規範化**：
   - 採用金融控制台 2x2 網格，消除大瀑布垂直滾動。
   - 金融數字全面啟用 `font-variant-numeric: tabular-nums`。

## 後果 (Consequences)
- **正面效益**：
  - 徹底消滅「錢已進銀行、軟體卻顯示還要等幾天」的時差荒謬。
  - 將股利日誌從「散戶記帳本」昇華為「機構法人級資產負債管理 (ALM) 戰略儀表板」。
  - 1,604 行的巨型檔案被精準解耦為 4 個小於 250 行的高凝聚元件，大幅提升維護性與測試縫隙。
  - 100% 複用既有模組，零新增第三方套件依賴。
- **潛在權衡**：
  - 元件層級增加 4 個檔案，但各組件職責清晰、邊界明確，完全消除修改 A 破壞 B 之風險。
