# 技術債 #0025: 除權息與黑天鵝多維動態壓力測試矩陣與斷頭逃生模擬器 (Margin Stress Matrix & Black Swan Simulator)

- **狀態**：`RESOLVED`
- **優先級**：`P1`
- **發現來源**：/grill-with-docs 質押融資極端風控與除權息假性跳水調研
- **建立日期**：2026-09-02
- **解決日期**：2026-09-08 (v8.12.0, PRD #0093, ADR #0093)
- **標籤**：`Architecture` · `Risk` · `Margin` · `Pledge` · `StressTest` · `Quant` · `Discipline`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備股票質押借貸維持率計算與利息引擎（[src/engine/loanInterestEngine.ts](file:///d:/APP/股票紀錄/src/engine/loanInterestEngine.ts)）：
1. **靜態維持率 vs. 實戰非線性複合衝擊**：
   - 目前維持率公式為：$\text{維持率} = \frac{\text{擔保品總市值}}{\text{借款本金}} \times 100\%$。
   - 該計算在「平穩行情」下運作正常，但在台股真實實戰中，存在兩大引發非預期追繳或斷頭的重大盲區：
     - **除權息空窗期假性跳水**：除息日開盤時，擔保品股價直接扣減現金股利金額開出，使擔保品市值瞬間蒸發；而現金股利需歷經 2~4 週發放日才入帳。在除息空窗期間，維持率會短暫發生劇烈下挫。
     - **黑天鵝連續無量跌停**：單一標的或大盤遭遇連續跌停（如 -10%、-20%、-30%）時，流動性枯竭無法即時賣出股票還款。
2. **缺乏量化逃生指南 (Emergency Margin Call Playbook)**：
   - 當維持率逼近 130% 追繳線或 140% 警戒線時，投資人需要精確的指引：「**我需要立刻補進多少台幣現金，或者額外質押多少股的台積電/0050，才能將整戶維持率拉回 166% / 200% 的絕對安全水位？**」。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **多維度動態壓力測試矩陣 (Multi-Factor Stress Matrix)**：
   - 需設計矩陣式情境模擬：
     - 情境 A：大盤系統性下跌（-5%、-10%、-15%、-20%、-30%）。
     - 情境 B：特定高權重質押標的獨立暴跌（-10%、-20%、-30%）。
     - 情境 C：除權息旺季所有質押標的同步除息扣減價格。
     - 情境 D：黑天鵝複合情境（大盤 -20% + 除息扣減）。
2. **各標的斷頭觸發價精確逆推 (Liquidation Price Solver)**：
   - 針對單一擔保品或多擔保品組合，嚴格逆推每檔標的下跌至多少元時會觸發整戶 $130\%$ 斷頭線。
3. **救生圈補款計算器 (Capital Infusion Solver)**：
   - 輸入目標安全維持率 $M_{\text{target}}$（如 $166\%$），閉環求解：
     $$\Delta \text{Cash} = \text{Loan} - \frac{\text{CollateralValue}}{M_{\text{target}}}$$
     或所需補充之額外擔保品市值 $\Delta \text{Collateral} = (M_{\text{target}} \times \text{Loan}) - \text{CollateralValue}$。

### 暫緩理由 (Deferral Rationale)
1. 現有 V5.4 質押維持率監控可滿足平時常態監控。
2. 壓力測試矩陣與逃生模擬器涉及高階量化風控矩陣運算與專屬 UI 彈窗，定義於技術債中確保風控數學模型完整無誤後，優先級列為 `P1` 盡速排程實作。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 壓力測試情境結構 (Stress Scenario Schema)

```typescript
export interface StressScenario {
  id: string;
  name: string;                 // 情境名稱 (如 "大盤黑天鵝暴跌 20%", "除息旺季價格扣減")
  marketDropPercent: number;    // 大盤/全持股跌幅 %
  applyExDividendDrop: boolean; // 是否疊加除息除權跳水扣減
  customSymbolDrops?: Record<string, number>; // 個股特定跌幅覆寫
}

export interface StressTestResult {
  scenarioName: string;
  stressedCollateralValue: number;    // 壓力測試後擔保品總市值
  stressedMaintenanceRatio: number;   // 壓力測試後維持率 %
  marginCallStatus: 'SAFE' | 'WARNING' | 'MARGIN_CALL' | 'LIQUIDATION'; // 🟢/🟡/🟠/🔴
  cashNeededToSafety: number;         // 需補繳現金金額 (拉回 166% 安全水位)
  sharesNeededToSafety: {             // 或需加質標的股數
    symbol: string;
    shares: number;
  }[];
  projectedNavDrawdown: number;       // NAV 淨值萎縮幅度 %
}
```

### B. 斷頭觸發臨界價格逆推 (Breakeven Liquidation Table)

```typescript
export interface LiquidationPriceThreshold {
  symbol: string;
  currentPrice: number;
  pledgedShares: number;
  priceAt140Warning: number;          // 觸發 140% 預警之股價
  priceAt130MarginCall: number;       // 觸發 130% 斷頭追繳之股價
  maxDropPercentAllowed: number;      // 距離斷頭之最大耐受跌幅 %
}
```

### C. 視覺化逃生控制台 (Emergency Playbook UI)

- **維持率壓力光譜條**：依據不同跌幅梯度渲染即時指針變化。
- **一鍵逃生指引卡片**：直接列出「補入 NT$ 150,000 現金」或「增質 0050 2 張」即可完全解除斷頭危機。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 規劃「質押與槓桿高階風控中心」或「黑天鵝壓力測試」專題時。
2. 台股進入除權息旺季或市場波動率 (VIX) 突破 30 時。
3. 使用者質押借款金額較大，需要防禦性斷頭預警與精確補款指南時。

---

## 5. 解決方案與驗收結果 (Resolution & Verification)

- **實施 PRD**：[docs/specs/0093-black-swan-margin-stress-matrix-spec.md](file:///d:/APP/股票紀錄/docs/specs/0093-black-swan-margin-stress-matrix-spec.md)
- **架構決策**：[docs/adr/0093-black-swan-margin-stress-matrix-and-liquidation-simulator.md](file:///d:/APP/股票紀錄/docs/adr/0093-black-swan-margin-stress-matrix-and-liquidation-simulator.md)
- **實作代碼**：
  - 型別定義：[src/types/marginStress.ts](file:///d:/APP/股票紀錄/src/types/marginStress.ts)
  - 核心引擎：[src/engine/marginStressMatrixEngine.ts](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.ts)
  - 單元測試：[src/engine/marginStressMatrixEngine.test.ts](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.test.ts)
- **交付功能亮點**：
  1. **除權息價格跳水扣減模型**：$P_{\text{stressed}} = \max(0, (P_{\text{current}} - D_{\text{cash}}) \times (1 - d))$，精確模擬股息尚未入帳之空窗期市值衝擊。
  2. **標準 6 維動態情境壓力矩陣**：涵蓋 -5%、-10%、-20%、-30%、純除息跳水、以及最嚴苛之「-20% + 除息跳水」黑天鵝複合情境。
  3. **斷頭臨界價格逆推求解器 (Liquidation Price Solver)**：精確逆推觸及 130%、140% 與 166% 之臨界股價與最大耐受跌幅，並具備「整戶斷頭免疫 (Immune)」自動判定。
  4. **斷頭逃生救生圈雙軌計算器 (Capital Infusion Solver)**：同步輸出「方案 A：償還本金（減少分母）」與「方案 B：補進現金擔保品（增加分子）」以及「方案 C：指定持股加質股數」。
- **測試覆蓋**：6/6 單元測試 100% 通過，全專案 54 個測試套件、595 個測試全數通過，TypeScript 編譯零錯誤。

