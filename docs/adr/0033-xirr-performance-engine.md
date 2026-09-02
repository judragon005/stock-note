# ADR-0033: V5.1 XIRR 不定期現金流年化報酬率引擎與多維度績效分析體系 (XIRR Performance Engine)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-27
- **參與者**：Antigravity Agent, 量化金融架構師
- **對應 PRD**：[SPEC-0033: docs/specs/0033-xirr-performance-engine.md](../specs/0033-xirr-performance-engine.md)
- **對應技術債**：[DEBT-0018: docs/debts/0018-xirr-engine-and-cashflow-weighted-performance.md](../debts/0018-xirr-engine-and-cashflow-weighted-performance.md)

---

## 1. 背景與脈絡 (Context)

先前系統於總覽看板與全歷史淨值（NAV）走勢中，主要依賴**單利累積報酬率（Simple ROI）**與**簡化版年化複合成長率（CAGR）**衡量投資績效。

然而，在真實投資情境中，投資人絕非在期初一次性投入固定本金：
1. **頻繁定期定額與低點加碼**：簡化版 CAGR 假設本金均於第 0 天一次性投入，無法衡量投資人在市場波動中的資金配置與時點選擇能力（Market Timing）。
2. **高點大額加碼稀釋效應**：若投資人在波段高點追加大額資金，傳統 ROI 會瞬間被加碼本金稀釋，嚴重低估前期低成本部位的真實報酬。
3. **現金股利落袋再投資**：傳統公式若未納入逐筆配息時點折現，將產生嚴重偏差。

因此，亟需引入**內部報酬率 / 資金加權報酬率（XIRR / Money-Weighted Rate of Return, MWRR）**，作為專業資產管理與個人投資績效衡量的統一黃金標準。

---

## 2. 決策方案 (Decision)

### (1) 0 外部依賴之高精度混合數值求解器 (`src/engine/xirrCalculator.ts`)
- **核心數學模型**：針對不規則時序現金流，求解淨現值等於零之折現率 $r$：
  $$\text{NPV}(r) = \sum_{i=0}^N \frac{C_i}{(1+r)^{\frac{d_i - d_0}{365}}} = 0$$
- **混合求解演算法 (Hybrid Newton-Raphson + Bisection Fallback)**：
  - 首選一階導數牛頓法（`calculateNPVDerivative`），設定最多 50 次迭代與 $10^{-7}$ 收斂容差，達成極速收斂。
  - 當導數趨近於 0、迭代數超限或數值震盪時，自動平滑降級至二分逼近法（`Bisection Method`），區間鎖定 $[-0.9999, 10.0]$，確保 100% 收斂不崩潰。
- **30 天智能自適應平滑防護 (Short-Period Smoothing Guard)**：
  - 若標的或區間之首筆現金流距今 $< 30$ 天，自動停用年化次方外推，以絕對累積報酬率呈現並標記 `isAnnualized: false`（非年化），徹底消除「持有 3 天賺 5% 暴衝外推為 4000%」之數學失真。

### (2) 三大維度金流聚合器
- **整戶總體 XIRR (`calculatePortfolioXirr`)**：彙整歷史外部入金（`DEPOSIT`）、出金（`WITHDRAWAL`）與期末總淨資產（`Terminal NAV`），過濾股票內部連動扣款以防重複計入。
- **單一標的含息 XIRR (`calculateSecurityXirr`)**：逐筆追蹤各標的買進成本（含手續費與稅）、賣出收回淨額、現金股利、減資退款與當前持股市值。
- **特定週期 XIRR (`calculateTimeRangeXirr`)**：支援 `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL` 等維度，以期初 NAV 為流出、區間外部出入金、期末 NAV 為流入進行精準折現。

### (3) 深色玻璃擬態之 XIRR 現金流透視診斷彈窗 (`src/components/XirrDetailModal.tsx`)
- 提供 4 格關鍵指標卡片（年化 XIRR %、全期累積報酬、總投入 vs 期末、持有天數與求解收斂狀態）。
- 現金流時序明細表（含事件 Badge、金額、折現年數與現值 PV），讓投資人清晰理解每筆金流在折現方程中的加權貢獻。

---

## 3. 後果與影響 (Consequences)

### 正面影響 (Positive)
- **客觀還原真實口袋複利**：完整解決定期定額、逢低加碼與現金股利之真實績效衡量盲點。
- **極致穩健的數值安全**：混合求解演算法 + 30 天平滑防護，通過 11 項極限單元測試，100% 杜絕 NaN 或崩潰。
- **全維度無縫透視體驗**：首頁卡片、資產成長曲線與持股明細均能一鍵點擊開展診斷彈窗。

### 技術債清償 (Debt Resolved)
- 完整解決並關閉技術債看板之 **【#0018: XIRR 不定期現金流年化報酬率引擎與多維度績效分析】**。
