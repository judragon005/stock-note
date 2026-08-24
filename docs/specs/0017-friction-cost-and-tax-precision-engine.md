# 產品需求規格書 (PRD)：V3.3 摩擦成本精準計算引擎與台美股稅制校驗升級

- **文件編號**：`SPEC-0017`
- **版本**：`V3.3`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-24
- **追蹤 ADR**：[ADR-0017: 摩擦成本與稅率精準計算引擎升級](../adr/0017-friction-cost-and-tax-precision-engine.md)

---

## 1. 背景與問題陳述 (Background & Problem Statement)

在真實金融投資環境中，交易摩擦成本（Friction Costs，包括手續費、證券交易稅、股息預扣稅與監管規費）直接影響投資淨報酬率。現行系統在交易帳本與摩擦分析中心中存在以下計算偏差與制度盲點：

1. **台股折讓省下金額計算失真（未採計法定牌告低消 20 元）**：
   現行系統僅以純費率差 $\lfloor \text{成交金額} \times 0.001425 \rfloor - \text{實付手續費}$ 計算折讓。但在台股實務中，未打折牌告標準設有 **最低手續費 20 元** 門檻。當投資人進行零股交易（例如成交 2,000 元，牌告費率 2.85 元，但牌告法定低消為 20 元；若優惠券商實收 1 元低消），真實省下金額為 $20 - 1 = 19$ 元，但現行系統僅計算為 $2 - 1 = 1$ 元，導致小額與定期定額投資人之折讓省下金額被嚴重低估。

2. **債券型 ETF 預估證交稅誤課 0.1%**：
   依據台灣現行證券交易稅條例，**債券型 ETF（代碼以 `B` 結尾，如 00679B、00687B）停徵證券交易稅（稅率為 0%）**。現行系統一律將結尾為 `B` 的標的課徵 0.1% 稅率，導致持倉預估未來出清摩擦成本高估。

3. **美股摩擦成本未納入「30% 股息預扣稅」與「SEC 規費」**：
   美股雖然多數海外券商免交易手續費，但非美國稅務居民（持有 W-8BEN）之現金股利會被自動預扣 **30% 股息預扣稅 (Withholding Tax)**，且賣出時有微量 **SEC 規費 (0.00278%)**。現行系統美股摩擦全數歸零，未能反映真實持有成本。

4. **當沖交易 (Day Trading) 減半稅率 (0.15%) 與手動覆寫彈性**：
   現行系統無法識別或標註現股當沖 0.15% 稅率，且在紀錄錄入時缺乏交易稅率性質之自動推導與手動覆寫防護。

---

## 2. 核心公式與計算規格 (Formulas & Computation Specifications)

### 2.1 台股券商折讓省下金額 (Fee Saved by Discount)
- **法定標準牌告手續費基準**：
  $$\text{StandardFee} = \max(20, \lfloor \text{Volume} \times 0.001425 \rfloor)$$
- **單筆折讓省下金額**：
  $$\text{SavedDiscount} = \max(0, \text{StandardFee} - \text{RealizedFee})$$
- **歷史累計折讓省下總額**：
  $$\text{totalFeeSavedByDiscount} = \sum_{\text{trades}} \text{SavedDiscount}$$

### 2.2 台股預估證券交易稅判斷階層 (Estimated Sell Tax Hierarchy)
在計算持倉預估出清證交稅 `calculateEstimatedSellTax(symbol, market, grossMarketValue)` 時，依以下優先權判斷：

```mermaid
flowchart TD
    Start[輸入標的 symbol 與毛市值] --> IsTW{是否為台股 TW?}
    IsTW -- 否 (US) --> TaxZero[稅額 = 0]
    IsTW -- 是 --> CheckBond{symbol 結尾為 'B' 或為債券 ETF?}
    CheckBond -- 是 (債券 ETF) --> Tax0[稅率 = 0% 免徵證交稅]
    CheckBond -- 否 --> CheckStockETF{symbol 為 '00' 開頭或 ETF?}
    CheckStockETF -- 是 (股票型 ETF) --> Tax01[稅率 = 0.1% 即 floor(市值 * 0.001)]
    CheckStockETF -- 否 (普通股票) --> Tax03[稅率 = 0.3% 即 floor(市值 * 0.003)]
```

### 2.3 美股摩擦成本體系 (US Friction & Withholding Tax)
1. **美股現金股利 30% 預扣稅 (Dividend Withholding Tax)**：
   - 股息發放（`DIVIDEND`）且 `market === 'US'` 時，自動記錄/試算 30% 預扣稅款：
     $$\text{WithholdingTax} = \text{DividendAmount} \times 30\%$$
   - 於 `FrictionSummary` 中新增 `totalUSDividendTax` 獨立統計指標。
2. **美股賣出 SEC 規費 (SEC Transaction Fee)**：
   - 美股賣出（`SELL` 且 `market === 'US'`）時，預估/預設規費：
     $$\text{SecFee} = \text{GrossMarketValue} \times 0.0000278$$

### 2.4 摩擦衝擊比率 (Friction Impact Ratio)
$$\text{FrictionImpactPercent} = \frac{\text{已實現已付摩擦} + \text{預估未來出清摩擦} + \text{美股股息預扣稅}}{\text{總資產毛市值} + \text{已實現總獲利}} \times 100\%$$

---

## 3. 資料模型更新 (Data Model Updates)

### 3.1 `FrictionSummary` 介面擴充 ([`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts))
```typescript
export interface FrictionSummary {
  totalBuyFee: number;                  // 歷史已付買進手續費
  totalSellFee: number;                 // 歷史已付賣出手續費
  totalSellTax: number;                 // 歷史已付賣出證交稅
  totalRealizedFriction: number;        // 歷史已付總摩擦成本 (買費 + 賣費 + 賣稅 + 股息預扣稅)
  totalFeeSavedByDiscount: number;      // 透過券商折讓省下手續費總額 (以法定 20 元低消牌告為基準)
  totalEstimatedFutureFriction: number; // 當前在庫持股預估未來出清摩擦成本
  totalEstimatedFutureTax: number;      // 當前在庫持股預估未來出清證交稅 (債券ETF 0%, 股票ETF 0.1%, 現股 0.3%)
  totalEstimatedFutureFee: number;      // 當前在庫持股預估未來出清手續費
  totalUSDividendTax?: number;          // 美股現金股利 30% 預扣稅累計
  frictionImpactPercent: number;        // 摩擦成本佔總資產與獲利之衝擊比例 %
}
```

### 3.2 `TradeRecord` 交易性質標記
```typescript
export type TaxRateCategory = 'STOCK_REGULAR' | 'DAY_TRADING' | 'STOCK_ETF' | 'BOND_ETF_TAX_FREE' | 'CUSTOM';

export interface TradeRecord {
  // ... 既有欄位
  taxRateCategory?: TaxRateCategory;    // 稅率類別 (0.3% / 0.15% / 0.1% / 0% / 自訂)
}
```

---

## 4. UI 與互動體驗更新 (UI Specifications)

1. **摩擦分析中心彈窗 ([`FrictionCenterModal.tsx`](file:///d:/APP/股票紀錄/src/components/FrictionCenterModal.tsx))**：
   - 頂部 KPI 卡片明確展示：
     - `歷史已付摩擦`（台股手續費 + 證交稅 + 美股規費/預扣稅）
     - `已省下券商折讓`（提示「以台股法定牌告 20 元低消標準計算」）
     - `預估出清摩擦`（含債券 ETF 0% 免稅標註）
   - 新增「台美股摩擦成本結構明細」與「稅率規則說明」摺疊面板。
2. **交易紀錄表單 / 記帳對話框**：
   - 在輸入賣出交易時，依標的代碼自動帶入預設稅率類別（普通股票 0.3% / 股票 ETF 0.1% / 債券 ETF 0% / 美股 0%），並提供當沖 0.15% 選項。

---

## 5. 驗收標準 (Acceptance Criteria & Test Matrix)

| 測試場景 | 測試輸入 | 預期結果 |
| :--- | :--- | :--- |
| **小額零股折讓計算** | 買進 2330 成交額 2,000 元，實付手續費 1 元 | 標準費 20 元，省下金額為 $20 - 1 = 19$ 元 |
| **大額現股折讓計算** | 買進 2330 成交額 1,000,000 元，實付 500 元 | 標準費 1,425 元，省下金額為 $1425 - 500 = 925$ 元 |
| **債券 ETF 預估證交稅** | 持有 00679B 毛市值 500,000 元 | 預估賣出證交稅為 **0 元** |
| **股票 ETF 預估證交稅** | 持有 0050 毛市值 500,000 元 | 預估賣出證交稅為 **500 元** (0.1%) |
| **普通股預估證交稅** | 持有 2330 毛市值 500,000 元 | 預估賣出證交稅為 **1,500 元** (0.3%) |
| **美股股息 30% 預扣** | 收到 AAPL 股利 100 USD | 摩擦中心計入 30 USD 預扣稅 |
| **全量測試相容性** | 執行 `npm test` 與 `npm run build` | 100% 通過，TypeScript 0 錯誤 |
