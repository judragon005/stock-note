# 技術債 #0026: 交易行為心理學與情緒偏誤量化覆盤審查系統 (Trading Behavioral Bias & Psychology Audit Engine)

- **狀態**：`RESOLVED`（已於 v8.34.0 / ADR #0115 完整解決）
- **優先級**：`P2`
- **發現來源**：/grill-with-docs 交易行為金融學與心理偏誤覆盤調研
- **建立日期**：2026-09-02
- **標籤**：`BehavioralFinance` · `Trader` · `Discipline` · `Quant` · `Psychology` · `Audit`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已具備交易計畫與紀律檢討模組（[src/components/TradePlanModal.tsx](file:///d:/APP/股票紀錄/src/components/TradePlanModal.tsx)）與部位持有天數統計（[src/engine/holdingPeriodEngine.ts](file:///d:/APP/股票紀錄/src/engine/holdingPeriodEngine.ts)）：
1. **靜態文字日誌 vs. 數據驅動之行為金融偏誤**：
   - 現有檢討功能主要依賴使用者主觀填寫文字備註與停損執行結果。
   - **實質盲區**：多數散戶投資人無法察覺自己深層的交易心理偏誤，如「處置效應（賺錢急著賣、賠錢死命凹）」、「FOMO 追高情緒進場」以及「過度交易摩擦成本拖累」等。
2. **缺乏量化的心理偏誤診斷指標**：
   - 系統已有歷史已實現交易與未實現持倉數據，但未進一步計算行為金融學標準統計指標（如 PGR/PLR 比率、進場乖離率分佈、換手摩擦阻力等）。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **處置效應 (Disposition Effect) 量化指標**：
   - **PGR (Proportion of Gains Realized)**：在所有獲利機會中，實際選擇賣出實現獲利的比例與平均持有天數。
   - **PLR (Proportion of Losses Realized)**：在所有虧損機會中，實際選擇停損賣出的比例與平均持有天數。
   - 若 $\text{獲利部位平均持有天數} \ll \text{虧損部位平均持有天數}$，且 $\text{PGR} / \text{PLR} \gg 1.5$，系統應自動診斷並標示「典型處置效應：不願認賠，截斷利潤、讓虧損奔馳」。
2. **FOMO / 追高情緒進場檢測 (Chasing High & Overextension Audit)**：
   - 統計買進交易日當天的技術指標狀態：
     - 是否買在 **60 日季線正乖離率 $> +15\%$** 的極端過熱區？
     - 是否買在 **成交量突破 20 日均量 3 倍** 的爆量當日？
   - 計算投資人之「追高勝率 vs 逢低承接勝率」對比矩陣。
3. **過度交易與換手摩擦損耗 (Friction Cost Drag)**：
   - 統計特定期間（月度/季度）內因頻繁進出所累積的手續費與證交稅總額，並計算其佔淨資產的年化拖累率（Drag Rate %）。

### 暫緩理由 (Deferral Rationale)
1. 現有交易紀錄與持倉損益計算核心邏輯健全，基礎紀律標籤已能支援手動記錄。
2. 行為心理學診斷屬於高階量化覆盤功能，待建立獨立量化分析模組時統一實作。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. 行為診斷指標模型 (Behavioral Metrics Schema)

```typescript
export interface BehavioralAuditReport {
  period: { startDate: string; endDate: string };
  dispositionEffect: {
    avgHoldingDaysGain: number;       // 獲利部位平均持有天數 (例如 8.5 天)
    avgHoldingDaysLoss: number;       // 虧損部位平均持有天數 (例如 64.2 天)
    pgr: number;                      // 獲利實現比率
    plr: number;                      // 虧損實現比率
    ratio: number;                    // PGR / PLR (處置效應強度指數)
    severity: 'HEALTHY' | 'MODERATE' | 'SEVERE';
  };
  entryEmotionAudit: {
    chasingHighTradesCount: number;   // 追高買進筆數 (乖離率 > 15%)
    chasingHighWinRate: number;       // 追高進場真實勝率 %
    calmEntryWinRate: number;         // 冷靜/回檔進場真實勝率 %
    fomoDragPnL: number;              // 因 FOMO 追高導致的淨損失金額
  };
  frictionAnalysis: {
    totalFeeAndTax: number;           // 累積交易手續費與稅費 (TWD)
    turnoverRateAnnualized: number;   // 年化週轉率 %
    dragOnReturnPercent: number;      // 摩擦成本對總投報率的侵蝕 %
  };
  aiPsychologyAdvice: string[];       // 系統針對交易盲區生成的客觀改善建議
}
```

### B. 核心診斷演算法實作思路

```typescript
// src/engine/behavioralAuditEngine.ts
export function calculateBehavioralAudit(
  trades: TradeRecord[],
  holdings: HoldingPosition[],
  historicalPrices: Record<string, DailyQuote[]>
): BehavioralAuditReport {
  // 1. 遍歷已平倉 Lot 與當前持倉，分流統計獲利與虧損部位的持有時間
  // 2. 交叉比對買進日期的股價與 60MA 乖離率
  // 3. 計算總手續費與稅費佔總資產比率
  // 4. 輸出量化評分與心理改善卡片
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

1. 當使用者要求升級交易檢討頁面，需要自動化「交易心理與盲區覆盤」功能時。
2. 進行年度/季度個人投資績效全方位健檢與週轉率分析時。
