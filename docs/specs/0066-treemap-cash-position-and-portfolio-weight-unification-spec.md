# 規格書 #0066：樹狀圖納入現金部位與總資產權重統一規格書 (PRD / Tech Spec)

## 📌 執行摘要 (Executive Summary)

本規格旨在解決目前系統「資產配置與持倉分佈」視圖中，樹狀圖 (Treemap) 僅呈現純股票部位（持股合計 100%），而忽略帳戶現金儲備的視圖斷層問題。
透過將**現金部位 (Cash Position)** 作為獨立頂級節點動態注入 Squarified Treemap 計算，並統一將**總資產（台股總市值 + 美股折算總市值 + 現金餘額）**設為全局權重分母，達成：
1. **全資產透視 (Full Asset Visibility)**：投資人一眼掌握整體投資組合中「台股、美股、現金儲備」的真實資產分配比例。
2. **視覺語意清晰 (Visual Semantic Separation)**：現金節點採用中性深灰藍/石板色（`#334155` / `hsla(215, 25%, 27%, 0.85)`）與 0.0% 損益標籤，與紅綠浮動盈虧之持股節點清楚區隔。
3. **三維市場分佈條 (3-Way Market Allocation Bar)**：頂部進度條與標籤同步升級為「🇹🇼 台股 XX.X% | 🇺🇸 美股 XX.X% | 💵 現金 XX.X%」。

- **規格書編號**：#0066
- **關聯模組**：`src/components/AllocationChart.tsx`、`src/components/TreemapChart.tsx`、`src/utils/treemap.ts`、`src/utils/treemap.test.ts`
- **架構依據**：遵循 KISS 原則、防禦性開發與 TDD 規範

---

## 🔍 一、現狀分析與痛點 (Current Limitations & Gap Analysis)

### 1.1 現有代碼與限制分析
1. **樹狀圖僅接收持股陣列**：
   - 目前 [AllocationChart.tsx](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) 僅將 `activeHoldings` 傳給 [TreemapChart.tsx](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx)，缺少 `cashBalanceTwd` 參數傳遞。
   - `TreemapChart` 內部僅以 `activeHoldings` 總市值為分母計算每檔個股 `weight`，導致個股權重被放大（例如：若股票佔 50%、現金佔 50%，原本個股在樹狀圖上顯示的佔比會膨脹 2 倍）。
2. **市場分佈條未包含現金**：
   - 頂部市場比例僅計算 `twValue` 與 `usValue`，進度條只有雙色（藍/紫），當投資人持有高比例現金時，無法直觀看出流動性儲備狀況。
3. **長條清單 (Bars View) 亦缺乏現金展示**：
   - 切換至「權重清單」模式時，清單僅列出股票前 8 大持股，未列入現金項目。

---

## 🏗️ 二、系統架構與資料流 (System Architecture & Data Flow)

```mermaid
flowchart TD
    A[持股部位 activeHoldings] --> C[計算各股票折合台幣市值 valueInTwd]
    B[現金帳本餘額 cashBalanceTwd] --> D[現金部位有效性檢查 cashBalanceTwd > 0]
    
    C --> E[計算總資產分母 TotalAssetsInTwd = Sum(StockTwd) + CashTwd]
    D --> E
    
    E --> F[計算市場權重: twPercent / usPercent / cashPercent]
    F --> G[渲染頂部三段式市場分佈條 & 標籤]
    
    C --> H[TreemapItem 構造器]
    D -->|現金有效時注入| H
    
    H --> I[TreemapItem[] 包含股票 + 現金 CASH_TWD 節點]
    I --> J[Squarified Treemap 佈局演算法 computeTreemapLayout]
    J --> K[TreemapChart 渲染 SVG 幾何區塊與 Tooltip]
```

---

## 🧩 三、核心演算法與資料結構設計 (Core Models & Logic)

### 3.1 現金節點資料結構 (`TreemapItem`)

```typescript
// 當 cashBalanceTwd > 0 時，動態建構並插入至 TreemapItem 列表
const cashItem: TreemapItem = {
  id: 'CASH_TWD',
  symbol: '💵 現金',
  name: 'Cash / 活存與備用金',
  market: 'CASH',
  value: cashBalanceTwd,
  pnlPercent: 0, // 現金損益固定為 0%
};
```

### 3.2 權重與市場比例計算 (Allocation Metrics Formula)

$$TotalAssets = \sum_{h \in Holdings} (MarketValue_h \times FXRate_h) + \max(0, CashBalanceTWD)$$

$$TW\% = \frac{\sum TW\_Value}{TotalAssets} \times 100$$

$$US\% = \frac{\sum US\_Value}{TotalAssets} \times 100$$

$$Cash\% = \frac{\max(0, CashBalanceTWD)}{TotalAssets} \times 100$$

### 3.3 視覺語意與節點樣式映射 (Visual Semantics & Styling)

| 節點類型 | 背景填充顏色 (Fill) | 邊框顏色 (Stroke) | 損益標籤 (PnL Label) | 懸停發光 (Hover Glow) |
| :--- | :--- | :--- | :--- | :--- |
| **獲利持股** | 紅色/綠色（依 Taiwan/International 主題，透明度 0.35~0.90） | 主題獲利色邊框 | `+XX.X%` | 白光高亮 (Filter: Glow) |
| **虧損持股** | 綠色/紅色（依 Taiwan/International 主題，透明度 0.35~0.90） | 主題虧損色邊框 | `-XX.X%` | 白光高亮 (Filter: Glow) |
| **💵 現金部位** | `hsla(215, 25%, 27%, 0.85)` / `#334155` (深灰藍石板色) | `#64748b` (板岩灰) | `0.0%` | 白光高亮 (Filter: Glow) |

---

## 🎨 四、UI / UX 規格細節 (UI Specifications)

### 4.1 頂部市場分佈條
1. **三段式彩色進度條**：
   - 🇹🇼 台股：`#3b82f6` (鮮明藍)
   - 🇺🇸 美股：`#8b5cf6` (典雅紫)
   - 💵 現金：`#10b981` (翡翠綠，代表流動性活水)
2. **右上角佔比標籤**：
   - `🇹🇼 台股 60.5%` (`#60a5fa`)
   - `🇺🇸 美股 24.3%` (`#a78bfa`)
   - `💵 現金 15.2%` (`#34d399`)

### 4.2 樹狀圖節點內文字佈局
- 當節點尺寸足夠時：
  - 第一行：`💵 現金`
  - 第二行：`Cash / 活存與備用金`
  - 第三行：`0.0% (15.2%)`
- 當節點為微小區塊時：自適應隱藏副標題，優先保留 `💵 現金` 與權重佔比。

### 4.3 Tooltip 浮動卡片
- 標題：`💵 現金 (Cash)`
- 類別：`流動資金 / 活存餘額`
- 市值折合：`NT$ 150,000`
- 資產佔比：`15.2%`
- 損益表現：`0.0% (無損益波動)`

---

## 🧪 五、測試矩陣與縫隙規劃 (TDD Test Suite & Test Seams)

遵循紅-綠-重構 (Red-Green-Refactor) 循環，在公開介面建立以下單元測試：

### 5.1 `src/utils/treemap.test.ts`
1. **純股票輸入**：不含現金時，正常計算矩形幾何與面積總和。
2. **股票 + 現金輸入**：含現金節點時，現金節點正確佔據對應權重比例面積，所有節點權重總和為 100%。
3. **純現金輸入 (零持股)**：當投資組合只有現金時，產生 1 個佔滿 100% 視窗的單一現金節點。
4. **零/負現金邊界防禦**：當現金為 0 或小於 0 時，不生成現金節點，不拋出 NaN 異常。

### 5.2 `src/components/AllocationChart.test.tsx`
1. **全資產分母計算**：驗證 `cashBalanceTwd` 傳入時，右上角標籤與進度條包含現金百分比。
2. **Props 傳遞**：驗證 `AllocationChart` 正確將 `cashBalanceTwd` 傳入 `TreemapChart`。

---

## 📋 六、實施步驟與驗收標準 (Implementation Plan)

- [ ] **Step 1**：更新 `TreemapChartProps` 與 `AllocationChartProps`，支援 `cashBalanceTwd`。
- [ ] **Step 2**：在 `TreemapChart.tsx` 整合現金節點構造邏輯與專屬配色映射。
- [ ] **Step 3**：在 `AllocationChart.tsx` 整合三段式市場條與全資產分母計算（樹狀圖與長條圖同步）。
- [ ] **Step 4**：撰寫/更新單元測試，執行 `npm test` 達成 100% 通過。
- [ ] **Step 5**：執行 `npm run build` 確保 0 TypeScript 錯誤。
