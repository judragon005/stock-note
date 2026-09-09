# Issue 06: 純原生 0 依賴實作 Box-Muller 常態亂數與幾何布朗運動 (GBM) 隨機路徑生成器

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `quant`, `monte-carlo`, `gbm`

## 任務說明
1. 建立 `src/engine/monteCarloFireEngine.ts`：
   - 實作高效能、無第三方依賴的 Box-Muller 變換：
     - `generateStandardNormal(): number`：生成標準常態分佈亂數 $Z \sim \mathcal{N}(0, 1)$。
   - 實作幾何布朗運動 (Geometric Brownian Motion, GBM) 1,000 次路徑迭代：
     - 漂移項：$\mu - \frac{\sigma^2}{2}$
     - 擾動項：$\sigma \sqrt{\Delta t} Z$
     - 資產更新：$NAV_t = \max(0, NAV_{t-1} \cdot e^{\text{drift} + \text{diffusion}} - W_t)$
     - 當 $NAV_t \le 0$ 時，判定該路徑破產，後續年份資產定錨為 0。
2. 編寫單元測試 `src/engine/monteCarloFireEngine.test.ts`：
   - 抽取 10,000 個 Box-Muller 亂數，檢驗平均值接近 0（$|\bar{Z}| < 0.05$）、標準差接近 1（$|s - 1| < 0.05$）。
   - 驗證 1,000 次 30 年路徑計算耗時在 30ms 內完成。
   - 驗證零波動率（$\sigma = 0$）時退化為確定性指數增長。
