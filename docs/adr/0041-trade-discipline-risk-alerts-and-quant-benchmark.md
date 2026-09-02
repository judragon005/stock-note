# ADR 0041: 交易計畫紀律檢討、盤中風控觸價警示與大盤量化基準對比架構 (Trade Discipline, Risk Alerts & Quant Benchmark Architecture)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **版本**：v5.7.0
- **關聯規格**：[PRD #0041](../../docs/specs/0041-trade-discipline-risk-alerts-and-quant-benchmark.md)
- **關聯技術債**：
  - [技術債 #0002: 交易計畫與紀律檢討模組](../../docs/debts/0002-trade-plan-and-discipline-review.md) (`RESOLVED`)
  - [技術債 #0016: 移動停損停利風控線設定與觸價警示標籤](../../docs/debts/0016-stop-loss-take-profit-alerts-and-risk-badges.md) (`RESOLVED`)
  - [技術債 #0010: 大盤基準疊圖 (0050/SPY) 與量化績效指標](../../docs/debts/0010-benchmark-comparison-and-quant-metrics.md) (`RESOLVED`)

---

## 1. 背景與問題 (Context & Problem Statement)

在先前的版本中，系統已具備完善的交易帳本、多批次稅務沖銷 (Lot-based Accounting)、質押槓桿壓力測試與日曆交割精度引擎。然而，對於主動投資者與交易員而言，存在三大核心痛點：
1. **記帳與心理紀律脫節**：僅記錄成交價量，無法在進場前設立結構化假說與停損停利，平倉後亦無犯錯分類與紀律覆盤。
2. **缺乏盤中即時風控警示**：持股跌破停損線或達標停利時無醒目標籤提醒，造成人性猶豫。
3. **缺乏客觀量化對標**：成長曲線無大盤 (0050/SPY) 100% 歸一化對照，缺少 Alpha、Beta、Sharpe Ratio、MDD 等機構級指標。

---

## 2. 決策內容 (Decision Drivers & Strategy)

我們決定將「主動交易作戰計畫」、「盤中風控觸價警示」與「量化大盤對比」三位一體無縫整合：

1. **資料模型與純函式引擎解耦**：
   - 擴充 `TradePlan`（進場理由、預設停損停利、預期風報比）與 `TradeReview`（守紀律、犯錯類型、評分、心得）。
   - 開發純函式 `riskAlertEngine.ts`，負責試算風報比、判定 5 大風控狀態（`NORMAL`, `NEAR_STOP_LOSS`, `STOP_LOSS_TRIGGERED`, `NEAR_TAKE_PROFIT`, `TAKE_PROFIT_TRIGGERED`）與百分比距離。
   - 開發 `quantMetrics.ts`，實現年化波動度、最大回撤 (MDD)、夏普值 (Sharpe Ratio)、Beta 係數、相關係數與詹森阿爾法 (Jensen's Alpha)。
2. **100% 離線優先與本地基準數據庫 (`benchmarkData.ts`)**：
   - 內建 0050.TW 與 SPY 本地基準常數與時間序列向前填充插值 (Forward-fill)，確保零 API 依賴、保護財務隱私與極致秒開體驗。
   - 支援 50/50 股債平衡基準走勢計算。
3. **介面視覺化升級**：
   - `TradeModal.tsx`：買進建倉支援折疊式作戰計畫面板與即時風報比動態試算。
   - `HoldingsTable.tsx`：持股表格個股列即時顯示風控 Badge（🚨 觸及停損 / 🎯 達標停利 / ⚠️ 逼近警戒）與展開列作戰回顧。
   - `SummaryCards.tsx`：已平倉模式呈現全域紀律執行率、平均評分與高頻犯錯排行。
   - `PortfolioGrowthChart.tsx`：支援基準走勢切換、100% 歸一化雙折線對照與 5 大量化指標看板。

---

## 3. 影響評估與驗證 (Consequences & Verification)

### 正面效益
- **交易管理閉環完整成型**：落實「事前作戰計畫 ➔ 盤中即時風控 ➔ 賽後覆盤檢討 ➔ 客觀量化驗證」。
- **代碼高可維護性**：所有計算公式模組化為純函式，單元測試 100% 覆蓋。
- **技術債一次性解決**：一口氣清結 #0002、#0016 與 #0010 三大技術債。

### 驗證
- 全專案單元測試全數通過（24 個測試檔、288 項測試 100% 綠燈）。
- TypeScript 編譯構建 0 錯誤。
