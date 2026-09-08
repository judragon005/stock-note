# 需求規格說明書 (PRD) - 0093: 除權息與黑天鵝多維動態壓力測試矩陣與斷頭逃生模擬器

## 1. 概述 (Overview)

### 1.1 背景與實戰痛點 (Context & Problem Statement)
目前系統已具備質押維持率監控與利息試算（[src/engine/marginStressEngine.ts](file:///d:/APP/股票紀錄/src/engine/marginStressEngine.ts)），但在真實股票質押實戰中，存在兩大引發非預期追繳甚至違約斷頭的重大痛點：
1. **除權息空窗期假性跳水 (Ex-Dividend Jump-Drop Gap)**：
   - 除息日開盤時，擔保品股價直接扣減每股現金股利開出，擔保品市值瞬間蒸發。
   - 現金股利需歷經 2~4 週發放日方能匯入銀行帳戶。在此空窗期內，維持率會短暫暴跌，極易引發券商誤發追繳通知或迫使投資人驚慌平倉。
2. **黑天鵝連續無量跌停與流動性枯竭 (Black Swan Liquidity Crunch)**：
   - 當大盤或單一重倉標的遭遇突發系統性危機（如地緣政治衝突、金融海嘯、連續跳空跌停），現貨無法於盤中即時變現還款。
3. **缺乏客觀精確的「斷頭臨界價」與「一鍵逃生指引」**：
   - 投資人面臨行情下挫時，迫切需要回答兩個關鍵問題：
     - **「我的這檔擔保品（例如台積電或 0050），跌到多少元時整戶會被斷頭（觸及 130%）？」**
     - **「若不幸觸及追繳，我究竟需要立刻償還多少現金本金？或補進多少現金擔保品？或額外增質幾張特定現股，才能完全解除追繳並回升到 166% / 200% 的絕對安全水位？」**

### 1.2 系統目標 (Goals & Non-Goals)
- **Goals**：
  1. 建立「多維動態情境壓力測試矩陣」，支援預設標準情境（常態修正 -5%/-10%、深度回檔 -15%/-20%、黑天鵝 -30%、除息跳水衝擊、黑天鵝+除息複合情境）。
  2. 建立「斷頭臨界價格逆推求解器 (Liquidation Price Solver)」，針對單一標的或全體標的，精確求出觸發 $130\%$ 斷頭、$140\%$ 預警與 $166\%$ 安全水位的臨界股價與最大耐受跌幅。
  3. 建立「斷頭逃生救生圈雙軌求解器 (Emergency Escape Solver)」，提供 **方案 A（償還本金）**、**方案 B（存入現金擔保品）** 與 **方案 C（指定標的加質股數）** 的完整數學閉環解。
- **Non-Goals**：
  - 本模組不涉及自動向證券商下單或透過 API 代為向券商申請增質，聚焦於純前端高階量化風控與逃生決策計算。

---

## 2. 核心數學模型 (Mathematical Models)

### 2.1 除息跳水與複合跌幅定價模型
給定標的當前價格 $P_{\text{current}}$、預計每股配息 $D_{\text{cash}}$、以及情境跌幅 $d \in [0, 1]$：
$$P_{\text{stressed}} = \max\left(0, (P_{\text{current}} - D_{\text{cash}}) \times (1 - d)\right)$$
擔保品總市值：
$$V_{\text{stressed}} = \sum_{i} \text{Shares}_i \times P_{\text{stressed}, i} \times \text{FX}_i$$

### 2.2 整戶維持率與等級狀態機
$$\text{Ratio}_{\text{stressed}} = \begin{cases}
0, & \text{若 } \text{TotalDebt} = 0 \\
\frac{V_{\text{stressed}}}{\text{TotalDebt}} \times 100\%, & \text{若 } \text{TotalDebt} > 0
\end{cases}$$

- **SAFE (極度安全)**：$\text{Ratio} > 200\%$
- **HEALTHY (健康水位)**：$166\% \le \text{Ratio} \le 200\%$
- **WARNING (警戒水位)**：$130\% \le \text{Ratio} < 166\%$（含 140% 次級預警線）
- **MARGIN_CALL (斷頭追繳)**：$\text{Ratio} < 130\%$

### 2.3 單一標的斷頭臨界價格逆推 (Single-Asset Liquidation Price Solver)
假設帳戶總借款為 $L$，擔保品中目標標的為 $T$（股數 $S_T$，當前價格 $P_T$，匯率 $\text{FX}_T$），其他其餘所有擔保品總市值維持 $V_{\text{other}}$ 不變：
整戶欲維持在目標維持率 $M$（例如 $1.30$ 斷頭線、$1.40$ 警戒線或 $1.66$ 安全線），需滿足：
$$\frac{V_{\text{other}} + S_T \times P_T^* \times \text{FX}_T}{L} = M$$
$$S_T \times P_T^* \times \text{FX}_T = M \times L - V_{\text{other}}$$
$$P_T^* = \frac{M \times L - V_{\text{other}}}{S_T \times \text{FX}_T}$$

- **若 $P_T^* \le 0$**：表示即使該標的股價跌至 0 元，其餘擔保品市值仍足以維持該維持率，該標的無斷頭風險（耐受跌幅為 $100\%$）。
- **若 $P_T^* > P_T$**：表示當前水位已經低於該維持率，立即處於該警戒/追繳狀態。
- **最大耐受跌幅**：
  $$\text{MaxDropTolerance}_T = \max\left(0, \min\left(1, \frac{P_T - P_T^*}{P_T}\right)\right)$$

### 2.4 逃生救援補款與加質求解器 (Capital Infusion & Collateral Solver)
當情境下維持率小於目標維持率 $M_{\text{target}}$（例如 $1.66$）時：

#### 方案 A：償還借款本金 (Repay Principal)
償還現金 $\Delta C_{\text{repay}}$ 直接減少借款分母：
$$\frac{V_{\text{stressed}}}{L - \Delta C_{\text{repay}}} = M_{\text{target}} \implies \Delta C_{\text{repay}} = L - \frac{V_{\text{stressed}}}{M_{\text{target}}}$$
（註：若 $\Delta C_{\text{repay}} \le 0$ 則為 0）。

#### 方案 B：增加現金擔保品 (Deposit Cash Collateral)
存入現金 $\Delta C_{\text{deposit}}$ 增加擔保品分子（借款分母不變）：
$$\frac{V_{\text{stressed}} + \Delta C_{\text{deposit}}}{L} = M_{\text{target}} \implies \Delta C_{\text{deposit}} = M_{\text{target}} \times L - V_{\text{stressed}}$$

#### 方案 C：指定標的加質股數 (Pledge Additional Shares)
若投資人選擇加質某指定標的 $K$（其市價為 $P_K$）：
$$\Delta \text{Shares}_K = \left\lceil \frac{\Delta C_{\text{deposit}}}{P_K \times \text{FX}_K} \right\rceil$$

---

## 3. 資料結構 (Data Contracts)

```typescript
// 壓力情境定義
export interface StressScenarioConfig {
  id: string;
  name: string;
  description: string;
  marketDropPercent: number;        // 通用大盤/全持股跌幅 (例如 0.1 代表 -10%)
  applyExDividendDrop: boolean;     // 是否疊加除息假性跳水扣減
  customSymbolDrops?: Record<string, number>; // 個股特定跌幅覆寫
}

// 單一情境評估結果
export interface StressScenarioResult {
  scenario: StressScenarioConfig;
  stressedCollateralValueTWD: number;
  stressedMaintenanceRatio: number;
  statusInfo: MarginMaintenanceInfo;
  dropInRatioPoints: number;        // 維持率衰減點數 (如 -35.2%)
  repayCashNeededFor166: number;    // 方案 A: 償還本金至 166% 所需金額
  depositCashNeededFor166: number;  // 方案 B: 補充現金擔保品至 166% 所需金額
  repayCashNeededFor130: number;    // 方案 A: 償還本金至 130% 所需金額 (若已斷頭)
  depositCashNeededFor130: number;  // 方案 B: 補充現金擔保品至 130% 所需金額
}

// 壓力測試矩陣整體結果
export interface MarginStressMatrixResult {
  currentCollateralValueTWD: number;
  totalLoanDebtTWD: number;
  currentMaintenanceRatio: number;
  currentStatusInfo: MarginMaintenanceInfo;
  rows: StressScenarioResult[];
  liquidationThresholds: LiquidationThresholdItem[];
}

// 單一標的斷頭臨界價格
export interface LiquidationThresholdItem {
  symbol: string;
  name: string;
  currentPrice: number;
  pledgedShares: number;
  collateralWeightPercent: number;   // 佔整體擔保品比重 %
  priceAt166Healthy: number;         // 觸發 166% 之臨界價
  priceAt140Warning: number;         // 觸發 140% 之臨界價
  priceAt130MarginCall: number;      // 觸發 130% 斷頭追繳之臨界價
  maxDropPercentTo130: number;       // 距 130% 斷頭之最大耐受跌幅 (0~1)
  isImmuneToLiquidation: boolean;    // 是否即便歸零也不會引發整戶斷頭
}
```

---

## 4. 驗收標準 (Acceptance Criteria)

1. **情境矩陣完整度**：預設包含 6 種情境（-5%、-10%、-20%、-30%、純除息跳水、-20% + 除息跳水），各情境維持率與補繳資金計算精確。
2. **臨界價格求解精度**：單一標的之 130%、140%、166% 臨界股價與耐受跌幅吻合解析解，若其餘持股市值已大於 $1.30 \times L$，則標記 `isImmuneToLiquidation = true` 且 `maxDropPercentTo130 = 1.0`。
3. **逃生雙軌方案吻合實務**：償還本金方案（減少分母）與存入擔保品方案（增加分子）兩者數值關係明確且合理。
4. **無質押借款防呆**：當帳戶無任何質押借款時，各指標安全輸出且不拋出除以零或 NaN 錯誤。
5. **100% 測試覆蓋**：全套件單元測試通過，TypeScript 0 錯誤。
