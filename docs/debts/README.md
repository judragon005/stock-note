# 技術債與架構改善索引看板 (Technical Debt Tracker)

本目錄 (`docs/debts/`) 為專案之**架構技術債與非阻擋性改善建議**的集中存放區。

---

## 📋 技術債清單看板 (Debt Registry)

| 編號 | 標題 | 優先級 | 狀態 | 發現來源 | 標籤 | 預計觸發時機 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| [**0001**](0001-holdings-sort-dry-refactor.md) | 持倉雙階自然排序 DRY 集中化重構 | `P3` | `OPEN` | PR #83 審查 | `Refactor` | 新增第三交易市場或擴充自訂排序時 |
| [**0002**](0002-trade-plan-and-discipline-review.md) | 交易計畫與紀律檢討模組 | `P2` | `RESOLVED` | 需求規格對齊 | `Feature` · `Journal` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0003**](0003-cash-ledger-and-nav-tracking.md) | 現金帳本與資產淨值追蹤系統 | `P2` | `RESOLVED` | 需求規格對齊 | `Feature` · `Accounting` | **已於 v3.9 (ADR #0022) 完整解決** |
| [**0004**](0004-dedicated-dividend-log-view.md) | 專屬股息日誌與年度配息視圖 | `P3` | `RESOLVED` | 需求規格對齊 | `Feature` · `Dividend` | **已於 v6.1.0 (PRD #0049) 完整解決** |
| [**0005**](0005-enhanced-csv-column-mapping-importer.md) | 增強型 CSV 欄位對齊映射與逐行預覽匯入器 | `P3` | `RESOLVED` | 需求規格對齊 | `Feature` · `Import` | **已於 v6.9.6 (ADR #0063) 完整解決** |
| [**0006**](0006-statutory-holiday-calendar-and-settlement-precision.md) | 法定國定假日休市日曆與精確交割結算引擎 | `P2` | `RESOLVED` | /ask-matt 審查 | `Accounting` · `Precision` | **已於 v5.6.0 (ADR #0040) 完整解決** |
| [**0007**](0007-indexeddb-storage-and-transaction-safety.md) | 底層儲存遷移至 IndexedDB 與 ACID 事務及快照防呆機制 | `P1` | `RESOLVED` | 金融架構審查 | `Architecture` · `Storage` · `Performance` | **已於 v5.0 (ADR #0032) 完整解決** |
| [**0008**](0008-lot-based-accounting-and-tax-loss-harvesting.md) | 多批次沖銷會計 (FIFO/LIFO/HIFO/Specific Lot) 與稅務最佳化沖銷 | `P1` | `RESOLVED` | 金融架構審查 | `Accounting` · `Tax` · `Engine` | **已於 v5.3 (ADR #0035) 完整解決** |
| [**0009**](0009-margin-pledge-stress-testing-and-margin-call-simulator.md) | 質押維持率極端壓力測試與斷頭追繳預警模擬器 | `P2` | `RESOLVED` | 金融架構審查 | `Risk` · `Margin` · `Quantitative` | **已於 v5.4 (ADR #0037) 完整解決** |
| [**0010**](0010-benchmark-comparison-and-quant-metrics.md) | 大盤基準疊圖 (0050/SPY) 與量化績效指標 (Alpha, Beta, Sharpe, MDD) | `P2` | `RESOLVED` | 金融架構審查 | `Quant` · `Performance` · `Visualization` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0011**](0011-fx-gain-loss-breakdown-and-tax-bracket-alert.md) | 外匯損益獨立拆解與二代健保/海外所得稅階衝擊預警 | `P2` | `RESOLVED` | 金融架構審查 | `Tax` · `Multi-Currency` · `Accounting` | **已於 v6.1.0 (PRD #0049) 完整解決** |
| [**0012**](0012-target-allocation-drift-and-rebalancing-optimizer.md) | 資產配置目標偏離 (Drift) 試算與再平衡補單推薦器 | `P3` | `RESOLVED` | 金融架構審查 | `Portfolio` · `Rebalancing` · `Workflow` | **已於 v7.0.0 (PRD #0065) 完整解決** |
| [**0013**](0013-capital-reduction-excess-cash-accounting-and-precision.md) | 現金減資超額退款轉列已實現利得與美股碎股精度收斂 | `P1` | `RESOLVED` | 交易員/工程師審查 | `Accounting` · `Precision` · `Engine` | **已於 v5.2 (ADR #0034) 完整解決** |
| [**0014**](0014-ex-dividend-receivable-smoothing-and-drop-compensation.md) | 除息日至發放日應收股息平滑機制與假性虧損補償 | `P2` | `RESOLVED` | 交易員/工程師審查 | `Dividend` · `Accounting` · `Precision` | **已於 v6.1.0 (PRD #0049) 完整解決** |
| [**0015**](0015-trader-today-pnl-and-breakeven-price-metrics.md) | 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) | `P1` | `RESOLVED` | 交易員/工程師審查 | `Trader` · `Metrics` · `Holdings` · `UI` | **已於 v5.2 (ADR #0034) 完整解決** |
| [**0016**](0016-stop-loss-take-profit-alerts-and-risk-badges.md) | 移動停損停利風控線設定與觸價警示標籤 | `P2` | `RESOLVED` | 交易員/工程師審查 | `Risk` · `Trader` · `Discipline` · `UI` | **已於 v5.7 (ADR #0041) 完整解決** |
| [**0017**](0017-portfolio-leverage-ratio-and-holding-period-quant.md) | 整戶總曝險與淨槓桿率 (Leverage Ratio) 及部位持有天數統計 | `P2` | `RESOLVED` | 交易員/工程師審查 | `Quant` · `Leverage` · `Risk` · `Summary` | **已於 v5.4 (ADR #0037) 完整解決** |
| [**0018**](0018-xirr-engine-and-cashflow-weighted-performance.md) | XIRR 不定期現金流年化報酬率引擎與多維度績效分析 | `P2` | `RESOLVED` | 投資績效量化研究 | `Quant` · `Performance` · `XIRR` · `MWRR` | **已於 v5.1 (ADR #0033) 完整解決** |
| [**0019**](0019-local-historical-indicators-and-external-backfill-engine.md) | 本地全量歷史技術指標庫與免費外部資源自動回補引擎 (含肌肉書僮量化體系) | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Quant` · `Indicators` · `MuscleBooker` · `Storage` | **已於 v8.10.0 (ADR #0091) 完整解決** |
| [**0020**](0020-market-war-room-macro-liquidity-and-ai-advisor.md) | 宏觀戰情室、全球流動性監控與 AI 智慧每日操作決策儀表板 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `Macro` · `WarRoom` · `AI-Advisor` · `Dashboard` | **已於 v8.13.0 (ADR #0094) 完整解決** |
| [**0021**](0021-smart-dca-simulator-and-cashflow-scheduler.md) | 定期定額 (DCA) 智慧回測、執行偏離度與扣款交割防透支引擎 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `DCA` · `Cashflow` · `Simulation` · `Discipline` | **已於 v8.31.0 (ADR #0112) 完整解決** |
| [**0022**](0022-monte-carlo-fire-and-safe-withdrawal-simulator.md) | 蒙地卡羅退休提領 (FIRE) 與安全提領率 (SWR) 模擬器 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `Quant` · `FIRE` · `Simulation` · `Retirement` | **已於 v8.31.0 (ADR #0112) 完整解決** |
| [**0023**](0023-pwa-offline-first-and-e2ee-cloud-sync.md) | 離線優先 PWA 與 E2EE 零知識端對端加密雲端同步 | `P3` | `OPEN` | /grill-with-docs 需求調研 | `Architecture` · `PWA` · `E2EE` · `Storage` · `Security` · `Sync` | 跨裝置同步或 PWA 離線安裝化時 |
| [**0024**](0024-etf-look-through-and-sector-factor-concentration.md) | ETF 穿透式成分股透視 (Look-Through) 與產業因子集中度分析 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `Quant` · `ETF` · `Holdings` · `LookThrough` | **已於 v8.34.0 (ADR #0115) 完整解決** |
| [**0025**](0025-ex-dividend-and-black-swan-margin-stress-matrix.md) | 除權息與黑天鵝多維動態壓力測試矩陣與斷頭逃生模擬器 | `P1` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `Risk` · `Margin` · `Pledge` · `StressTest` | **已於 v8.12.0 (ADR #0093) 完整解決** |
| [**0026**](0026-trading-behavioral-bias-and-psychology-audit.md) | 交易行為心理學與情緒偏誤量化覆盤審查系統 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `BehavioralFinance` · `Trader` · `Discipline` · `Quant` | **已於 v8.34.0 (ADR #0115) 完整解決** |
| [**0027**](0027-dual-momentum-and-relative-strength-rotation.md) | 雙重動能與跨資產趨勢輪動評分引擎 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Quant` · `DualMomentum` · `AssetAllocation` · `Strategy` | **已於 v8.11.0 (ADR #0092) 完整解決** |
| [**0028**](0028-multi-broker-reconciliation-and-smart-import-conflict-resolver.md) | 跨券商持倉對賬審計與匯入衝突智能消解器 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Architecture` · `Reconciliation` · `Import` · `Integrity` | **已於 v8.34.0 (ADR #0115) 完整解決** |
| [**0029**](0029-drip-compounding-engine-and-cash-flow-growth-forecaster.md) | DRIP 股利再投資與被動現金流複利滾雪球預測器 | `P2` | `RESOLVED` | /grill-with-docs 需求調研 | `Dividend` · `DRIP` · `Compounding` · `FIRE` · `Forecasting` | **已於 v8.31.0 (ADR #0112) 完整解決** |
| [**0030**](0030-web-crypto-api-key-encryption-and-secure-storage.md) | Web Crypto API 敏感金鑰加密與端到端保密持久化 | `P1` | `RESOLVED` | 資安架構深度審查 | `Security` · `Cryptography` · `Storage` · `Privacy` · `WebCrypto` | **已於 v8.35.0 (ADR #0116) 完整解決** |
| [**0031**](0031-cors-proxy-credential-leak-prevention-and-safe-routing.md) | 公共 CORS 代理憑證防洩漏與安全邊界路由機制 | `P1` | `RESOLVED` | 資安架構深度審查 | `Security` · `Network` · `CORS` · `Privacy` · `MITM` | **已於 v8.35.0 (ADR #0116) 完整解決** |
| [**0032**](0032-csv-formula-injection-and-json-data-sanitization.md) | CSV 公式注入防禦 (DDE Protection) 與備份匯出脫敏機制 | `P2` | `RESOLVED` | 資安架構深度審查 | `Security` · `CSV` · `Injection` · `Export` · `Sanitization` | **已於 v8.35.0 (ADR #0116) 完整解決** |
| [**0033**](0033-csp-headers-and-browser-defense-hardening.md) | 內容安全策略 (CSP) 與瀏覽器端防禦加固 | `P1` | `OPEN` | 資安架構深度審查 | `Security` · `CSP` · `Headers` · `BrowserHardening` · `AntiClickjacking` | 發布正式生產版本或雲端託管部署時 |
| [**0034**](0034-import-parser-prototype-pollution-and-schema-validation.md) | 匯入解析防護、原型污染防禦與數值邊界熔斷 | `P2` | `OPEN` | 資安架構深度審查 | `Security` · `PrototypePollution` · `Validation` · `Sanitization` · `Schema` | 升級匯入衝突消解器 (Debt #0028) 或快照校驗時 |
| [**0035**](0035-client-side-rate-limiting-and-api-quota-guard.md) | 客戶端 API 速率限制 (Rate Limiting) 與防封禁配額保護 | `P2` | `RESOLVED` | 資安架構深度審查 | `Security` · `RateLimiting` · `Quota` · `Resilience` · `CircuitBreaker` | **已於 v8.9.0 (ADR #0090) 完整解決** |

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
