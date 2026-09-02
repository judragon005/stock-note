# ADR 0066: 樹狀圖納入現金部位與總資產權重統一架構 (Treemap Cash Position & Unified Weight Architecture)

## 狀態
已採納 (Accepted)

## 上下文 (Context)
在原有設計中，「資產配置與持倉分佈」視圖的樹狀圖 (Treemap) 與長條清單僅計算純股票部位之相對市值比例，忽略了投資組合中的現金儲備 (Cash Position)。
這導致：
1. 當投資人持有高額現金或進行動態避險時，樹狀圖無法呈現真實的全資產配置輪廓；
2. 上方市場分佈進度條僅有台股與美股雙色，缺少流動資金維度；
3. 長條圖與樹狀圖計算分母與實際總資產有認知偏差。

## 決策 (Decision)

1. **全資產分母統一 (Unified Total Asset Denominator)**：
   - 統一將總資產設為全局分母：$$\text{TotalAssets} = \sum (\text{StockValue}_{\text{TWD}}) + \max(0, \text{CashBalance}_{\text{TWD}})$$
   - 所有個股、市場類別與現金之權重百分比均以 $\text{TotalAssets}$ 為基準計算。

2. **動態注入現金節點 (Dynamic Cash Injection)**：
   - 當 `cashBalanceTwd > 0` 時，自動在 `TreemapItem` 清單中注入 `{ id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash / 活存與備用金', market: 'CASH', value: cashBalanceTwd, pnlPercent: 0 }`。
   - `TreemapItem.market` 擴充型別為 `MarketType | 'CASH'`。

3. **視覺語意分離 (Visual Semantic Separation)**：
   - 現金節點採用專屬**中性深灰藍石板色**（`hsla(215, 25%, 27%, 0.85)` / `#334155`）搭配板岩灰邊框（`#64748b`），損益標示固定為 `0.0%`。
   - 頂部市場分佈進度條升級為三段式：🇹🇼 台股 (`#3b82f6`)、🇺🇸 美股 (`#8b5cf6`)、💵 現金 (`#10b981`)。

4. **零/負現金邊界防禦**：
   - 遇 $0$ 或負數現金餘額時，自動過濾不產生節點，防止 Treemap 幾何產生 NaN 或異常。

## 後果 (Consequences)
- **正面效益**：
  - 投資人可隨時一覽完整的「股債現」全景資產配置比例。
  - 樹狀圖與權重清單完全互洽，消除視圖資訊孤島。
  - 單元測試覆蓋純股票、股票+現金、純現金與極限邊界，確保高穩定性。
- **後續維護**：
  - 若未來支援外幣現金帳戶（如 USD 現金），可透過既有匯率轉換引擎統一折合 TWD 傳入。
