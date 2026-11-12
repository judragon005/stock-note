# 技術債 0058: DividendLogView 龐大單體神級組件模組化解耦重構 (DividendLogView God Component Subcomponent Decomposition)

* **建立日期**：2026-11-12
* **狀態**：`RESOLVED` (已於 v9.18.0 / Spec 0225 / Issue #502 完整解決)
* **優先級**：`P2 (Medium)`
* **來源**：/grill-with-docs 深度架構大閱兵審查 (Spec 0225 / Issue #501)
* **標籤**：`Refactor` · `UI` · `CleanCode` · `Dividend` · `SRP` · `ComponentDecomposition`

---

## 1. 現狀診斷與背景 (Context & Problem)

在專案演進至 v9.17.0 後，`src/components/DividendLogView.tsx` 檔案膨脹至 **1,604 行**，違反單一職責原則 (SRP)，呈現典型的「神級組件 (God Component)」壞味道：

### 存在痛點
1. **多重職責交織 (Divergent Change)**：
   - 同時承載了：控制導覽列、未來 12 個月現金流預估月曆、4 大 KPI 發光卡片、月度長條圖與避讓 Tooltip、標的股利排行榜、毛淨額對帳抽屜、歷史股利交易明細表與搜尋過濾。
   - 任何一個子區塊的微調（例如修復月度 Tooltip 避讓），都極易意外破壞明細表搜尋或對帳邏輯。
2. **效能重複計算 ($O(N^2)$ Redundant Iterations)**：
   - 每次父層 state 變化，所有交易清單均被重複過濾多次，並多次呼叫 `resolveEffectiveDividendTaxAndNet`，在大規模歷史交易時引起不必要的重繪開銷。
3. **測試與維護障礙**：
   - 單元測試難以針對單一子卡片進行聚焦測試，必須 mock 龐大的 DOM 與多達 8 個 props。

---

## 2. 建議解法與架構演進 (Proposed Solution)

保持主入口 `DividendLogViewProps` 100% 向後相容，將 `DividendLogView.tsx` 瘦身為「總指揮容器 (Orchestrator, 約 250 行)」，並解耦為 4 個高內聚的專注子元件（位於 `src/components/dividend/`）：

1. **`DividendCalendarCard.tsx`**：未來 12 個月預估月曆 + 生活費開銷對標線 + 枯水期互補 + **Zavy 股息活水轉向指引**。
2. **`DividendKpiSummary.tsx`**：4 大發光 KPI 卡片 + 質押借貸淨利差現金流 + 實質稅費摩擦率 + 待入庫股票股利 + 累計跨行匯費。
3. **`DividendMonthlyChart.tsx`**：月度現金流長條圖 + 智慧避讓 Tooltip + 生活費對標水平基準線。
4. **`DividendHistoryTable.tsx`**：歷史明細搜尋過濾 + **成本殖利率 (YOC)** + **含息實質盈虧標籤** + **[一鍵已入帳] 快捷按鈕** + 毛淨額對帳抽屜。

---

## 3. 預期效益 (Benefits)

1. **職責分離**：各子組件檔案小於 250 行，心智模型清晰，各司其職。
2. **零副作用**：修改長條圖不牽連明細表，各元件可進行隔離的單元測試。
3. **效能飛躍**：搭配 `useMemo` 與 Hash Map 索引，搜尋與對帳時間穩定在 5ms 內。

