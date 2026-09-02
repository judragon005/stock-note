# 子任務票券 #04: 量化統計與風險調整指標計算引擎 TDD (Quant Metrics Engine TDD)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/engine/quantMetrics.ts` (新增)
  - `src/engine/quantMetrics.test.ts` (新增)

---

## 🎯 任務目標
實現機構級量化風險與績效純函式模組：
1. **年化波動度 ($\sigma_{\text{ann}}$)**：
   - 計算日報酬率標準差並乘上 $\sqrt{252}$。
2. **最大回撤 (MDD)**：
   - 計算歷史淨值高點到低點之最大跌幅。
3. **夏普值 (Sharpe Ratio)**：
   - $\text{Sharpe} = \frac{R_{\text{portfolio, ann}} - R_f}{\sigma_{\text{ann}}}$（無風險利率預設 1.5%）。
4. **貝塔係數 ($\beta$) 與相關係數 ($r$)**：
   - $\beta = \frac{\text{Cov}(r_p, r_b)}{\text{Var}(r_b)}$。
5. **詹森阿爾法 (Jensen's Alpha $\alpha$)**：
   - $\alpha = R_{p,\text{ann}} - [R_f + \beta (R_{b,\text{ann}} - R_f)]$。
6. **防禦機制**：資料長度小於 2 天或波動度為 0 時，回傳安全預設值，避免除以零或 NaN 污染。

---

## 驗收標準
- [ ] 執行 `npx vitest run src/engine/quantMetrics.test.ts` 測試 100% 綠燈通過。
