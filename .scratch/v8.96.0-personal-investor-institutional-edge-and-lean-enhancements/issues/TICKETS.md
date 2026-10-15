# Issue #254 任務細緻拆解 (Micro-Tickets Breakdown)

本任務集對齊 [Spec 0183](../../../docs/specs/0183-personal-investor-institutional-edge-and-lean-enhancements-spec.md) 與 [ADR 0183](../../../docs/adr/0183-personal-investor-institutional-edge-and-lean-enhancements.md)，將個人投資者微觀防禦系統細緻拆分為 **7 個獨立可驗收的 Micro-Tickets**，杜絕粗放開發，落實 TDD 紅-綠-重構循環。

---

## Ticket 清單總覽

| 票券編號 | 類型 | 模組標題 | 影響範圍 | 驗收標的 | 狀態 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Ticket 01** | `DB/Core` | 數據湖倉 SQLite Schema 擴展與原生遷移 | `sqlite-db-core.cjs` | 擴表與欄位補齊，遷移冪等性測試 | ✅ **完成 (100% 綠燈)** |
| **Ticket 02** | `Engine` | 未來 12 個月現金流投影與枯水期警報引擎 | `projectedCashflowEngine.ts` | 季配/月配/年配投影精確度 100% | ✅ **完成 (100% 綠燈)** |
| **Ticket 03** | `Engine` | 質押維持率急救補水與解質最小還款計算器 | `marginRescueCalculator.ts` | 補水金額無負數、解質計算精確 | ✅ **完成 (100% 綠燈)** |
| **Ticket 04** | `Engine` | 交易初衷審計、凹單攔截與 iPhone 摩擦成本換算 | `behavioralAuditEngine.ts`<br/>`types/stock.ts` | 凹單判定 (60天虧>15%) 與換算 | ✅ **完成 (100% 綠燈)** |
| **Ticket 05** | `Engine` | 二代健保單筆 2 萬拆單防禦與所得稅抵減警報 | `taxOptimizationGuard.ts` | 20,000~25,000 元拆單指引測試 | ✅ **完成 (100% 綠燈)** |
| **Ticket 06** | `Sync` | 每日官方免費開放資料排程 (期交所OI/ETF淨值/回補日) | `sync-tw-market.cjs` | 官方 CSV 容錯解析與冪等落庫 | ✅ **完成 (100% 綠燈)** |
| **Ticket 07** | `UI/UX` | 前端 5 大頁面細緻介面嵌入與全域聯調 | 各 Workspace 元件 | 頁面卡片、互動彈窗與手動驗證 | ✅ **完成 (100% 綠燈)** |

---

## 各 Ticket 細部規格

### Ticket 01: 數據湖倉 SQLite Schema 擴展與原生遷移
- **目標**：在 `scripts/market-sync/sqlite-db-core.cjs` 中建立 `etf_daily_nav` 表，擴充 `macro_sentiment_daily`（期貨 OI）與 `corporate_action_calendar`（回補與停牌日）。
- **關鍵邊界**：
  - 欄位追加必須具備冪等性（`PRAGMA table_info` 檢查，避免已存在時噴錯）。
- **測試接縫**：`sqliteLakehouseExtension.test.ts`。

### Ticket 02: 未來 12 個月現金流投影與枯水期警報引擎
- **目標**：建立 `src/engine/projectedCashflowEngine.ts`。
- **輸入**：持股列表、除息記錄與公司行動日曆。
- **計算項目**：
  - 依標的除息頻率（月配、季配、半年配、年配）預估入帳月份與金額。
  - 計算月平均入帳與「枯水期閥值 (低於月均 50%)」。
  - 提出枯水月份之配息月份互補標的建議。
- **測試接縫**：`projectedCashflowEngine.test.ts`。

### Ticket 03: 質押維持率急救補水與解質最小還款計算器
- **目標**：建立 `src/engine/marginRescueCalculator.ts`。
- **計算項目**：
  - 給定目標安全維持率（如 160%），計算「需補繳現金金額」與「需補抵押品市值」。
  - 邊界防禦：當前維持率 $\ge$ 目標時，補繳金額為 0，嚴禁負數。
  - 解質股票試算：輸入擬領回標的與張數，計算維持在安全線下「需先償還借款本金」數額。
- **測試接縫**：`marginRescueCalculator.test.ts`。

### Ticket 04: 交易初衷審計、凹單攔截與 iPhone 摩擦成本換算
- **目標**：擴充 `src/types/stock.ts` 新增 `tradeIntent: 'DIVIDEND' | 'SWING' | 'DAY_TRADE'`；在 `src/engine/behavioralAuditEngine.ts` 新增凹單與摩擦成本計算。
- **判定規則**：
  - 凹單：`intent === 'SWING'` 且持有天數 $> 60$ 且未實現虧損率 $> 15\%$。
  - 存股豁免：`intent === 'DIVIDEND'` 不受凹單警報干擾。
  - 摩擦成本：累計手續費 + 證交稅除以 40,000 元換算頂配 iPhone 數量。
- **測試接縫**：`behavioralAuditEngine.test.ts`。

### Ticket 05: 二代健保單筆 2 萬拆單防禦與所得稅抵減警報
- **目標**：建立 `src/engine/taxOptimizationGuard.ts`。
- **判定規則**：
  - 單筆預估現金股息介於 20,000 ~ 25,000 元時觸發拆單指引。
  - 計算除息前應調節賣出股數：$\text{Target Shares} = \lfloor \frac{19,999}{\text{Cash Dividend Per Share}} \rfloor$。
  - 統計當年度 8.5% 股利抵扣稅額餘額與個人綜所稅跳級預防。
- **測試接縫**：`taxOptimizationGuard.test.ts`。

### Ticket 06: 每日官方免費開放資料排程
- **目標**：擴充 `scripts/market-sync/sync-tw-market.cjs`。
- **抓取內容**：
  - 期交所三大法人台指期未平倉 CSV（落庫至 `macro_sentiment_daily`）。
  - 證交所 ETF 官方收盤淨值與折溢價（落庫至 `etf_daily_nav`）。
  - 證交所融券強制回補日公告（落庫至 `corporate_action_calendar`）。
- **關鍵防禦**：網絡異常時靜默降級，不中斷整體行情同步流程。
- **測試接縫**：`syncFuturesOiAndEtfNav.test.ts`。

### Ticket 07: 前端 5 大頁面細緻介面嵌入與全域聯調
- **目標**：
  - `dividend` 頁面：嵌入未來 12 個月現金流看板與二代健保拆單標籤。
  - `cash` 頁面 / `MarginStressModal`：嵌入維持率急救補水面板與解質試算。
  - `portfolio` 頁面：標的清單亮起「凹單警報」、「融券回補倒數」與「ETF 溢價過熱」。
  - `behavioral` 頁面：頂部嵌入 iPhone 摩擦成本視覺化卡片。
  - `warroom` 頁面：嵌入外資期貨淨留倉指針。
- **驗收**：全專案 `npm test` 通過率 100%，`npm run build` TypeScript 0 錯誤。
