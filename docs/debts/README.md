# 技術債與架構改善索引看板 (Technical Debt Tracker)

本目錄 (`docs/debts/`) 為專案之**架構技術債與非阻擋性改善建議**的集中存放區。

---

## 📋 技術債清單看板 (Debt Registry)

| 編號 | 標題 | 優先級 | 狀態 | 發現來源 | 標籤 | 預計觸發時機 |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| [**0001**](0001-holdings-sort-dry-refactor.md) | 持倉雙階自然排序 DRY 集中化重構 | `P3` | `OPEN` | PR #83 審查 | `Refactor` | 新增第三交易市場或擴充自訂排序時 |
| [**0002**](0002-trade-plan-and-discipline-review.md) | 交易計畫與紀律檢討模組 | `P2` | `RESOLVED` | 需求規格對齊 | `Feature` · `Journal` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0003**](0003-cash-ledger-and-nav-tracking.md) | 現金帳本與資產淨值追蹤系統 | `P2` | `RESOLVED` | 需求規格對齊 | `Feature` · `Accounting` | **已於 v3.9 (ADR #0022) 完整解決** |
| [**0004**](0004-dedicated-dividend-log-view.md) | 專屬股息日誌與年度配息視圖 | `P3` | `OPEN` | 需求規格對齊 | `Feature` · `Dividend` | 使用者指示優化每月被動現金流報表時 |
| [**0005**](0005-enhanced-csv-column-mapping-importer.md) | 增強型 CSV 欄位對齊映射與逐行預覽匯入器 | `P3` | `OPEN` | 需求規格對齊 | `Feature` · `Import` | 使用者需要從第三方券商快速匯入時 |
| [**0006**](0006-statutory-holiday-calendar-and-settlement-precision.md) | 法定國定假日休市日曆與精確交割結算引擎 | `P2` | `RESOLVED` | /ask-matt 審查 | `Accounting` · `Precision` | **已於 v5.6.0 (ADR #0040) 完整解決** |
| [**0007**](0007-indexeddb-storage-and-transaction-safety.md) | 底層儲存遷移至 IndexedDB 與 ACID 事務及快照防呆機制 | `P1` | `RESOLVED` | 金融架構審查 | `Architecture` · `Storage` · `Performance` | **已於 v5.0 (ADR #0032) 完整解決** |
| [**0008**](0008-lot-based-accounting-and-tax-loss-harvesting.md) | 多批次沖銷會計 (FIFO/LIFO/HIFO/Specific Lot) 與稅務最佳化沖銷 | `P1` | `RESOLVED` | 金融架構審查 | `Accounting` · `Tax` · `Engine` | **已於 v5.3 (ADR #0035) 完整解決** |
| [**0009**](0009-margin-pledge-stress-testing-and-margin-call-simulator.md) | 質押維持率極端壓力測試與斷頭追繳預警模擬器 | `P2` | `RESOLVED` | 金融架構審查 | `Risk` · `Margin` · `Quantitative` | **已於 v5.4 (ADR #0037) 完整解決** |
| [**0010**](0010-benchmark-comparison-and-quant-metrics.md) | 大盤基準疊圖 (0050/SPY) 與量化績效指標 (Alpha, Beta, Sharpe, MDD) | `P2` | `RESOLVED` | 金融架構審查 | `Quant` · `Performance` · `Visualization` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0011**](0011-fx-gain-loss-breakdown-and-tax-bracket-alert.md) | 外匯損益獨立拆解與二代健保/海外所得稅階衝擊預警 | `P2` | `OPEN` | 金融架構審查 | `Tax` · `Multi-Currency` · `Accounting` | 使用者申報所得稅或檢視匯率對總報酬影響時 |
| [**0012**](0012-target-allocation-drift-and-rebalancing-optimizer.md) | 資產配置目標偏離 (Drift) 試算與再平衡補單推薦器 | `P3` | `OPEN` | 金融架構審查 | `Portfolio` · `Rebalancing` · `Workflow` | 使用者指示建立資產配置再平衡與目標股債比時 |
| [**0013**](0013-capital-reduction-excess-cash-accounting-and-precision.md) | 現金減資超額退款轉列已實現利得與美股碎股精度收斂 | `P1` | `RESOLVED` | 交易員/工程師審查 | `Accounting` · `Precision` · `Engine` | **已於 v5.2 (ADR #0034) 完整解決** |
| [**0014**](0014-ex-dividend-receivable-smoothing-and-drop-compensation.md) | 除息日至發放日應收股息平滑機制與假性虧損補償 | `P2` | `OPEN` | 交易員/工程師審查 | `Dividend` · `Accounting` · `Precision` | 除息當日未實現損益驟降需平滑顯示時 |
| [**0015**](0015-trader-today-pnl-and-breakeven-price-metrics.md) | 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) | `P1` | `RESOLVED` | 交易員/工程師審查 | `Trader` · `Metrics` · `Holdings` · `UI` | **已於 v5.2 (ADR #0034) 完整解決** |
| [**0016**](0016-stop-loss-take-profit-alerts-and-risk-badges.md) | 移動停損停利風控線設定與觸價警示標籤 | `P2` | `RESOLVED` | 交易員/工程師審查 | `Risk` · `Trader` · `Discipline` · `UI` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0017**](0017-portfolio-leverage-ratio-and-holding-period-quant.md) | 整戶總曝險與淨槓桿率 (Leverage Ratio) 及部位持有天數統計 | `P2` | `RESOLVED` | 交易員/工程師審查 | `Quant` · `Leverage` · `Risk` · `Summary` | **已於 v5.4 (ADR #0037) 完整解決** |
| [**0018**](0018-xirr-engine-and-cashflow-weighted-performance.md) | XIRR 不定期現金流年化報酬率引擎與多維度績效分析 | `P2` | `RESOLVED` | 投資績效量化研究 | `Quant` · `Performance` · `XIRR` · `MWRR` | **已於 v5.1 (ADR #0033) 完整解決** |

---

## 🏛️ 收錄原則與生命週期管理 (Governance & Lifecycle)

### 1. 收錄門檻
- **僅收錄「未在當期 PR 即時修改」之架構改善建議**。
- 若審查提出的問題已在當期 PR 直接修復完成，則**不予建檔**，保持看板純淨。

### 2. 狀態定義 (Status)
- `OPEN`：待處理之架構改善或重構建議。
- `RESOLVED`：已在後續 PR 中完成重構並關閉。
- `WONTFIX`：經架構評估後確認不予實施。

### 3. 優先級劃分 (Priority)
- `P1 (High)`：對未來功能擴充具直接阻礙、影響資料底層安全或核心損益精確度，需於近期排程修復。
- `P2 (Medium)`：具顯著金融會計、量化風控與交易員實戰價值，待下次相關模組重大變更或專題時一併實作。
- `P3 (Low)`：進階決策輔助與代碼整潔度備忘，待特定觸發條件成立時再行抽取。

---

## 📝 新增技術債模板 (Template)

新建技術債時，請於 `docs/debts/` 建立 `XXXX-<short-name>.md` 並遵循四段式標準結構：

```markdown
# 技術債 #XXXX: <簡短標題>

- **狀態**：`OPEN`
- **優先級**：`P1` | `P2` | `P3`
- **發現來源**：PR #<id> / Code Review
- **建立日期**：YYYY-MM-DD
- **標籤**：`Refactor` | `Performance` | `Testing` | `Architecture`

---

## 1. 背景與現狀代碼 (Context & Current Code)
<說明現行代碼位置與實作方式>

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)
<說明技術債本質與為何當期不立即修改>

## 3. 建議重構方案 (Proposed Refactoring Solution)
<提供建議接口、虛擬代碼或架構草案>

## 4. 觸發處理時機 (Trigger Conditions)
<明確指出在何種條件下應啟動此重構>
```
