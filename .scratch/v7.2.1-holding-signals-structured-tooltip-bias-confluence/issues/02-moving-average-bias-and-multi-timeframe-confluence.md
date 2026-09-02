# Issue 02: 均線乖離率 (Bias %) 與多週期共振訊號量化引擎

## 狀態
`COMPLETED`

## 說明
提供券商級量化指標，計算 20MA 與 60MA 乖離率，並識別多週期長短線共振結構。

## 驗收條件
- [x] 在 `TechnicalIndicators` 中擴充 `bias20` 與 `bias60`。
- [x] 當 $\text{Bias}_{20} \ge +8\%$ 萃取 `月線正乖離 (+X.X%)` (WARNING)。
- [x] 當 $\text{Bias}_{20} \le -6\%$ 萃取 `月線負乖離 (X.X%)` (WARNING)。
- [x] 當 5MA > 20MA 且現價 < 60MA 時，標註「長空短多 (反彈)」。
- [x] 當 5MA < 20MA 且現價 >= 60MA 時，標註「長多短空 (拉回)」。
