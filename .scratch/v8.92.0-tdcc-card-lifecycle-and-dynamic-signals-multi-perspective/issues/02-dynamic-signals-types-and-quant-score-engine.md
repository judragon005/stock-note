# Ticket 02: 擴充 DynamicSignalsData 領域型別與多因子量化評分純函式 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/types/aiForceDashboard.ts`
  - `src/engine/aiForceDashboardEngine.ts`
* **測試檔案**：
  - `src/engine/dynamicSignalsEngine.test.ts`

## 2. 需求描述 (Description)
1. **領域型別擴充 (`src/types/aiForceDashboard.ts`)**：
   - 擴充 `DynamicSignalsData` 介面：
     ```ts
     export interface DynamicSignalsData {
       trendSignal: string;
       chipSignal: string;
       momentumSignal: string;
       riskSignal: string;
       verdictLabel: string;
       compositeScore?: number; // 0~100 綜合量化分
       verdictLight?: 'GREEN' | 'YELLOW' | 'RED'; // 動態結論燈號
       regulatoryBadge?: string; // 交易所監理標籤 (如：處置 5分盤)
       brokerMarginAlert?: string; // 券商融資/浮額警戒 (如：融資浮額沉重)
       vwapBiasStdText?: string; // 法人 VWAP 乖離 (如：-2.1σ 超跌)
       actionableAdvice?: string; // 白話情境化操作指引
       keySupportPrice?: number; // 關鍵防守支撐價
       keyPressurePrice?: number; // 轉強壓力價
     }
     ```
2. **多因子綜合評分純函式 (`src/engine/aiForceDashboardEngine.ts`)**：
   - 實作純函式 `calculateCompositeQuantScore(trendScore, chipScore, momentumScore, riskScore): number`。
   - 權重公式：
     $$\text{綜合量化分} = 0.35 \times \text{籌碼} + 0.30 \times \text{趨勢} + 0.20 \times \text{動能} - 0.15 \times \text{風險}$$
   - 極值安全邊界修約為 0~100 分。
3. **量化分映射至動態結論燈號**：
   - $\ge 60$ 分：`'GREEN'` (偏多/低風險)
   - $40 \sim 59$ 分：`'YELLOW'` (觀望/中度風險)
   - $< 40$ 分：`'RED'` (偏空/高風險)

## 3. 測試縫隙 (Test Seams)
* 針對 `calculateCompositeQuantScore` 與燈號映射介面編寫純函式測試，涵蓋臨界值（0, 39, 40, 59, 60, 100）與極端因子輸入。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0179 之 **AC 3**。
* [ ] `src/engine/dynamicSignalsEngine.test.ts` 相關單元測試 100% 綠燈。
