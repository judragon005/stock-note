# Ticket 07: 實作前端確定性算術核心：預先計算停損價位與風報比目標價

## 1. 任務目標
在前端算術核心中實作確定性價格計算器，依據當前市價或均線，精確算出：
- 保守停損價 (-3.0%)
- 防守支撐價 (-5.0%)
- 1:2.0 與 1:2.5 風報比目標價 (Target R-Multiple)
- 台股 0.585% 保本手續費摩擦門檻 (Break-Even Threshold)
將上述精確數值以 XML 標籤 `<pre_calculated_pivots>` 注入提示詞，封死外部 LLM 的浮點數算術翻車。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`:
  - 增加算術計算輔助函式 `calculateDeterministicPivots(price: number, market: MarketType)`。
  - 組裝 `<pre_calculated_pivots>` 標籤字串。

## 3. 實作重點
* 依據台股升降單位（Tick size，如 500 元以上為 1 元跳動）進行合理的四捨五入（Banker's rounding 或 toFixed(1)）。
* 當現價無效或為 0 時，安全輸出 `N/A`。

## 4. 驗收標準 (AC)
- [ ] 算術函式在給定價格 1000 元時，停損價精確算出 970.0 與 950.0。
- [ ] 提示詞輸出內容明確包含 `<pre_calculated_pivots>` 區塊。
