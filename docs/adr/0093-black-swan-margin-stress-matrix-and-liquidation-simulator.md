# ADR 0093: 除權息與黑天鵝多維動態壓力測試矩陣與斷頭逃生模擬器 (Black Swan Margin Stress Matrix & Liquidation Simulator)

## 狀態 (Status)
- **日期**：2026-09-08
- **狀態**：`ACCEPTED`
- **關聯 PRD**：[docs/specs/0093-black-swan-margin-stress-matrix-spec.md](../specs/0093-black-swan-margin-stress-matrix-spec.md)
- **關聯技術債**：[docs/debts/0025-ex-dividend-and-black-swan-margin-stress-matrix.md](../debts/0025-ex-dividend-and-black-swan-margin-stress-matrix.md)

---

## 背景與痛點 (Context & Problem Statement)
股票質押借貸是許多台美股長線投資人放大資金效率的工具。但在實戰中，投資人面臨三大黑天鵝風控盲區：
1. **除權息假性跳水**：除息日開盤價直接扣減現金股利，擔保品市值瞬間萎縮，而股息入帳有 2~4 週時間差，易引發非預期追繳。
2. **極端複合衝擊**：市場遭遇突發利空連環跌停時，缺乏動態矩陣快速評估維持率變化。
3. **缺乏精確斷頭臨界價與逃生指南**：不知道重倉標的跌到多少元會跌破 130% 斷頭，亦缺乏「該還多少本金或補多少擔保品」的精確數值指南。

---

## 決策與架構 (Decisions & Architecture)

1. **除息跳水扣減與複合跌幅數學模型**：
   $$P_{\text{stressed}} = \max\left(0, (P_{\text{current}} - D_{\text{cash}}) \times (1 - d)\right)$$
   支援純除息跳水、梯度大盤跌幅 (-5% ~ -30%) 以及極端複合情境 (-20% + 除息跳水)。

2. **單一/多標的斷頭臨界價格逆推求解器 (Liquidation Price Solver)**：
   $$P_T^* = \frac{M \times L - V_{\text{other}}}{S_T \times \text{FX}_T}$$
   當其餘擔保品 $V_{\text{other}} \ge 1.30 \times L$ 時，判定該標的具備「斷頭免疫 (Immune to Liquidation)」，耐受跌幅為 100%。

3. **斷頭逃生雙軌救生圈求解器 (Emergency Escape Plan Solver)**：
   - **方案 A (償還借款本金，減少分母)**：$\Delta C_{\text{repay}} = \max\left(0, L - \frac{V_{\text{stressed}}}{M_{\text{target}}}\right)$
   - **方案 B (補充現金擔保品，增加分子)**：$\Delta C_{\text{deposit}} = \max\left(0, M_{\text{target}} \times L - V_{\text{stressed}}\right)$
   - **方案 C (指定標的加質股數)**：$\lceil \Delta C_{\text{deposit}} / (P_K \times \text{FX}_K) \rceil$

---

## 影響與驗證 (Consequences & Verification)

- **正面效益**：
  - 徹底解決股票質押投資人面對大盤暴跌或除息跳水時的焦慮與算不清問題，提供毫秒級客觀數據逃生指引。
  - 核心運算為純函式，與既有模組零破壞向後相容。
- **驗證指標**：
  - [src/engine/marginStressMatrixEngine.test.ts](../../src/engine/marginStressMatrixEngine.test.ts) 6 個單元測試 100% 通過。
  - 全工程 54 個測試套件、595 個測試全數通過，`npm run build` 零錯誤。
