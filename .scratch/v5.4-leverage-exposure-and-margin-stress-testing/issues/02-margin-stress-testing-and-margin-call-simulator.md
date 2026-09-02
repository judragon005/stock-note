# Issue #2: 質押維持率極端壓力測試、耐受跌幅與追繳逆運算引擎 (Margin Stress Engine & TDD)

## 任務目標
1. 在 `src/types/` 定義質押壓力測試相關型別（`MarginStressScenario`, `MarginStressResult`, `MarginCallRequirement` 等）。
2. 建立 `src/engine/marginStressEngine.ts`，實作：
   - 擔保品市值與即時維持率計算。
   - 動態跌幅情境推演（`simulateMarginStress`）。
   - 最大耐受跌幅逆運算（`calculateMaxDropTolerance` 到 130% 斷頭線）。
   - 追繳保證金現金與擔保品差額逆運算（`calculateMarginCallRequirement` 達到 130% 或 160% 水位）。
3. 建立 `src/engine/__tests__/marginStressEngine.test.ts`，編寫 100% 覆蓋之單元測試。

## 驗收標準
- `npm test` 通過所有壓力情境、極限耐受跌幅與追繳金額反推測試。
- 質押負債為 0 時能安全處理並回傳無槓桿狀態。
