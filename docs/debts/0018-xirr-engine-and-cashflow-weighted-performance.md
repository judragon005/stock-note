# 技術債 #0018: XIRR 不定期現金流年化報酬率引擎與多維度績效分析 (XIRR Performance Engine)

- **狀態**：`RESOLVED`（已於 v5.1 完成實作，參見 [ADR #0033](../adr/0033-xirr-performance-engine.md) 與 [PRD](../specs/0033-xirr-performance-engine.md)）
- **優先級**：`P2`
- **發現來源**：量化與資產管理深度研究 (Quant & Portfolio Performance Research)
- **建立日期**：2026-08-26
- **解決日期**：2026-08-27
- **標籤**：`Quant` · `Performance` · `XIRR` · `MWRR` · `Engine`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統於 `src/engine/historicalNav.ts` 中的 `calculatePerformanceMetrics` 函式提供以下報酬率計算：
1. **累積報酬率 (Simple Cumulative Return)**：
   $\text{Return \%} = \frac{\text{Total NAV} - \text{Net Cost Basis}}{\text{Net Cost Basis}} \times 100\%$
2. **單利年化 CAGR (Simplified CAGR)**：
   $\text{CAGR} = \left(\frac{\text{Total NAV}}{\text{Net Cost Basis}}\right)^{\frac{1}{\text{Years}}} - 1$

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **傳統 Simple ROI / CAGR 的重大盲點**：
     - 簡化版 CAGR 僅假設投資人在第 0 天一次性投入本金後不再變動。
     - 實務上投資人會頻繁**定期定額、大跌逢低加碼、收取現金股利、出金買房或質押借還款**。
     - 若投資人在市場高點追加一筆大額入金，傳統公式會立即「稀釋」過去數年的優異回報；反之若逢低加碼，也無法衡量「進出場資金時點選擇能力 (Market Timing)」。
  2. **XIRR (Money-Weighted Rate of Return, MWRR) 的不可替代性**：
     - XIRR 依據每筆現金流的「實際發生日期」，以非線性折現方程求得真實的內部年化複合回報率：
       $$\sum_{i=1}^{N} \frac{C_i}{(1 + r)^{\frac{d_i - d_0}{365}}} = 0$$
     - 這是個人投資、私募基金與私人銀行衡量個人真實口袋報酬率的**唯一黃金標準**。
* **暫緩理由**：
  1. 目前系統既有的每日 NAV 與累積報酬率已能滿足日常資產追蹤。
  2. XIRR 數值求解需引入牛頓法（Newton-Raphson）與二分法邊界防禦，需經過充分的數學單元測試，列入 P2 技術債待排程開發。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

### A. 核心數學求解器 (`src/engine/xirrCalculator.ts`)
1. **輸入結構**：
   ```typescript
   export interface CashFlowEvent {
     date: string;  // YYYY-MM-DD
     amount: number; // 負值為投入/買進/存入，正值為贖回/賣出/配息/當前市值
   }
   ```
2. **混合數值解法 (Hybrid Newton-Raphson + Bisection Fallback)**：
   - 先以 Newton-Raphson 進行最多 50 次迭代，尋找 $\text{NPV}(r) = 0$ 之解。
   - 若遇導數趨近於 0、震盪不收斂或極端報酬（$r < -0.99$），平滑降級為二分逼近法（Bisection Method），確保 100% 收斂不崩潰。
3. **短週期極值防禦**：
   - 若首筆現金流至今日小於 30 天，不強制年化（避免 3 天賺 5% 外推為年化 4000% 的數學失真），標註「持有天數過短 (<30天)，僅供參考」。

### B. 三大層級 XIRR 應用
1. **整戶總體 XIRR (Portfolio-level)**：
   - 金流 = 歷史所有銀行存入 (`-DEPOSIT`) + 提領 (`+WITHDRAWAL`) + 質押借還款 + 今日整戶淨資產 (`+NAV`)。
2. **單一個股/標的 XIRR (Security-level)**：
   - 金流 = 每次買進手續費後淨額 (`-BUY`) + 每次賣出淨額 (`+SELL`) + 歷年現金股息 (`+DIVIDEND`) + 當前在庫持股市值 (`+MarketValue`)。
   - 讓投資人一眼看透特定個股包含配息後的真實複利表現。
3. **各券商帳戶 XIRR (Account-level)**：
   - 評估各獨立券商帳戶之資金運用效率。

### C. UI 整合展示
- 在首頁 `SummaryCards.tsx` 的年化報酬卡片支援切換 `[CAGR / XIRR]`。
- 在 `HoldingsTable.tsx` 持股明細中，支援展開顯示個股專屬之 `XIRR 年化報酬率 %`。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者希望精確評估定期定額、不定期加碼與股息再投資之真實年化複利。
2. 開發多維度績效分析看板或量化指標專題時。
