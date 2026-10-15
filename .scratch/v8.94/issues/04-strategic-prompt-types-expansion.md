# Ticket 04: 擴充智策提示詞特徵型別契約：支援戰情室即時量價與籌碼特徵

## 1. 任務目標
在 `src/types/strategicPrompt.ts` 中擴充型別定義，讓 `StrategicFactDigest` 具備乘載主力戰情室特有維度的能力（如即時均線排列、外資連續買賣天數、散戶融資增減趨勢、大戶持股比率與盤中狀態）。

## 2. 修改範圍
* `src/types/strategicPrompt.ts`:
  - 擴充 `StrategicFactDigest` 介面，新增可選之 `warRoomFeatures` 物件：
    ```ts
    warRoomFeatures?: {
      maArrangement?: string;
      foreignNetDays?: number;
      foreignNetShares?: number;
      investmentTrustNetShares?: number;
      marginTrend?: 'INCREASING' | 'DECREASING' | 'STABLE';
      tdccLargeShareholdersPct?: number;
      dayTradeRiskLevel?: string;
      statusTag?: string;
      settledDate?: string;
      intradayTime?: string;
    }
    ```

## 3. 實作重點
* 保持向下相容性（全數為可選欄位），確保既有使用到 `StrategicFactDigest` 的代碼不報錯。

## 4. 驗收標準 (AC)
- [ ] TypeScript 編譯通過，型別契約明確。
