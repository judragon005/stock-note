# ADR 0042: 成長圖表佈局重構——當日異動事件置頂常駐與量化指標混合智能常駐架構 (Permanent Quant Dashboard & Daily Event Layout Architecture)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **版本**：v5.7.1
- **關聯規格**：[PRD #0042](../../docs/specs/0042-quant-dashboard-and-events-permanent-layout.md)
- **前置 ADR**：[ADR #0041: 交易計畫紀律檢討、風控觸價警示與大盤量化基準對比](0041-trade-discipline-risk-alerts-and-quant-benchmark.md)

---

## 1. 背景與問題 (Context & Problem Statement)

在 v5.7.0 推出機構級量化風控指標與大盤疊圖後，經實際視覺與操作體驗檢視，發現三大痛點：
1. **區塊視覺流動不佳**：當日異動事件屬於滑鼠 Hover 高頻即時探索資訊，原本置於最底部導致視線被宏觀看板阻斷。
2. **條件隱藏造成版面跳動 (Layout Shift)**：未 Hover 或選取「無基準」時區塊隱藏，導致整個圖表卡片高度頻繁伸長縮短。
3. **無基準時缺少自身組合洞察**：在未選取基準時，原本看板完全隱藏，但投資組合自身的年化波動度、夏普值（以無風險利率計算）與自身最大回撤 (MDD) 其實無需基準即可即時呈現。

---

## 2. 決策內容 (Decision Drivers & Strategy)

1. **區塊層級互換**：
   - 排序重構為：`向量 SVG 淨值折線圖` ➔ `📅 當日異動事件 (常駐)` ➔ `🏆 機構級量化風控看板 (常駐)`。
2. **當日異動事件常駐化**：
   - 預設顯示最新一日事件；Hover 時即時連動。
   - 有事件顯示明細標籤；無事件顯示灰色標籤 `無`，徹底消除版面跳動。
3. **量化指標混合智能常駐架構 (Hybrid Intelligence Mode)**：
   - `quantMetrics.ts` 純函式解耦：在無基準 (`hasBenchmark = false`) 時，依然能精確輸出自身夏普值、波動度與最大回撤；而依賴基準之指標（Alpha, Beta, Correlation, Benchmark MDD）安全回傳 `null`。
   - UI 呈現：
     - 無基準時：Alpha 與 Beta 數值顯示 **「無對應」**（副標提示「需設定大盤基準」）；夏普值、自身 MDD 與年化波動度顯示自身實時數據。
     - 有基準時：5 大指標全量聯動對照基準計算顯示。

---

## 3. 影響評估與驗證 (Consequences & Verification)

### 正面效益
- **極致平滑的互動體驗**：徹底消除所有 Layout Shift，Hover 與基準切換時介面高度保持高度穩定。
- **無基準亦具量化洞察**：即使使用者不關注大盤對標，依然能隨時檢視自身資產的波動風險與夏普回報比。
- **代碼高可維護性**：純函式與 UI 解耦，單元測試覆蓋齊全。

### 驗證
- 全專案單元測試全數通過（24 個測試檔、289 項測試 100% 綠燈）。
- TypeScript 編譯構建 0 錯誤。
