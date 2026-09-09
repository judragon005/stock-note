# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-09 15:45 (UTC+8)  
> **當前最新里程碑**：
> - **V8.30.0 Yahoo Finance 報價昨日收盤價與今日漲跌幅精準修正**（徹底拔除 `meta.chartPreviousClose` 歷史圖表起算價干擾，以官方當日差值與精確昨收倒推，實盤數值 100% 吻合券商 APP，消除假性鉅額虧損誤算）。
> - **V8.29.0 肌肉書僮風益比全面統一專業 R 倍數規範**（全系統消滅 `1 :` 與 `R` 冗贅混搭語病，全面統一為國際專業交易標準之 `${rrRatio}R`，作戰看板與總表定義 100% 邏輯一致）。
> - **V8.28.0 肌肉書僮布林帶寬審查硬門檻 (Bandwidth <= 8%)、作戰看板目標價對齊與美股 US$ 貨幣別標示**。
> - **V8.27.0 肌肉書僮今日核心作戰指令 (Top 3 買進先鋒 vs 在庫持股限定賣出) 與自適應色彩主題**。
> - **V8.26.0 肌肉書僮目標池滿編規格化與名實相符擴充**（臺灣 50 滿編 50 檔、台股焦點滿編 30 檔、美股巨頭 50 檔與焦點 30 檔）。
> - **V8.25.0 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速**（IndexedDB 快取秒開、7 天短期增量請求、頂部就緒度進度條）。
> - **V8.14.0 ~ V8.24.0 宏觀戰情室、黑天鵝壓力測試矩陣、雙動能輪動與量化防護網**。
> **品質狀態**：全量單元測試 **655/655 通過 (100% Passed / 57 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **測試套件狀態**：**655/655 通過** (57 test suites / 100% 綠燈)，TypeScript 0 錯誤。
- **當前版本**：**V8.30.0**
- **隱私安全**：所有本機交易資料、個人持股與 API 金鑰均受 IndexedDB / LocalStorage 本地隔離與 `.gitignore` 保護，嚴禁個人財務數據外洩至遠端。

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - **V8.30.0 核心術語**：
     - `Quote Previous Close Precision & Chart Quarantine`（昨收價精準推導與圖表昨收隔離規範）
   - **V8.27.0 ~ V8.29.0 核心術語**：
     - `Universal R-Multiple Standard`（全域 R 倍數制規範化）
     - `Bandwidth <= 8% Hard Gate`（布林帶寬收斂硬門檻）
     - `Holding-Gated Sell Protection`（在庫持股限定賣出防護盾）
     - `Top 3 Buy Directives`（今日買進先鋒作戰指令）
   - **V8.25.0 核心術語**：
     - `Controlled Concurrency Backfill Queue`（受控並發增量回補隊列，Concurrency = 3，間隔 60ms）
     - `Short-term Incremental Period Fetch`（7 天增量拉取，傳輸壓降 90%）
   - **V8.0.0 ~ V8.24.0 核心術語**：
     - `Macro War Room & Risk Exposure Matrix`（宏觀戰情室與黑天鵝受壓矩陣）
     - `Dual Momentum Rotation`（雙動能輪動體系）
     - `Darvas Box & 20MA Bias Confluence`（達瓦斯箱體與 20MA 扣低走揚共振）

2. **架構決策紀錄 (近期 ADR 索引)**：
   - [`ADR-0111`](file:///d:/APP/股票紀錄/docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md)：V8.30.0 修復 Yahoo Finance 報價誤用圖表昨收導致漲跌幅與今日損益失真架構。
   - [`ADR-0110`](file:///d:/APP/股票紀錄/docs/adr/0110-muscle-booker-risk-reward-r-multiple-format.md)：V8.29.0 肌肉書僮風益比全面統一專業 R 倍數規範。
   - [`ADR-0109`](file:///d:/APP/股票紀錄/docs/adr/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency.md)：V8.28.0 肌肉書僮布林帶寬硬門檻、作戰看板目標價與美股 US$ 貨幣別。
   - [`ADR-0108`](file:///d:/APP/股票紀錄/docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md)：V8.27.0 肌肉書僮今日核心作戰指令與自適應色彩主題。
   - [`ADR-0107`](file:///d:/APP/股票紀錄/docs/adr/0107-muscle-booker-full-universe-top30-top50-alignment.md)：V8.26.0 肌肉書僮目標池滿編規格化與名實相符擴充。
   - [`ADR-0106`](file:///d:/APP/股票紀錄/docs/adr/0106-muscle-booker-incremental-backfill-and-local-cache.md)：V8.25.0 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速。
   - 更多 ADR 請參閱 [`docs/adr/`](file:///d:/APP/股票紀錄/docs/adr/) 目錄。

3. **需求規格說明書 (近期 PRD 索引)**：
   - [`SPEC-0111`](file:///d:/APP/股票紀錄/docs/specs/0111-yahoo-quote-previous-close-and-daily-change-spec.md)：Yahoo Quote 昨收價與今日漲跌幅計算偏差修復規格書。
   - [`SPEC-0110`](file:///d:/APP/股票紀錄/docs/specs/0110-muscle-booker-risk-reward-r-multiple-format-spec.md)：肌肉書僮風益比全面統一專業 R 倍數規範規格書。
   - [`SPEC-0109`](file:///d:/APP/股票紀錄/docs/specs/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency-spec.md)：肌肉書僮帶寬門檻、作戰看板目標價與美股貨幣別規格書。
   - [`SPEC-0108`](file:///d:/APP/股票紀錄/docs/specs/0108-muscle-booker-top3-action-brief-and-holding-gated-sell-spec.md)：肌肉書僮 Top 3 買進先鋒與在庫限定賣出規格書。
   - 更多規格書請參閱 [`docs/specs/`](file:///d:/APP/股票紀錄/docs/specs/) 目錄。

4. **單一版本交付紀錄存檔 (`docs/handoff/`)**：
   - [V8.30.0: 修復 Yahoo Finance 報價誤用圖表昨收導致漲跌幅與今日損益失真交接紀錄](2026-09-09-v8.30.0-yahoo-quote-previous-close-and-daily-change.md)
   - [V8.29.0: 肌肉書僮風益比全面統一專業 R 倍數規範交接紀錄](2026-09-09-v8.29.0-muscle-booker-risk-reward-r-multiple-format.md)
   - [V8.28.0: 肌肉書僮帶寬硬門檻、作戰看板目標價與美股 US$ 貨幣別交接紀錄](2026-09-09-v8.28.0-muscle-booker-bandwidth-gate-target-price-and-us-currency.md)
   - [V8.27.0: 肌肉書僮今日核心作戰指令與自適應色彩主題交接紀錄](2026-09-09-v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell.md)
   - [V8.26.0: 肌肉書僮目標池滿編規格化與名實相符擴充交接紀錄](2026-09-09-v8.26.0-muscle-booker-full-universe-top30-top50-alignment.md)
   - [V8.25.0: 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速交接紀錄](2026-09-09-v8.25.0-muscle-booker-incremental-backfill-and-local-cache.md)

5. **本地票券鏡像區 (`.scratch/`)**：
   - `.scratch/v8.30.0-yahoo-quote-previous-close-and-daily-change/` (3/3 Completed)
   - `.scratch/v8.29.0-muscle-booker-risk-reward-r-multiple-format/` (3/3 Completed)
   - `.scratch/v8.28.0-muscle-booker-bandwidth-gate-target-price-and-us-currency/` (3/3 Completed)
   - `.scratch/v8.27.0-muscle-booker-top3-action-brief-and-holding-gated-sell/` (3/3 Completed)

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **肌肉書僮量化引擎** | [`src/engine/muscleBookerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/muscleBookerEngine.ts) | 達瓦斯箱體、20MA 扣抵、布林帶寬門檻 (<= 8%)、R 倍數制 (`7.9R`)、Top 3 買進先鋒、在庫持股限定賣出、買賣訊號判定 (14 tests)。 |
| **肌肉書僮工作台** | [`src/components/MuscleBookerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MuscleBookerWorkspace.tsx) | 雙欄作戰看板 (Top 3 BUY vs Holding SELL)、三色實戰操盤導航儀、日 K 快取狀態工具列、均線扣抵展開總表、色彩主題自適應。 |
| **市場即時報價引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | Yahoo Chart API 昨收隔離、官方差值優先解析、`price - change` 精確昨收倒推、多節點 CORS 代理池 (24 tests)。 |
| **歷史日 K 增量抓取引擎** | [`src/engine/historicalPriceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/historicalPriceFetcher.ts) | 支援短期 7 天增量回補、180 天初次回補、多代理自動輪替與失敗重試 (4 tests)。 |
| **宏觀戰情室與壓力測試** | [`src/engine/marginStressMatrixEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.ts) | 黑天鵝情境矩陣、斷頭保證金受壓試算、維持率敏感度分析 (6 tests)。 |
| **雙動能輪動引擎** | [`src/engine/dualMomentumEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.ts) | 絕對動能與相對動能雙重過濾、跨市場輪動與避險現金配置建議 (7 tests)。 |
| **投資組合量化指標** | [`src/engine/quantMetrics.ts`](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts) | 夏普值 (Sharpe)、索提諾值 (Sortino)、最大回撤 (MDD)、年化波動率與基準對比 (20 tests)。 |
| **公司行動智慧掃描引擎** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | TWSE 官方除權息與減資預告表解析、Yahoo 行動掃描、虛擬時序動態配股與二代健保扣繳 (22 tests)。 |
| **全市場官方股票字典** | [`src/engine/stockDictionarySync.ts`](file:///d:/APP/股票紀錄/src/engine/stockDictionarySync.ts) | TWSE / TPEx 上市櫃與興櫃官方標的自動同步、智慧自動補全 (4 tests)。 |
| **目標配置與再平衡優化器** | [`src/engine/rebalancingEngine.ts`](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts) | 目標權重偏離度診斷、最小摩擦再平衡試算、加減碼金額分配 (7 tests)。 |
| **籌碼量化計算引擎** | [`src/engine/smartMoneyEngine.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyEngine.ts) | 美股 20 日 CMF 佳慶資金流向演算法、四象限座標無量綱標準化映射、零基礎小白生活化診斷生成器 (12 tests)。 |
| **官方籌碼資料管線與快取** | [`src/engine/smartMoneyFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyFetcher.ts) | TWSE 官方開放日報 `fund/T86` 解析、交易日自動回推重試、IndexedDB 本地持久化快取 (13 tests)。 |
| **原生 IndexedDB 儲存引擎** | [`src/utils/db.ts`](file:///d:/APP/股票紀錄/src/utils/db.ts) | 0 依賴原生 Promise 封裝 `StockTrackerDB`（9 大 Stores），支援 CRUD、`batchPut`、事務、10 份快照輪替淘汰、無損遷移與全庫 JSON 匯入匯出 (9 tests)。 |
| **現金、在途與購買力引擎** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | 三層可用性核算 (`calculateAccountBalances`)、交易購買力風控 (`calculateTradingBuyingPower`)、在途時序分組、法定假日結算日曆 (29 tests)。 |
| **歷史 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | 歷史日 K 增量同步、遇假日 Forward-Fill、排除 relatedTradeId 避免雙重扣款 (9 tests)。 |
| **XIRR 數值求解引擎** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | 0 依賴 Newton-Raphson + Bisection 混合求解器、30 天平滑防護、整戶/個股/週期三層級現金流聚合 (11 tests)。 |

---

## ⚡ 4. 常用驗證與維護指令 (Quick Verification)

```bash
# 1. 執行全量單元測試 (應 655/655 100% 通過)
npm test

# 2. 執行 TypeScript 型別嚴格檢查 (應 0 錯誤)
npx tsc --noEmit

# 3. 執行 Vite 生產環境建置 (應 0 錯誤成功打包)
npm run build
```
