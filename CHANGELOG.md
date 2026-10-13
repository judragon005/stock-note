# 更新日誌 (CHANGELOG)

本專案記錄所有關鍵里程碑、架構決策 (ADR) 與 PRD 規格書之迭代演進歷程。

---

## [V8.90.0] - 2026-10-13
### 專案全量文檔完整性稽核、死鏈全數修復、變更日誌補齊與自動化守門機制
- **歷史跳號與決策斷層閉環**：對齊 Issue #135 建立 `Spec 0153` 與 `ADR 0153`，補齊 `ADR 0175` 與 `.scratch/v8.87/` 鏡像。
- **目錄結構去重與根目錄淨化**：將 `docs/handover/` 遷回 `docs/handoff/` 並移除冗餘目錄；根目錄備份移入 `docs/json/` 並補齊 MIT `LICENSE`。
- **全域死鏈清零**：重命名 Spec 0171 為 `-spec.md`；全面修復交接總手冊、`CONTEXT.md`、Spec 0151/0152 與 `docs/debts/` 內相對路徑。
- **自動化文檔守門機制 (`scripts/verify-docs.cjs` & `npm run lint:docs`)**：零依賴驗證器，自動防禦死鏈、Spec/ADR 1:1 成對性與檔名規範。
- **關聯文件**：[SPEC-0178](docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md) · [ADR-0178](docs/adr/0178-documentation-integrity-audit-broken-links-repair-and-linter.md) · Issue #220。

---

## [V8.89.0] - 2026-10-13
### TDCC 集保大戶與月營收全自動新鮮度管線、主 K 線雙灰線修復與券商法人色譜
- **自動新鮮度自癒管線 (`marketFreshnessService.cjs`)**：純函數動態推算台股週五 21:00 TDCC 集保與每月 10 日 17:30 月營收結算錨點，自動於背景發起無感入庫。
- **主 K 線雙灰色橫線修復 (`AiForceInteractiveKline.tsx`)**：消除主圖與副圖重疊之 10px 雙線，收斂為單一俐落分割線。
- **券商法人級 MA 色譜重構**：MA5 亮黃、MA10 青藍、MA20 洋紅、MA60 亮橘實線、MA250 尊爵紫，徹底消除色相混淆。
- **關聯文件**：[SPEC-0177](docs/specs/0177-auto-sync-tdcc-revenue-and-kline-institutional-spectrum-spec.md) · [ADR-0177](docs/adr/0177-auto-sync-tdcc-revenue-and-kline-institutional-spectrum.md) · Issue #217 · PR #218。

---

## [V8.88.0] - 2026-10-13
### Card 18 主力追蹤總評判操盤指引升級、5 態作戰光譜圖例與機構級風控門檻
- **5 態微型作戰光譜圖例條 (Micro Spectrum Bar)**：26px 高度橫向導航條，直觀指引超跌反彈、低接吸籌、鎖碼推升、高檔調節與區間震盪。
- **中央雙層 Bento 操盤結構**：整合語意微觀解析與四合一操盤指引（週期、執行策、關鍵防守/目標點位、失效條件）。
- **三軌色彩認知體系校正**：低接吸籌校正為科技藍 `#38bdf8`（● 偏多承接），多頭攻擊 `#ef4444`，區間警戒 `#f59e0b`。
- **關聯文件**：[SPEC-0176](docs/specs/0176-ai-force-card18-verdict-playbook-color-spectrum-and-institutional-gate-spec.md) · [ADR-0176](docs/adr/0176-card18-verdict-playbook-and-color-spectrum.md) · Issue #214 · PR #215。

---

## [V8.87.0] - 2026-10-09
### 外部金融 API 控制台探針修復、CSP/CORS 網路防禦與 NAS 通用反向代理
- **CSP 安全白名單對齊**：擴充 `WHITELISTED_CONNECT_DOMAINS` 涵蓋 Finnhub、FRED、Polygon、CoinGecko 與 SEC。
- **探針端點與代理感知升級**：FMP 探針切換至 `/stable/quote` 免費相容端點；FRED 探針支援 Proxy 代理轉發。
- **NAS 通用反向代理**：`prod-server.cjs` 增設 `/api/proxy` 通用安全反代通道，具備 SSRF 防禦。
- **關聯文件**：[SPEC-0175](docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md) · [ADR-0175](docs/adr/0175-api-key-probe-csp-cors-and-endpoint-repair.md) · Issue #209 · PR #212, #213。

---

## [V8.86.0] - 2026-10-09
### 主力戰情室視覺大師級版面重構、TermTooltip 500px 旗艦升級與籌碼熱區 1:1 對位
- **TermTooltip 500px 旗艦視覺升級**：多維度名詞解釋浮窗，具備防止滾動穿透與智慧邊界避讓。
- **籌碼熱區 1:1 像素對位**：精確貼合主力吸籌價位帶與支撐壓力分佈。
- **關聯文件**：[SPEC-0174](docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md) · [ADR-0174](docs/adr/0174-ai-force-dashboard-visual-master-layout-and-tooltip.md) · Issue #203, #205 · PR #204, #206。

---

## [V8.84.0] - 2026-10-08
### 主力戰情室 7 層 Bento-Grid 全景佈局重構、量化引擎修復與專業任務視圖升級
- **7 層 Bento-Grid 自然流佈局**：重構 Card 01~18 之排列階層與視圖空間。
- **量化引擎修復與 5 大任務視圖**：整合短線動能、波段籌碼、價值防守、機構對象與原始數據。
- **關聯文件**：[SPEC-0172](docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md) · [ADR-0172](docs/adr/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor.md) · Issue #195 · PR #196。

---

## [V8.81.0] - 2026-10-05
### 台美雙軌零 CSV 歷史回補、真實成交筆數入庫與統一金融金鑰控制中心
- **全自動零 CSV 歷史回補**：擺脫人工下載匯入 CSV，直連交易所與 Yahoo 批次高速拉取。
- **統一金鑰控制中心 (`UnifiedApiKeyManager`)**：集中式管理 FinMind、FMP、FRED、AlphaVantage 與 Finnhub 金鑰池。
- **關聯文件**：[SPEC-0168](docs/specs/0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md) · [ADR-0168](docs/adr/0168-zero-csv-dual-market-backfill-and-unified-api-key-console.md) · Issue #182 · PR #183。

---

## [V8.76.0] - 2026-10-03
### 券商法人級全維度數據湖倉稽核、歷史籌碼斷層回補與 SQLite 湖倉管線
- **本地 SQLite 數據湖倉 (`sqliteLakehouse.ts`)**：高效能離線本地儲存全市場歷史 K 線、TDCC 股權分散表與三大法人籌碼。
- **斷層自動回補機制**：自動稽核空缺並精準調用免費端點回補。
- **關聯文件**：[SPEC-0163](docs/specs/0163-broker-grade-lakehouse-audit-full-backfill-and-dual-market-sync-spec.md) · [ADR-0163](docs/adr/0163-broker-grade-lakehouse-audit-full-backfill-and-dual-market-sync.md) · Issue #159。

---

## [V8.53.0] - 2026-09-26
### AI 主力戰情室決策儀表板全新發布 (AI Force Decision Dashboard)
- **18 張專業卡片 Bento-Grid 網格體系**：涵蓋多空攻防、主力成本、量價結構與量化總評判。
- **原生 SVG 高效能互動 K 線圖**：毫秒級平移縮放與多指標疊圖。
- **關聯文件**：[SPEC-0140](docs/specs/0140-ai-force-decision-dashboard-spec.md) · [ADR-0140](docs/adr/0140-ai-force-decision-dashboard-architecture.md) · Issue #93。

---

## [V8.10.0 ~ V8.52.0] - 2026-09-08 ~ 2026-09-25
### FIRE 複利模擬、ETF 穿透審計、穿透式財報法醫分析與全市場排程日更
- **FIRE 複利試算與 DCA 定期定額模擬器 (v8.31.0)**：支援動態再平衡與退休金提領蒙地卡羅情境分析。
- **穿透式財報法醫深度分析儀 (v8.42.0 ~ v8.44.0)**：三大報表勾稽、董監持股質押率、杜邦分析與盈餘品質雷達。
- **全市場歷史定時同步中樞 (v8.47.0 ~ v8.48.0)**：收盤後自動背景批次更迭全市場日歷 SSOT。
- **統一借貸結清引擎 DRY 重構 (v8.52.0)**：全數消滅重複扣款與多幣別借貸記帳偏差。

---

## [V7.0.0 ~ V7.9.0] - 2026-09-02 ~ 2026-09-07
### 目標配置再平衡優化、持倉訊號膠囊與主力資金流向氣泡圖
- **目標資產配置漂移再平衡 (v7.0.0)**：精算現金水位、偏離度警示與補單推薦器。
- **持倉技術訊號膠囊 (v7.2.0)**：在個股列表直接呈現乖離率、趨勢位階與操盤建議膠囊。
- **主力資金流向氣泡圖與 TPEX 櫃買官方解析器 V3 (v7.7.0 ~ v8.2.0)**：動態向量氣泡渲染三大法人多日買賣超時序演變。

---

## [V6.0.0 ~ V6.9.7] - 2026-08-28 ~ 2026-09-01
### 官方標的字典庫、除權息時態分離入帳與本地存儲檢驗器
- **官方台美股字典庫與智能搜尋 (v6.0.0)**：離線秒級搜尋上市櫃全市場 2,000+ 檔標的名稱與代碼。
- **除息日與發放日時態分離入帳 (v6.2.0)**：除息日即時平滑股價跳空缺口，發放日自動歸戶現金帳本。
- **現金減資流水線 (v6.5.0)**：自動等比調整未沖銷批次股數與現金退款記帳。
- **LocalStorage 資料透明度中心 (v6.6.0)**：視覺化檢查、備份與修復本機儲存資料結構。

---

## [V5.9.0] - 2026-08-28
### 嘉信理財對帳單像素級對齊、利息智能正規化與美股股息毛額雙筆記帳架構
- **美股股息毛額雙筆記帳架構 (`src/engine/cashLedgerEngine.ts`)**：
  - 美股現金股利流水統一以「稅前毛額（Gross）」入帳，精準還原嘉信理財官方 `DOI（毛股息入帳）` + `JRN（30% 預扣稅扣除）` 的標準金流模型，徹底消除毛淨額混淆與重複扣稅風險。
- **利息備註智能正規化引擎 (`normalizeInterestName`)**：
  - 全面支援中文全形逗號 `，`、半形 `,`、冒號 `：`、各類破折號（`-`、`~`、`–`、`—`）與日期區間截斷，確保跨月份同券商利息 100% 合併為單一膠囊（`💵 Schwab 嘉信理財-現金利息 +$1.00 USD`）。
- **券商底層高精度計算規則注入 (`TradeHistoryTable.tsx` & `storage.ts`)**：
  - 交易歷史明細支援 4 位高精度每股配息（DPS：`USD 0.5627` 與 `USD 0.3273`），結算金額統一以毛額呈現（`+USD 45.09` 與 `+USD 26.18`），徹底消除小數點乘除浮點截斷誤差。
  - 實作 `autoReconcileSchwabRecords` 冪等式自動對齊模組，精準貼合嘉信交割戶真實現金餘額 `$224.79 USD`。
- **關聯文件**：[SPEC-0047](docs/specs/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend-spec.md) · [ADR-0047](docs/adr/0047-schwab-drip-reconciliation-smart-interest-normalization-and-gross-dividend.md)。

---

## [V5.8.0] - 2026-08-28
### 零負債槓桿歸零 0.00x、利息依券商聚合與預扣稅分離、流水帳股息雙向同步全域連動
- **零負債淨槓桿歸零 (`src/engine/riskExposureEngine.ts`)**：
  - 當帳戶無任何借貸/質押負債時，淨槓桿與總槓桿一律評定為 `0.00x`，徽章顯示「穩健無槓桿 (≤1.0x)」。
- **利息依券商聚合與預扣稅分拆 (`src/components/SummaryCards.tsx`)**：
  - 被動收益卡片分拆「美股股息預扣」與「利息預扣」兩顆獨立膠囊。
- **現金流水帳 ➔ Trade 雙向連動 (`CashLedgerWorkspace.tsx` & `App.tsx`)**：
  - 編輯流水帳股息金額時，自動雙向更新 Trade 原始紀錄並即時重算全域 NAV 與現金水位。
- **關聯文件**：[SPEC-0046](docs/specs/0046-zero-debt-leverage-zeroing-and-bidirectional-cash-trade-sync.md) · [ADR-0046](docs/adr/0046-zero-debt-leverage-zeroing-and-bidirectional-cash-trade-sync.md)。

---

## [V5.3] - 2026-08-27
### 多批次沖銷會計 (FIFO/LIFO/HIFO/Specific Lot) 與稅務最佳化沖銷系統 (唯一 P1 技術債 #0008 完整解決)
- **多批次沖銷核心演算法引擎 (`src/engine/lotEngine.ts`)**：
  - 支援五大沖銷會計模式：`MOVING_AVERAGE`（預設）、`FIFO`、`LIFO`、`HIFO`（節稅收割首選）與 `SPECIFIC_LOT`。
  - **移動平均法加權平均持有天數 (Weighted Average Holding Days)**：依在席所有 Lots 剩餘股數權重加權平均買進日與持股天數，精確判定長短期資本利得。
  - **浮點數剩餘差額扣除法 (Residual Balance Deduction)**：對最後一筆批次以剩餘差額扣除，徹底消除 IEEE 754 浮點累積漂移與碎股殘留。
  - 公司行動等比分攤：股票分割 (Split)、除權配股 (Stock Dividend) 與現金減資 (Capital Reduction) 等比調整在庫未沖銷 Lots 之股數與單股成本。
  - 歷史賣出沖銷配對歸因 (Disposal Match)，追蹤單筆賣出所消耗之 Lot、成本基準、變現淨額與獨立損益。
- **長短期資本利得判定與節稅收割試算器 (`src/engine/taxOptimizer.ts`)**：
  - 自然日持有天數運算，判定持有 $\ge 365$ 天為長期資本利得（優惠稅率）。
  - 多會計模式損益即時對比矩陣與 Tax-Loss Harvesting 節稅收割推薦。
- **繁中專業名詞對齊、無障礙與效能全面升級**：
  - 實作通用型 `src/components/common/Tooltip.tsx` 提示元件（純 Vanilla CSS + `aria-describedby` 與鍵盤焦點支援）。
  - `LotsBreakdownModal.tsx` 導入 `useMemo` 快取，並支援 `Escape` 鍵與遮罩背景點擊關閉。
  - 介面上所有金融縮寫（FIFO, LIFO, HIFO, Lot, Tax-Loss Harvesting 等）均標註繁體中文並配置 Hover Tooltip。
- **測試與品質**：
  - 全專案 15 個測試套件、**210 項單元測試 100% 綠燈通過**，`npm run build` 0 錯誤。
- **關聯文件**：[SPEC-0035](docs/specs/0035-lot-based-accounting-and-tax-loss-harvesting.md) · [SPEC-0036](docs/specs/0036-lot-accounting-refinement-and-edge-case-fixes.md) · [ADR-0035](docs/adr/0035-lot-based-accounting-and-tax-loss-harvesting.md) · [ADR-0036](docs/adr/0036-lot-accounting-refinement-and-edge-case-fixes.md) · [DEBT-0008 RESOLVED](docs/debts/0008-lot-based-accounting-and-tax-loss-harvesting.md)。

---

## [V5.2] - 2026-08-27
### 交易員盤中當日損益 (Today's PnL) 與精確損益平衡保本價 (Breakeven Price) 體系 (技術債 #0015 & #0013 完整解決)
- **精確損益平衡保本價求解器 (`src/engine/calculator.ts: calculateBreakevenPrice`)**：
  - 依據標的市場、類型（現股 0.3% 稅 / 股票 ETF 0.1% 稅 / 債券 ETF 0% 免稅）與券商折讓規則逆推。
  - 支援 20 元最低低消階梯補償與離散整數取整 (Floor) 閉環驗證，確保以保本價賣出之淨變現所得 $100\% \ge \text{totalCostBasis}$。
- **會計引擎底層加固與碎股精度 (`roundFractionalShares`)**：
  - 現金減資退款高於持股成本時，成本歸零，超額退款轉列已實現利得 `realizedPnL`（技術債 #0013 解決）。
  - 美股碎股全面強制萬分位精準四捨五入收斂。
- **盤中當日損益跨市場聚合 (Today's PnL)**：
  - 個股層級：依 `shares * (currentPrice - previousClose)` 計算今日變動金額與百分比。
  - 整戶層級：台股、美股與全市場跨幣別即時匯率折算當日總損益。
- **交易員級別 UI 視覺全面升級**：
  - `SummaryCards.tsx`：總資產卡片動態顯示今日總盈虧金額與百分比標籤，支援台灣/國際雙主題色。
  - `HoldingsTable.tsx`：單價欄位整合今日損益金額；平均成本欄位新增「保本價 Badge」與 Tooltip 詳細稅費解析。
- **測試與品質**：
  - 全專案 13 個測試檔案、**195 項單元測試 100% 綠燈通過**，`npm run build` 成功。
- **關聯文件**：[SPEC-0034](docs/specs/0034-todays-pnl-and-breakeven-price-metrics.md) · [ADR-0034](docs/adr/0034-todays-pnl-and-breakeven-price-system.md) · [DEBT-0015 RESOLVED](docs/debts/0015-trader-today-pnl-and-breakeven-price-metrics.md) · [DEBT-0013 RESOLVED](docs/debts/0013-capital-reduction-excess-cash-accounting-and-precision.md)。

---

## [V5.1] - 2026-08-27
### XIRR 不定期現金流年化報酬率引擎與多維度績效分析體系 (技術債 #0018 完整解決)
- **0 外部依賴之高精度混合數值求解器 (`src/engine/xirrCalculator.ts`)**：
  - 以牛頓法（Newton-Raphson，50 次迭代，容差 $10^{-7}$）為首選，搭配二分逼近法（Bisection Method，區間 $[-0.9999, 10.0]$）降級防禦，確保 100% 收斂不崩潰。
  - 實作 30 天智能平滑防護（$< 30$ 天以絕對累積報酬呈現並標記非年化，避免極端次方外推）。
- **三層級金流聚合器 (`calculatePortfolioXirr` / `calculateSecurityXirr` / `calculateTimeRangeXirr`)**：
  - **整戶總體 XIRR**：以外部存入/提領與期末淨資產 (NAV) 計算，過濾股票連動款以防重複計入。
  - **個股含息 XIRR**：逐筆追蹤買進成本、賣出淨額、歷年現金股利與在庫持股市值。
  - **週期 XIRR**：支援 1M/3M/6M/1Y/YTD/ALL 時間維度折現。
- **全維度 UI 整合與深色玻璃擬態診斷彈窗 (`src/components/XirrDetailModal.tsx`)**：
  - `SummaryCards.tsx` 損益卡片展示整戶 XIRR 與 `[透視金流]` 入口。
  - `PortfolioGrowthChart.tsx` 週期指標展示區間 XIRR 與透視按鈕。
  - `HoldingsTable.tsx` 展開或損益欄展示各標的含息 XIRR 與透視按鈕。
  - 彈窗展示 4 格關鍵指標、折現方程說明條與現金流時序明細表（含折現年數與現值 PV）。
- **測試與品質**：
  - 新增 `src/engine/xirrCalculator.test.ts`（11 項測試），全專案 13 個測試檔案、**186 項單元測試 100% 綠燈通過**，`npm run build` 成功。
- **關聯文件**：[SPEC-0033](docs/specs/0033-xirr-performance-engine.md) · [ADR-0033](docs/adr/0033-xirr-performance-engine.md) · [DEBT-0018 RESOLVED](docs/debts/0018-xirr-engine-and-cashflow-weighted-performance.md)。

---

## [V5.0] - 2026-08-27
### 原生 IndexedDB 底層儲存遷移、ACID 事務與時光機快照防呆體系 (技術債 #0007 完整解決)
- **原生 0 依賴 IndexedDB 儲存引擎 (`src/utils/db.ts`)**：
  - 封裝高可用 Promise 驅動層，建立 `StockTrackerDB`（版本 `v1`），包含 9 大 Object Stores（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `snapshots`, `settings`）。
  - 徹底解除瀏覽器 5MB 限制與同步主執行緒卡頓，支援單筆 CRUD、批次寫入 (`batchPut`) 與跨表原子性事務 (`dbTransaction`)。
- **無損平滑雙重保險遷移 (Non-Destructive Migration)**：
  - 系統啟動時自動檢查遷移狀態，自動將 `localStorage` 12 大鍵值無損搬遷入 IndexedDB，並保留原 `localStorage` 作為冷備份，達成 100% 零資料遺失。
- **完整時光機快照防呆與一鍵回滾體系 (Time-Machine Snapshots)**：
  - 在 CSV/JSON 匯入覆蓋或追加前自動建立快照 (`AUTO_BEFORE_IMPORT`)；在清空重置前自動建立快照 (`AUTO_BEFORE_RESET`)。
  - 最新 10 份自動輪替淘汰策略，支援手動命名快照與鎖定防刪保護。
- **時光機資料庫管理面板 (`src/components/SettingsWorkspace.tsx`)**：
  - 於設定工作台呈現資料庫即時健康統計（交易數、帳戶數、流水數、快照數）。
  - 提供快照列表、鎖定切換、一鍵還原二次確認彈窗與全庫 JSON 匯出匯入。
- **測試與品質**：
  - 新增 `src/utils/db.test.ts`（9 項測試），全專案 12 個測試檔案、**175 項單元測試 100% 綠燈通過**，`npm run build` 成功。
- **關聯文件**：[SPEC-0032](docs/specs/0032-indexeddb-storage-and-time-machine-snapshots.md) · [ADR-0032](docs/adr/0032-indexeddb-storage-and-time-machine-snapshots.md) · [DEBT-0007 RESOLVED](docs/debts/0007-indexeddb-storage-and-transaction-safety.md)。

---

## [V4.8] - 2026-08-27
### Code Review 全量重構、在途交割日曆全自動化與時序卡片模組化
- **引擎層 DRY 抽象與判定去重 (`src/engine/cashLedgerEngine.ts`)**：
  - 封裝 `createEmptyAccountSummary` 單一工廠函式，徹底消除 14 欄位重複初始化。
  - 封裝 `isPendingOrFutureTransaction` 統一判定函式，消除三重重複判定邏輯。
- **在途交割日曆全場景自動化覆蓋**：
  - 升級 `getSettlementDate` 支援跨國換匯/電匯調撥 (`FX_TRANSFER_IN/OUT`, `WIRE_FEE`) 自動推算 T+2 銀行清算窗口。
  - 支援股票質押借款撥款 (`LOAN_DISBURSEMENT`) 自動推算 T+1 券商撥款窗口。
- **時序排程卡片獨立模組化 (`src/components/PendingSettlementCard.tsx`)**：
  - 將在途時序面板卡片獨立為專用子元件，精簡 `CashLedgerWorkspace.tsx`。
- **測試與品質**：
  - 全專案 11 個測試檔案、**166 項單元測試 100% 綠燈通過**，`npm run build` 成功。
- **關聯文件**：[SPEC-0031](docs/specs/0031-code-review-refactoring-and-in-transit-enhancements.md) · [ADR-0031](docs/adr/0031-code-review-refactoring-and-settlement-automation.md)。

---

## [V4.7] - 2026-08-27
### 券商級在途資金 (Funds in Transit) 與三層可用性購買力會計帳本系統
- **三層可用性會計核心 (`src/engine/cashLedgerEngine.ts`)**：
  - 實作「實質已交割現金 (Settled Cash - 可提領)」、「在途應收 (Pending Receivables)」、「在途應付 (Pending Payables)」與「交易購買力 (Trading Buying Power)」。
  - 落實券商風控：股票賣出當下立即釋放購買力、買進立即扣除購買力；未發放股利或電匯在途不提前透支購買力。
- **四核心資金可用性發光看板與時序排程 (`src/components/CashLedgerWorkspace.tsx`)**：
  - 頂部呈現四核心發光指標卡片，支援全市場折算與各帳戶切換。
  - 實作在途時序排程看板（今日、明日、本週、未來排程、逾期），支援每筆 `[✅ 一鍵核銷]`。
  - 流水清單新增三態過濾按鈕組 (`[全部]` / `[已交割]` / `[在途待交割]`) 與膠囊標籤。
- **彈窗自訂交割日與狀態覆寫 (`src/components/CashTransactionModal.tsx`)**：
  - 彈窗支援自訂預計交割日與覆寫交割狀態。
- **關聯文件**：[SPEC-0030](docs/specs/0030-in-transit-funds-and-buying-power-ledger.md) · [ADR-0030](docs/adr/0030-in-transit-funds-and-buying-power-ledger.md)。

---

## [V4.6] - 2026-08-26
### 歷史資產淨值 (NAV) 折線圖即時市價保底與自動日 K 補齊系統
- **即時市價保底計算 (`src/engine/historicalNav.ts`)**：
  - 缺少歷史日 K 線時，引擎自動優先採用即時最新市價（如 VT $160.99）保底計算最新持股市值，徹底杜絕「庫存獲利但折線圖顯示虧損」的背離現象。
- **分頁切換自動背景補齊 (`src/App.tsx` & `src/engine/historicalPriceFetcher.ts`)**：
  - 使用者切換至「資產成長 (NAV)」分頁時，自動偵測缺少歷史日 K 之標的，於背景非阻塞發起平滑同步補齊。
- **關聯文件**：[SPEC-0029](docs/specs/0029-historical-nav-realtime-price-fallback-and-auto-sync.md)。

---

## [V4.5] - 2026-08-26
### 美股銀行家捨入法 (Banker's Rounding) 與台美雙市場會計精度嚴格隔離
- **美股銀行家捨入法 (`src/utils/formatters.ts` & `src/engine/calculator.ts`)**：
  - 遵循美國證券會計 (US GAAP / Charles Schwab) 標準，美股預扣稅與交割款遇 `.5` 中間值採奇進偶捨（Round Half to Even），徹底消除累積向上美分偏差，精準吻合嘉信理財 App 帳戶實數（如 `$224.79`）。
- **台美雙市場會計制度嚴格隔離**：
  - 台股市場維持台灣集保/券商慣例之整數無條件捨去 (`Math.floor`)，兩大市場會計精度徹底架構隔離。
- **關聯文件**：[SPEC-0028](docs/specs/0028-bankers-rounding-and-dual-market-precision-system.md)。

---

## [V4.4] - 2026-08-26
### 現金流水帳自然日期排序、股息紀錄持久化與單一市場 NAV 範圍隔離
- **自然日期排序與同日金流權重 (`src/engine/cashLedgerEngine.ts`)**：
  - 現金流水帳以字串 `localeCompare` 比對杜絕時區偏差，並落實同日金流權重（流入 ➔ 稅費 ➔ 流出）。
- **Schema 逐筆容錯修復 (`src/utils/storage.ts`)**：
  - 壞損單筆紀錄不清除整庫；App 初始化自動雙向對齊，確保股息補登後重整不消失。
- **單一市場 NAV 範圍隔離**：
  - 台股模式下嚴格排除美股金流與交割款外溢。
- **關聯文件**：[SPEC-0027](docs/specs/0027-cash-ledger-sorting-dividend-persistence-and-scoped-nav.md)。

---

## [V4.3] - 2026-08-25
### 已交割現金餘額即時計算、同日排序優化與股票質押全額結清
- **已交割現金即時計算**：
  - 根據交易日與真實交割日動態計算已交割帳戶實質現金餘額。
- **股票質押全額結清流程**：
  - 支援質押本金與累積利息一鍵結清，自動於現金帳本補登還款與解質記錄。
- **關聯文件**：[SPEC-0026](docs/specs/0026-settled-cash-balance-same-day-sorting-and-loan-payoff-spec.md)。

---

## [V4.2] - 2026-08-25
### 現金帳本明細自訂分類、歷史交易原地編輯與資料聯動修復
- **現金帳本明細自訂分類**：
  - 支援入金、出金、股息、手續費、利息、換匯調撥等自訂分類與備註標籤。
- **歷史交易原地編輯**：
  - 交易明細表支援原地編輯標的、價格、股數、稅費與所屬券商，自動連動重算全域損益與現金帳本。
- **關聯文件**：[SPEC-0025](docs/specs/0025-cash-ledger-categories-and-trade-history-editing.md)。

---

## [V4.1] - 2026-08-25
### TradeModal 券商帳戶智慧連動與跨市場歷史資料自動校正系統
- **TradeModal 智慧繼承與雙向市場連動 (`src/components/TradeModal.tsx` & `src/App.tsx`)**：
  - 新增 `initialMarket` 與 `initialAccountId`，彈窗開啟時自動承接主畫面頂部目前選中之市場與券商帳戶（如美股 + 嘉信理財）。
  - 實作 `getEffectiveAccountIdForMarket` 與 `handleMarketChange`：手動點選市場按鈕、輸入英文字母標的代碼（如 SGOV）或點選熱門標的建議時，自動切換至該市場之預設券商帳戶，並同步更新台股手續費折數試算。
- **跨市場歷史交易自動校正引擎 (`src/utils/storage.ts`)**：
  - 於 `validateAndMigrateTrades` 與 `validateTradesSchema` 加入市場與帳戶一致性校驗。
  - 載入時自動修正市場與帳戶錯置之歷史交易（如美股 SGOV 誤記為永豐大戶投，自動轉為嘉信理財）。
  - 自動連動更新現金流水帳本，徹底修復美股現金帳本中出現台股帳戶的異常。
- **測試與品質 (TDD 100% 綠燈)**：
  - 新增 `src/components/TradeModal.test.ts`、擴充 `storage.test.ts` (Seam 9) 與 `cashLedgerEngine.test.ts`。
  - 全專案 11 個測試套件、**145 項單元測試 100% 綠燈通過**，`npm run build` 通過。
- **關聯文件**：[SPEC-0024](docs/specs/0024-trade-modal-broker-account-sync-and-historical-reconciliation.md) · [ADR-0024](docs/adr/0024-trade-modal-broker-account-sync-and-historical-reconciliation.md)。

---

## [V4.0] - 2026-08-25
### 現金流水帳本、台美真實交割週期、股票質押與槓桿風控系統
- **現金流水帳本與交割結算引擎 (`src/engine/cashLedgerEngine.ts`)**：
  - 支援多券商交割戶獨立核算、台幣 (TWD) / 美金 (USD) 雙幣別管理與跨帳戶換匯調撥。
  - 實作台美真實交割結算週期：台股 **T+2**、美股 **T+1**（自動略過週末），支援 `⏳ 待交割` 與 `✅ 已交割` 雙狀態。
  - 實作交割戶真實現金一鍵校正 (`reconcileAccountBalance`)，自動補登初始入金差額，使全站 NAV 與股票市值精確對齊。
- **股票質押風控與借貸管理模組 (`src/components/LoanModal.tsx` & `src/components/CashLedgerWorkspace.tsx`)**：
  - 即時試算股票質押擔保維持率（130% 斷頭追繳 / 166% 警戒燈號）。
  - 動態試算累計應計利息、預估月息負擔與本利和總還款金額。
  - 支援股票質押三大規費（撥券費、設質登記費、手續費）細化與一鍵扣除。
  - 提供一鍵繳交利息與本金還款快捷操作。
  - 支援市場範疇隔離計算（美股視圖下台股借貸負債歸零、LTV 0%）。
- **關聯文件**：[SPEC-0023](docs/specs/0023-cash-ledger-and-loan-leverage-system.md) · [ADR-0023](docs/adr/0023-cash-ledger-and-loan-leverage-system.md)。

---

## [V3.9] - 2026-08-25
### 全歷史資產淨值 (NAV) 與資產成長折線圖系統
- **精準 NAV 與本金雙線回測重播引擎 (`src/engine/historicalNav.ts`)**：
  - 嚴格實作總資產淨值公式：$$\text{Total NAV} = \sum \text{持股市值} + \sum \text{現金餘額} - \sum \text{借貸負債}$$
  - 實作累計投入本金階梯：$$\text{Cost Basis} = \sum \text{外部入金} - \sum \text{外部出金}$$
  - 逐日重播歷史買賣、除權息、股票分割/減資與負債扣抵，計算每日總 NAV、累積報酬率（%）與當日損益變動。
  - 內建遇休市日/假日/缺漏之自動向前補齊（Forward-Fill）演算法，圖表連續無斷點。
- **本地歷史日 K 快照與增量同步架構 (`src/engine/historicalPriceFetcher.ts` & `src/utils/storage.ts`)**：
  - 支援針對所有在庫與歷史平倉標的下載全歷史收盤價與 USD/TWD 歷史匯率。
  - 實作 `findMissingDateRanges` 智慧比對本地快取，僅抓取未覆蓋之日期區間，節省 API 請求並支援離線流暢運作。
- **高質感資產成長折線圖 UI (`src/components/PortfolioGrowthChart.tsx`)**：
  - 頂部呈現 NAV、投入本金、總損益率、最大回撤（MDD）與歷史最高（ATH）統計指標卡。
  - 支援 5 條曲線勾選疊加（總 NAV、投入本金、持股市值、現金水位、借貸負債）。
  - 支援 `1M` / `3M` / `6M` / `1Y` / `YTD` / `ALL` 時間區間快速篩選。
  - 互動式十字準心 Hover Tooltip，顯示各項數值與當日重大交易標籤。
- **工作區與導航整合 (`src/components/WorkspaceTabs.tsx` & `src/App.tsx`)**：
  - 新增「資產成長 (NAV)」獨立分頁，配備一鍵手動「同步日 K」與進度提示。
- **測試與品質 (TDD 100% 綠燈)**：
  - 新增 11 組單元測試，全專案 9 個測試檔案、**126 項單元測試 100% 通過**，`npm run build` 通過。
- **關聯文件**：[SPEC-0022](docs/specs/0022-historical-nav-and-portfolio-equity-curve.md) · [ADR-0022](docs/adr/0022-historical-nav-and-portfolio-equity-curve.md)。

---

## [V3.8] - 2026-08-25
### 儀表板版面動線互換與券商級多幣別精度校正系統
- **投資組合活頁視覺層級優化 (`App.tsx`)**：
  - 將「資產配置與持倉分布 (`AllocationChart`)」Treemap 樹狀圖置頂優先，4 大 KPI 統計卡片 (`SummaryCards`) 移至中段，建構先總覽後細節的極致動線。
- **多幣別與券商慣用精度格式化模組 (`src/utils/formatters.ts`)**：
  - 🇹🇼 **台股 (TWD)**：現金股利依台灣集保結算所與股務代理標準**無條件捨去至整數 (`Math.floor`)**，格式化為 `NT$ X,XXX`，消除小數尾數。
  - 🇺🇸 **美股 (USD)**：現金股利依主流美股券商規範**四捨五入至分 (`Cents`, 小數點後 2 位)**，格式化為 `$X.XX USD`，徹底消除 JavaScript 浮點數精度毛邊 (`4.779999999999999`)。
  - 支援時間軸股息/減資退款格式化 (`formatTimelineDividend` / `formatTimelineReduction`) 與美股碎股股數顯示 (`formatSharesCount`)。
- **公司行動掃描器與彈窗全面連動 (`corporateActionScanner.ts` & `CorporateActionScannerModal.tsx`)**：
  - 底層運算、待補登清單、預估加總與一鍵補登產出資料全面接入多幣別精度標準。
- **測試與品質 (TDD 100% 綠燈)**：
  - 新增 10 組 formatters 單元測試，全專案 7 個測試檔案、**115 項單元測試 100% 通過**，TypeScript 0 錯誤。
- **關聯文件**：[SPEC-0021](docs/specs/0021-layout-swap-and-broker-grade-currency-precision.md) · [ADR-0021](docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)。

---

## [V3.7] - 2026-08-24
### 股息摩擦稅負追蹤系統（台股二代健保 2.11% 與美股 30% IRS 預扣稅多維度看板）
- **計算引擎稅務精確化 (`calculator.ts`)**：
  - 精準判別台股二代健保單筆 $\ge 20,000$ 元之 $2.11\%$ 扣繳門檻（$< 20,000$ 免扣）與美股 $30\%$ IRS Withholding Tax。
  - 支援手動自訂 `tax > 0` 實扣值最高優先權覆蓋，並提供原幣 USD 與折合 TWD 雙軌數值。
- **設定工作區摩擦看板動態發光卡片 (`SettingsWorkspace.tsx`)**：
  - 依頂部市場切換器動態呈現：台股模式 (`TW`) 顯示「累計二代健保補充保費」、美股模式 (`US`) 顯示「美股 30% 股息預扣稅」、全部市場 (`ALL`) 呈現「除權息摩擦稅負總計」。
- **投資組合總覽與分析儀彈窗雙向升級 (`SummaryCards.tsx` & `FrictionCenterModal.tsx`)**：
  - 在「累積已領取現金配息」卡片底部新增稅負扣繳膠囊標籤（健保 `-NT$ X`、美股預扣 `-$Y USD`）。
  - 解除摩擦分析儀彈窗的台美股互斥邏輯，改為獨立並列雙欄指標網格。
- **測試與品質**：新增二代健保門檻與美股 30% 預扣稅邊界測試，全案 105 個單元測試 100% 通過，TypeScript 0 錯誤。
- **關聯文件**：[SPEC-0020](docs/specs/0020-dividend-tax-and-withholding-tracking.md) · [ADR-0020](docs/adr/0020-dividend-tax-and-withholding-tracking.md)。

---

## [V3.6] - 2026-08-24
### 投資組合庫存三態檢視（持倉中 / 已平倉 / 全部總覽）與勝率戰績儀表板
- **三態檢視切換膠囊按鈕 (`PositionFilter`)**：
  - 工具列提供 `【持倉中】` ($shares > 0$)、`【已平倉】` ($shares = 0$) 與 `【全部總覽】` 三態切換，即時標註各狀態標的數量 Badge。
  - 總覽模式下清晰標示 `🟢 持倉中` 與 `⚪ 已清倉` 狀態徽章，並維持台股置前之雙階自然排序。
- **已平倉專屬戰績儀表板 (`SummaryCards`)**：
  - 切換至已平倉模式時動態呈現：**已實現總損益**、**勝率儀表板（勝率 %、獲利/虧損檔數）**、**代表戰役（最佳贏家 🏆 / 最大輸家 📉）** 與 **已落袋歷史股利**。
- **已平倉標的特化欄位與快捷操作 (`HoldingsTable`)**：
  - 現價欄位轉換為展示「清倉出場均價」與「最後交易日期」，損益欄位突顯「已實現損益」與「已實現報酬率 %」。
  - 提供 **「⚡ 再次買入 (Re-entry)」** 快捷按鈕，一鍵開啟下單彈窗並自動預填標的代碼、名稱與所屬市場。
  - 展開列支援檢視該標的完整歷史買賣、除權息、減資與清倉時間軸履歷。
- **測試與品質**：新增已平倉標的識別與勝率純函式測試，全案 104 個單元測試 100% 通過，TypeScript 0 錯誤。
- **關聯文件**：[SPEC-0019](docs/specs/0019-closed-positions-and-portfolio-overview-views.md) · [ADR-0019](docs/adr/0019-closed-positions-and-portfolio-overview-views.md)。

---

## [V3.5] - 2026-08-24
### 歷史帳本稅費智慧自動拆分修復純函式、雙幣別匯率換算與除權息摩擦引擎
- **歷史賣出稅費智慧拆分修復純函式 (`repairLedgerTaxAndFee`)**：
  - 自動檢測歷史台股賣出交易中將 0.3% 證交稅誤併入手續費的紀錄，精準推導出證交稅並從手續費分離。
  - 嚴格維持損益恆等性 $\text{newFee} + \text{newTax} \equiv \text{oldFee}$，交割總金額與已實現損益（Realized PnL）100% 保持恆等。
  - 支援缺漏證交稅自動補登（不破壞原手續費），並自動識別債券型 ETF（代碼結尾 B）合法 0% 免稅。
- **雙幣別匯率換算與除權息摩擦成本**：
  - 摩擦看板全面支援多幣別，美股手續費與 30% 股息預扣稅依匯率折算為 TWD。
  - 台股現金股利單筆 $\ge 20,000$ 元自動計入 2.11% 二代健保補充保費。
- **美股歷史明細 2 位小數美分精度**：歷史明細表結算金額依幣別自動適配美分小數點，消除 0.21 美元視覺取整誤差。
- **關聯文件**：[SPEC-0018](docs/specs/0018-tax-fee-auto-repair-and-currency-engine.md) · [ADR-0018](docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)。

---

## [V3.4] - 2026-08-24
### 摩擦成本精準計算引擎與台美股稅制校驗升級
- **台股券商折讓金額精準化**：以法定牌告 $\max(20, \lfloor \text{成交額} \times 0.001425 \rfloor)$ 為基準計算差額，真實反映透過低消 1 元帳戶省下的手續費。
- **債券型 ETF 0% 免稅支援**：代碼結尾為 `B` 之債券型 ETF 稅率為 0%（免稅）。
- **當沖交易 0.15% 減半稅率**：支援現股當沖 0.15% 減半稅率。
- **關聯文件**：[SPEC-0017](docs/specs/0017-friction-cost-and-tax-precision-engine.md) · [ADR-0017](docs/adr/0017-friction-cost-and-tax-precision-engine.md)。

---

## [V3.3] - 2026-08-24
### 整合式設定工作台、Header 瘦身與外部 API Key 配置
- **Header 瘦身**：移除頂部重複的「摩擦成本」與「券商設定」按鈕，頂部工具列回歸極簡純粹。
- **活頁標籤更名**：第三個活頁標籤更名為 `⚙️ 設定` (Tab: `settings`)，圖示使用 `Settings`。
- **整合式設定中心 (`SettingsWorkspace.tsx`)**：
  - 模組 A: 🏛️ 券商帳戶與費率管理（新增/編輯券商、折讓率 2.8折等、低消、美股模式、一鍵範本庫）。
  - 模組 B: 💸 交易摩擦成本深度分析（4 大發光看板、佔比進度條、優化對策）。
  - 模組 C: 🔑 外部金融資料 API 金鑰管理（FinMind Token、FMP API Key、Alpha Vantage Key、自訂 Proxy 端點）。
- **安全隔離**：API Key 獨立保存於 `STOCK_TRACKER_API_KEYS_V1` LocalStorage 中，支援密碼遮罩 `👁️`，不污染交易匯出檔。
- **關聯文件**：[SPEC-0016](docs/specs/0016-settings-workspace-and-api-key-configuration.md) · [ADR-0016](docs/adr/0016-settings-workspace-and-api-key-configuration.md)。

---

## [V3.2] - 2026-08-24
### 公司行動雙軌資料管線、受控限速與本地代理防護
- **Vite 本地開發代理 (Dev Proxy)**：配置 `/api/twse` 與 `/api/yahoo` 本地轉發路由，徹底終結瀏覽器端 CORS 跨域攔截。
- **雙軌合規資料源管線**：台股除權息優先查詢 TWSE 官方除權除息預告表 (`TWT48U_ALL`)，官方無資料或分割/減資由 Yahoo Finance 備援；美股查詢 Yahoo Finance。
- **受控節流佇列與 24H 實體快取**：並發度受控為 2，單標的間隔 150ms 節流延遲防止 429 限制；`STOCK_TRACKER_CA_CACHE_V1` 快取 24 小時有效，第二次查詢 0 外部請求。
- **關聯文件**：[SPEC-0015](docs/specs/0015-corporate-action-dual-pipeline-and-rate-limiting.md) · [ADR-0015](docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)。

---

## [V3.1] - 2026-08-24
### 活頁本工作台架構與券商手續費整併收斂
- **活頁本工作台 (Tabbed Workspace Hub)**：劃分三大核心視圖（📊 投資組合、📜 歷史交易帳本、⚙️ 設定），支援 LocalStorage 頁籤記憶。
- **手續費功能全面收斂至券商 (SSOT)**：移除 Header 獨立全域折讓選單，持股預估出清手續費直接由部位所屬券商帳戶之 `discountRate`、`minFee` 驅動。
- **交易帳本總筆數透明指示器**：表頭動態呈現 `已篩選顯示 M 筆 / 全量共 N 筆`，並提供一鍵 `[ 🔄 顯示全部 N 筆 ]` 重置按鈕。
- **關聯文件**：[SPEC-0014](docs/specs/0014-tabbed-workspace-and-broker-fee-consolidation.md) · [ADR-0014](docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)。

---

## [V3.0] - 2026-08-24
### 多券商帳戶管理體系與交易摩擦成本分析儀
- **多券商獨立帳戶體系**：支援自訂台美多券商（國泰 2.8 折、永豐 2 折、富邦 1.8 折、海外券商 $0 免手續費、國內複委託等），支援自訂最低手續費與證交稅率。
- **交易摩擦成本深度分析儀**：4 大發光看板（累計手續費、累計證交稅、券商折讓已省金額、庫存預估出清成本）與摩擦衝擊佔比進度條。
- **歷史交易批次指派**：歷史明細表支援快速切換或批次指派所屬券商帳戶。
- **關聯文件**：[SPEC-0013](docs/specs/0013-multi-broker-account-and-friction-cost-engine.md) · [ADR-0013](docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)。

---

## [V2.1] - 2026-08-21
### 雙軌會計口徑切換與券商手續費折讓自訂
- **全域雙軌會計口徑切換**：`[🏢 券商核帳模式 (不含息/含稅)]` ⇋ `[📈 總報酬模式 (含息/毛市值)]` 一鍵切換。
- **官方 21 檔標的校準**：對齊 2026 新掛牌之 `00403A`、`009816`、`00981A`、`009826`。
- **關聯文件**：[SPEC-0011](docs/specs/0011-dual-accounting-mode-and-official-symbols-alignment.md) · [ADR-0011](docs/adr/0011-dual-accounting-mode-and-official-symbols-alignment.md) · [ADR-0012](docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)。

---

## [V1.0 ~ V1.9] - 2026-08
- **V1.9**: 技術債與改善建議分級管理系統 (`docs/debts/`)。
- **V1.8**: 持倉雙階自然排序與證交所除權除息預告端點校正。
- **V1.7**: 虛擬時序動態配股累積與台股減資整數向下取整算法。
- **V1.6**: 公司行動掃描進度動態可視化、受控並行與斷點接續。
- **V1.5**: USD/TWD 匯率自動輪詢更新與四層平滑備援降級。
- **V1.4**: 全市場即時與延遲多源行情、開盤智慧輪詢與自訂價格鎖定。
- **V1.0 ~ V1.3**: 雙市場獨立記帳、純 SVG Treemap 資產配置圖、事件流模型與全市場公司行動掃描。
