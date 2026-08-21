# ADR-0011: 雙軌會計口徑計算模型與官方標的數據校正架構

- **狀態**：ACCEPTED
- **日期**：2026-08-21
- **關聯 PRD**：[SPEC-0011: V2.0 雙軌會計口徑系統與官方標的數據全面校準](../specs/0011-dual-accounting-mode-and-official-symbols-alignment.md)

---

## 1. 背景與問題 (Context)

使用者在核對證券商 App（國泰/富邦等）之「台股庫存總市值」與本系統時，發現兩者存在差額（例如網頁顯示毛市值 1,316 萬，券商 App 顯示含稅市值 1,312 萬，差額約 4.2 萬；付出成本亦有差異）。
經深入解構，主因在於券商 App 與個人投資分析工具採用了不同的會計與呈現維度：
1. **券商 App 視角**：採用「不含息（純買入加權成本）、含稅（扣除預估全數賣出之證交稅與手續費）」的**淨清算變現價值 (Net Liquidation Value)**。
2. **長期投資分析視角**：採用「含息（加計歷史累計已領股息之總回報 Total Return）、毛市值（未扣稅之客觀資產價值）」的**總回報與資產負債價值 (Gross Market Value)**。

此外，2026 年新掛牌之 ETF 標的（`00403A`、`009816`、`00981A`、`009826`）在先前範本中存在名稱誤植，需全面對齊台灣證券交易所 (TWSE) 官方標準。

---

## 2. 決策方案 (Decision)

### 2.1 雙軌會計計算模型 (Dual Accounting Calculation Engine)
在 `src/engine/calculator.ts` 中擴充計算引擎，統一計算並輸出雙軌數據：
- 為每個 `HoldingPosition` 計算：
  - `grossMarketValue`：毛市值 = $\text{shares} \times \text{currentPrice}$
  - `estimatedSellTax`：預估賣出證券交易稅（台股現股 $0.3\%$、台股 ETF $0.1\%$、美股 $0$）
  - `estimatedSellFee`：預估賣出手續費（台股 $0.1425\%$ 搭配預設折讓，最低 20 元）
  - `netMarketValue`：含稅淨市值 = $\text{grossMarketValue} - \text{estimatedSellTax} - \text{estimatedSellFee}$
  - `brokerCostBasis`：不含息原始付出成本
  - `unrealizedPnLBroker`：券商口徑未實現損益 = $\text{netMarketValue} - \text{brokerCostBasis}$
  - `unrealizedPnLBrokerPercent`：券商口徑報酬率%
  - `totalReturnPnL`：總回報損益 = $(\text{grossMarketValue} - \text{brokerCostBasis}) + \text{totalDividends} + \text{realizedPnL}$
  - `totalReturnPercent`：總回報率%

### 2.2 全域視角切換與狀態持久化 (Global View Toggle & Persistence)
- 定義 `AccountingView = 'BROKER' | 'TOTAL_RETURN'` 類型。
- 透過 `localStorage` 鍵值 `STOCK_TRACKER_ACCOUNTING_VIEW_V1` 保存使用者偏好。
- 在頂部導覽列提供膠囊型切換開關，總覽卡片與持倉表格依當前視角切換主標題，並以小字雙層標註另一維度之數據。

### 2.3 官方標的名稱單一事實來源校準 (Official Symbol Alignment)
- 將 `clean_trades_import_latest.json`、`CONTEXT.md`、`README.md` 中的標的名稱全面校準為官方證券簡稱：
  - `00403A` ➔ 主動統一升級50
  - `009816` ➔ 凱基台灣TOP50
  - `00981A` ➔ 主動統一台股增長
  - `009826` ➔ 貝萊德世界股票

---

## 3. 影響評估 (Consequences)

### 正面影響 (Pros)
- **零認知負擔對帳**：切換至「券商核帳模式」時，資產市值、總付出成本與損益率可與券商 App 100% 吻合。
- **兼顧總報酬分析**：切換至「總回報模式」時，能完整展現長期存股與高股息 ETF 之真實複利成果。
- **標的名稱無歧異**：符合證交所與投信官方名稱，杜絕任何名稱誤導。

### 潛在權衡 (Trade-offs)
- 券商手續費折讓率可能因人而異（例如大戶 28 折、一般戶 6 折），計算引擎預設提供標準折讓，後續可擴充為自訂手續費折讓參數。
