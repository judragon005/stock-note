# Issue 07: 實作 3 大提領策略演算法與安全提領率 (SWR) 二分法逆運算

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `quant`, `fire`, `swr`, `guardrails`

## 任務說明
1. 在 `src/engine/monteCarloFireEngine.ts` 中實作提領規則與統計指標：
   - 實作 3 大提領策略：
     - `FIXED_PERCENT_INFLATION_ADJUSTED`：Trinity 4% 通膨調整法。
     - `GUYTON_KLINGER_GUARDRAILS`：蓋頓-克林格動態護欄法（上下限 20% 偏離觸發 10% 提領額調節）。
     - `DIVIDEND_ONLY_PRESERVATION`：純股息生活模式（本金永不提領）。
   - 實作百分位數軌跡排序矩陣：
     - 在每年底對 1,000 條路徑的資產由小到大排序，提取 P10, P25, P50 (中位數), P75, P90。
   - 實作最大安全提領率 (SWR) 二分法逼近：
     - 在 $1.0\% \sim 10.0\%$ 區間進行二分搜尋，求解使期末存活率達到 $\ge 95\%$ 的最大初始提領率。
2. 擴充單元測試 `src/engine/monteCarloFireEngine.test.ts`：
   - 驗證百分位數單調遞增性質：$P10 \le P25 \le P50 \le P75 \le P90$。
   - 驗證 Guyton-Klinger 護欄在熊市中相較於固定提領能顯著降低破產率。
   - 驗證 SWR 二分逼近求解精準度。
