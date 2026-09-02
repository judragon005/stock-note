# 需求規格說明書：XIRR 不定期現金流年化報酬率引擎與多維度績效分析體系 (XIRR Performance Engine)

## Problem Statement

目前股票紀錄與資產分析儀系統在衡量投資報酬率時，主要依賴以下兩種傳統指標：
1. **累積報酬率 (Simple Cumulative Return %)**：$\frac{\text{期末總資產} - \text{累計投入本金}}{\text{累計投入本金}} \times 100\%$
2. **單利簡化年化 (Simplified CAGR %)**：$\left(\frac{\text{期末總資產}}{\text{累計投入本金}}\right)^{\frac{1}{\text{總年數}}} - 1$

隨著投資人進行真實的財富管理，這兩種公式存在重大金融與數學盲點：
1. **不定期加減碼的嚴重失真 (Cash Flow Distortions)**：
   - 簡化版 CAGR 假設本金是在第 0 天一次性全額投入。
   - 實務上投資人會頻繁**定期定額、大跌逢低加碼、收取現金股利、出金買房或質押借還款**。
   - 若投資人在市場高點追加一筆大額入金，傳統公式會立即「稀釋」過去數年的優異回報；反之若逢低精準加碼，也無法衡量投資人的「資金時點選擇能力 (Market Timing)」。
2. **個股「含息與多批次買賣」缺乏標準化年化指標 (Lack of Security-level Annualized Return)**：
   - 目前持股清單僅揭露「未實現損益 %」，無法反映該標的歷史歷次除息配息現金流、加減碼與部分獲利了結後的真實年化複利效益。
3. **缺乏國際金融機構級標準 (Absence of Money-Weighted MWRR Standard)**：
   - 國際頂級券商（如 Interactive Brokers IBKR、Charles Schwab 嘉信）與私募基金均以 **XIRR (Money-Weighted Rate of Return, MWRR)** 作為個人真實口袋報酬率的黃金標準。
   - 系統亟需建置高精度、抗極端值震盪（Robust Hybrid Solver）且具備短週期平滑防護的 XIRR 計算引擎。

---

## Solution

依據第一性原理與 KISS 原則，建置**「XIRR 混合數值求解引擎與多維度績效分析體系」**：

1. **專業混合數值求解器 (`src/engine/xirrCalculator.ts`)**：
   - **Newton-Raphson 快速收斂法**：預設以牛頓迭代法（最多 50 次，殘差容忍 $\le 10^{-7}$）求解非線性淨現值方程 $\text{NPV}(r) = \sum_{i=0}^{N} \frac{C_i}{(1+r)^{\frac{d_i - d_0}{365}}} = 0$。
   - **Bisection 二分法平滑降級 (Fallback)**：遇到導數趨近於 0、震盪不收斂或極端邊界（$r \le -0.999$）時，自動切換至區間二分逼近法 `[-0.9999, 10.0]`，保證 100% 收斂不崩潰。
   - **30 天智能平滑門檻 (30-Day Adaptive Guardrail)**：
     - 若投資週期 $< 30$ 天，不執行年化次方放大（防止 3 天賺 5% 外推為年化 40,000% 的數學雜訊），直接回傳累積報酬率並標記 `(非年化)`。
     - 持有週期 $\ge 30$ 天時，正常啟用 365 天精確年化 XIRR。
2. **全方位三大層級 XIRR 應用 (Multi-Level XIRR Engine)**：
   - **整戶維度 (Portfolio-Level)**：金流 = 外部銀行存入 (`-DEPOSIT`) + 外部提領 (`+WITHDRAWAL`) + 質押借款利息 (`-INTEREST`) + 今日整戶總淨資產 (`+Terminal NAV`)。
   - **個股標的維度 (Security-Level)**：金流 = 每次買進手續費後淨額 (`-BUY`) + 每次賣出扣稅費淨額 (`+SELL`) + 歷年現金股息 (`+DIVIDEND`) + 當前在庫持股市值 (`+Market Value`)。預設以個股原生幣別 (TWD / USD) 計算，並支援依即時匯率折算本幣。
   - **週期區間維度 (Time-Range-Level: 1M, 3M, 6M, 1Y, YTD, ALL)**：以區間起始日 NAV 為起始流出 (`-Initial NAV`)，計入區間內外部出入金，並以期末 NAV 為期末流入 (`+Terminal NAV`)。
3. **極致 UI 整合與現金流透視彈窗 (`XirrDetailModal.tsx`)**：
   - **首頁總覽卡片 (`SummaryCards.tsx`)**：年化報酬卡片支援切換 `[XIRR (資金加權) / CAGR (時間簡利)]`。
   - **歷史淨值圖表 (`PortfolioGrowthChart.tsx`)**：週期切換時動態呈現該時間範圍之 XIRR。
   - **持股清單 (`HoldingsTable.tsx`)**：個股展開明細與欄位中支援顯示「含息 XIRR (年化)」。
   - **XIRR 現金流透視診斷彈窗 (`XirrDetailModal.tsx`)**：點擊任何 XIRR 數值即可展開查看底層所有現金流日期、金額、方向、折現權重與數值收斂歷程，實現 100% 財務透明。

---

## User Stories

1. **作為長期定期定額與逢低加碼的投資人**，我希望系統計算包含每次入金時點的 XIRR 年化報酬率，以便客觀評估我的真實年化複利，而不是被剛好在高點或低點追加的本金扭曲 CAGR。
2. **作為存股與股息再投資者**，我希望在持股清單中看到每檔股票的「含息 XIRR」，讓我清楚知道每筆買進與歷年發放的現金股利累積至今的真實年化效益。
3. **作為剛買進新股票或剛開戶的短線交易者**，當我買進持股未滿 30 天時，我希望系統貼心標註「非年化」，避免短短幾天的漲跌被數學公式放大成數千 % 的荒謬年化數字。
4. **作為美股與台股雙市場投資人**，我希望美股標的的 XIRR 預設以美元 (USD) 計算以反映真實選股能力，同時也能查看折算台幣後的綜合報酬率。
5. **作為注重細節的理財者**，我希望在圖表切換「1年」、「YTD」或「6個月」時，頂部指標能同步動態計算該區間專屬的 XIRR。
6. **作為資產配置檢視者**，我希望點擊 XIRR 數值時能彈出「現金流透視視窗」，逐筆核對買進、賣出、股息與期末市值的日期與金額，確認計算無誤。
7. **作為偏好簡約介面的使用者**，我希望可以在首頁總覽卡片一鍵切換 `[XIRR / CAGR]`，自由選擇我習慣的年化統計口徑。
8. **作為系統穩定性要求者**，即使我錄入極端虧損（如 -99%）、破產或頻繁密集出入金，數值求解器也能在 1 毫秒內平滑收斂或給出安全邊界值，絕不發生無窮迴圈或前端白屏。

---

## Implementation Decisions

### 1. 核心資料模型定義 (`src/types/stock.ts` & `src/engine/xirrCalculator.ts`)

```typescript
export interface CashFlowEvent {
  date: string;         // YYYY-MM-DD
  amount: number;       // 負值為投入/買進/存入，正值為贖回/賣出/配息/期末淨值
  description?: string; // 現金流描述 (如 "買進 台積電 1,000股", "現金股利入帳")
  category?: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'DIVIDEND' | 'TERMINAL_VALUE' | 'INTEREST';
}

export interface XirrResult {
  rate: number;                // 年化報酬率數值 (如 0.1582 代表 15.82%)
  ratePercent: number;         // 年化報酬率百分比 (如 15.82)
  isAnnualized: boolean;       // 是否為年化 (天數 >= 30 為 true，< 30 為 false 標註非年化)
  durationDays: number;        // 首筆至末筆總歷時天數
  iterations: number;          // 數值迭代求解次數
  method: 'NEWTON_RAPHSON' | 'BISECTION' | 'TRIVIAL' | 'SHORT_PERIOD';
  totalInflow: number;         // 總流出投入本金 (正值化絕對值)
  totalOutflow: number;        // 總流入與期末市值
  simpleReturnPercent: number; // 累計絕對報酬率 %
}

export interface SecurityXirrResult extends XirrResult {
  symbol: string;
  currency: Currency;
  cashFlows: CashFlowEvent[];
}
```

### 2. 數值演算法架構 (Hybrid Solver State Machine)

```mermaid
flowchart TD
    A[輸入現金流陣列 events] --> B[過濾金額為 0 之雜訊並按日期升冪排序]
    B --> C{檢查是否有至少一正一負金流？}
    C -->|否，全為負值或全為正值| D[計算單純比例或回傳 -100%]
    C -->|是| E{首筆至最後一筆天數 < 30 天？}
    E -->|是| F[計算絕對累積報酬 Simple ROI，標記 isAnnualized = false]
    E -->|否| G[以初始猜測值 r0 = 0.1 啟動 Newton-Raphson 迭代]
    G --> H{迭代 <= 50 次 且殘差 < 1e-7？}
    H -->|收斂成功| I[輸出 XIRR，標記 method = 'NEWTON_RAPHSON']
    H -->|遇奇異點/不收斂/r <= -0.999| J[啟動 Bisection 二分逼近法 [-0.9999, 10.0]]
    J --> K[二分法逼近至誤差 < 1e-6，標記 method = 'BISECTION']
    I --> L[封裝 XirrResult 回傳]
    K --> L
    F --> L
```

### 3. 金流生成規則對齊 (Cash Flow Extraction Rules)

| 層級維度 | 現金流組成元素 | 金額方向符號 ($\pm$) | 備註 |
| :--- | :--- | :---: | :--- |
| **整戶總體** | 銀行現金存入 (`DEPOSIT`) | 負數 ($-$) | 外部投入本金 |
| | 銀行現金提領 (`WITHDRAWAL`) | 正數 ($+$) | 外部回收資金 |
| | 今日整戶淨資產 (`NAV`) | 正數 ($+$) | 期末結算資產淨值 |
| **單一持股** | 買進 (`BUY`) | 負數 ($-$) | 成交額 + 手續費 |
| | 賣出 (`SELL`) | 正數 ($+$) | 成交額 - 手續費 - 證交稅 |
| | 現金股利 (`DIVIDEND`) | 正數 ($+$) | 實收淨股利 (扣除預扣稅) |
| | 今日在倉市值 (`Market Value`) | 正數 ($+$) | 在倉股數 $\times$ 最新市價 |
| **週期區間** | 區間起始日淨值 (`Start NAV`) | 負數 ($-$) | 視同該週期起始全額投資 |
| | 區間內出入金 | 出金 ($+$) / 入金 ($-$) | 週期內淨現金流 |
| | 區間結束日淨值 (`End NAV`) | 正數 ($+$) | 週期期末資產淨值 |

---

## Acceptance Criteria

### 1. 核心數學引擎 (`src/engine/xirrCalculator.ts`)
- [ ] 支援常規定期定額、加碼與除息現金流，計算結果與 Excel / Google Sheets `=XIRR()` 誤差 $< 0.01\%$。
- [ ] 支援短週期防護：投資天數 $< 30$ 天時，`isAnnualized` 標記為 `false`，返回累積絕對報酬率並註記非年化。
- [ ] 數值求解器內建 Newton-Raphson 與 Bisection Fallback，在極端行情（-99% 虧損、全額歸零）下均能在 2ms 內穩定收斂，0 崩潰 0 報錯。

### 2. 多層級 XIRR 計算
- [ ] **整戶 XIRR**：準確整合 `cashTransactions` 出入金與今日 NAV，無現金帳本時平滑 fallback 至交易歷史。
- [ ] **個股 XIRR**：準確串接每檔標的之買賣、除息與在倉市值，預設以標的原生幣別 (TWD/USD) 計算。
- [ ] **區間 XIRR**：在 `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL` 之間切換時，動態求解該區間之 XIRR。

### 3. UI 與使用者互動
- [ ] `SummaryCards.tsx` 年化報酬卡片提供 `[XIRR / CAGR]` 切換按鈕，切換時即時更新數值與標籤。
- [ ] `PortfolioGrowthChart.tsx` 頂部統計指標動態揭露所選區間之 XIRR（若天數不足 30 天標註 `(非年化)`）。
- [ ] `HoldingsTable.tsx` 持股清單支援展開或顯示「含息 XIRR %」欄位。
- [ ] 點擊 XIRR 數值或標籤時，彈出 `XirrDetailModal.tsx`，展示完整現金流明細、權重與收斂狀態。

### 4. 測試覆蓋率與品質
- [ ] 新增 `src/engine/xirrCalculator.test.ts`，100% 覆蓋所有數學邊界與金流組合。
- [ ] 全站 `npm test` 100% 通過，`npm run build` 0 TypeScript 錯誤。
