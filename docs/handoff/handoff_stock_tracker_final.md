# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-09 16:15 (UTC+8)  
> **當前最新里程碑**：
> - **V8.31.0 FIRE 財務自由複利滾雪球與定期定額智慧排程系統**（一次性解決技術債 DEBT-0029, DEBT-0021, DEBT-0022。實作 DRIP 雙軌複利推演與 4 階里程碑、定期定額休市順延與未來 30 天防透支推演、純原生幾何布朗運動 1,000 次蒙地卡羅路徑與 Guyton-Klinger 動態護欄，全站 0 外部依賴原生 SVG 雙軌圖與錐形圖）。
> - **V8.30.0 Yahoo Finance 報價昨日收盤價與今日漲跌幅精準修正**（徹底拔除 `meta.chartPreviousClose` 歷史圖表起算價干擾，以官方當日差值與精確昨收倒推，實盤數值 100% 吻合券商 APP，消除假性鉅額虧損誤算）。
> - **V8.29.0 肌肉書僮風益比全面統一專業 R 倍數規範**（全系統消滅 `1 :` 與 `R` 冗贅混搭語病，全面統一為國際專業交易標準之 `${rrRatio}R`，作戰看板與總表定義 100% 邏輯一致）。
> - **V8.28.0 肌肉書僮布林帶寬審查硬門檻 (Bandwidth <= 8%)、作戰看板目標價對齊與美股 US$ 貨幣別標示**。
> - **V8.27.0 肌肉書僮今日核心作戰指令 (Top 3 買進先鋒 vs 在庫持股限定賣出) 與自適應色彩主題**。
> - **V8.26.0 肌肉書僮目標池滿編規格化與名實相符擴充**（臺灣 50 滿編 50 檔、台股焦點滿編 30 檔、美股巨頭 50 檔與焦點 30 檔）。
> - **V8.25.0 肌肉書僮真實日 K 受控並發增量回補與本地持久化加速**（IndexedDB 快取秒開、7 天短期增量請求、頂部就緒度進度條）。
> - **V8.14.0 ~ V8.24.0 宏觀戰情室、黑天鵝壓力測試矩陣、雙動能輪動與量化防護網**。
> **品質狀態**：全量單元測試 **676/676 通過 (100% Passed / 60 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **當前工作分支**：`feature/0112-fire-compounding-drip-and-dca-simulator`
- **單元測試套件**：**676/676 通過 (60 test suites / 100% 綠燈)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包耗時 ~9.5 秒，產出 0 警告
- **當前釋出版本**：**V8.31.0**
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens（如 FinMind / FMP / 自訂代理）均受 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/productivity/handoff/SKILL.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `priceFetcher.ts`、`muscleBookerEngine.ts`、`cashLedgerEngine.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及金融報價、殖利率、股價昨收、EPS 等數據解析時。
   - 核心準則：強制多源交叉驗證與即時 API 抓取，阻絕靜態舊資料與假性數值污染決策。
5. **`技術文件大師 (Tech Writer)`**：
   - 適用時機：每次迭代交接收尾、ADR 產出與 `CONTEXT.md` / `README.md` 同步更新。

---

## 🏛️ 3. 領域模型與架構決策追溯矩陣 (Traceability Matrix)

### 3.1 近期核心規格 (PRD) 與架構決策 (ADR) 雙向對照

| 版本 | 規格書 (PRD / Spec) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 核心變更與收益 |
| :--- | :--- | :--- | :--- | :--- |
| **v8.31.0** | [`SPEC-0112`](file:///d:/APP/股票紀錄/docs/specs/0112-fire-compounding-drip-and-dca-simulator-spec.md) | [`ADR-0112`](file:///d:/APP/股票紀錄/docs/adr/0112-fire-compounding-drip-and-dca-simulator.md) | `.scratch/v8.31.0-fire-compounding-drip-and-dca-simulator` | 一次性關閉 DEBT-0029, 0021, 0022。DRIP 雙軌複利、DCA 假日順延防透支推演、蒙地卡羅 1,000 次 GBM 與 Guyton-Klinger 護欄。 |
| **v8.30.0** | [`SPEC-0111`](file:///d:/APP/股票紀錄/docs/specs/0111-yahoo-quote-previous-close-and-daily-change-spec.md) | [`ADR-0111`](file:///d:/APP/股票紀錄/docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md) | `.scratch/v8.30.0-...` | 修復 Yahoo 報價誤用 3 個月前 `chartPreviousClose`，改以當日差值與昨收倒推，數據與券商 APP 100% 吻合。 |
| **v8.29.0** | [`SPEC-0110`](file:///d:/APP/股票紀錄/docs/specs/0110-muscle-booker-risk-reward-r-multiple-format-spec.md) | [`ADR-0110`](file:///d:/APP/股票紀錄/docs/adr/0110-muscle-booker-risk-reward-r-multiple-format.md) | `.scratch/v8.29.0-...` | 風益比全面統一為標準 `${rrRatio}R`（如 `7.9R`），消滅上下方向顛倒與冗贅混搭語病。 |
| **v8.28.0** | [`SPEC-0109`](file:///d:/APP/股票紀錄/docs/specs/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency-spec.md) | [`ADR-0109`](file:///d:/APP/股票紀錄/docs/adr/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency.md) | `.scratch/v8.28.0-...` | 布林帶寬 $\le 8\%$ 硬門檻防追高、作戰看板目標價對齊、美股 `US$` 貨幣別統一標示。 |
| **v8.27.0** | [`SPEC-0108`](file:///d:/APP/股票紀錄/docs/specs/0108-muscle-booker-top3-action-brief-and-holding-gated-sell-spec.md) | [`ADR-0108`](file:///d:/APP/股票紀錄/docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md) | `.scratch/v8.27.0-...` | 今日核心作戰指令看板（Top 3 買進先鋒 vs 在庫限定賣出）與雙向自適應色彩主題。 |
| **v8.26.0** | [`SPEC-0107`](file:///d:/APP/股票紀錄/docs/specs/0107-muscle-booker-full-universe-top30-top50-alignment-spec.md) | [`ADR-0107`](file:///d:/APP/股票紀錄/docs/adr/0107-muscle-booker-full-universe-top30-top50-alignment.md) | `.scratch/v8.26.0-...` | 目標池名實相符擴充：臺灣 50 滿編 50 檔、台股焦點滿編 30 檔、美股 50/30 檔。 |
| **v8.25.0** | [`SPEC-0106`](file:///d:/APP/股票紀錄/docs/specs/0106-muscle-booker-incremental-backfill-and-local-cache-spec.md) | [`ADR-0106`](file:///d:/APP/股票紀錄/docs/adr/0106-muscle-booker-incremental-backfill-and-local-cache.md) | `.scratch/v8.25.0-...` | 真實日 K 受控並發增量回補隊列與 IndexedDB 歷史持久化快取，離線秒開。 |

### 3.2 領域術語與單一事實來源 (SSOT)
- **領域詞彙手冊**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
  - 核心規範包含：`Broker-Grade Precision`、`Quote Previous Close Precision & Chart Quarantine`、`Universal R-Multiple Standard`、`Bandwidth Gate`、`Holding-Gated Sell Protection`、`DRIP Dual-Track Compounding`、`DCA Holiday-Aware Scheduler`、`Monte Carlo 1,000-Path Simulation` 等。

---

## 📂 4. 實體模組與程式碼架構地圖 (Codebase & Component Architecture)

### 4.1 核心運算與管線引擎 (`src/engine/`)

| 模組分類 | 檔案路徑 | 核心職責與特性 | 測試覆蓋 |
| :--- | :--- | :--- | :--- |
| **DRIP 複利滾雪球引擎** | [`src/engine/dripCompoundingEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dripCompoundingEngine.ts) | 雙軌市值對比、股份指數放大、複利增益倍數、4 階被動收入自由度里程碑連續線性插值。 | 8 tests |
| **DCA 智慧排程防透支** | [`src/engine/dcaSchedulerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dcaSchedulerEngine.ts) | 國定假日休市順延下一撮合日 ($T$)、T+2/T+1 交割日曆、未來 30 天防透支現金推演、DCA vs 歐印歷史回測。 | 7 tests |
| **蒙地卡羅 FIRE 模擬** | [`src/engine/monteCarloFireEngine.ts`](file:///d:/APP/股票紀錄/src/engine/monteCarloFireEngine.ts) | 純原生 0 依賴 Box-Muller 標準常態亂數、幾何布朗運動 1,000 次隨機路徑、Guyton-Klinger 動態護欄、二分法 SWR。 | 6 tests |
| **肌肉書僮量化引擎** | [`src/engine/muscleBookerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/muscleBookerEngine.ts) | 箱體突破、20MA 扣抵翻揚、帶寬門檻 $\le 8\%$、R 倍數制 (`7.9R`)、Top 3 買進、在庫限定賣出。 | 14 tests |
| **市場即時報價引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | Yahoo Chart API 昨收隔離、`regularMarketChange` 官方差值解析、`price - change` 昨收倒推、多代理輪詢。 | 24 tests |
| **歷史日 K 增量抓取** | [`src/engine/historicalPriceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/historicalPriceFetcher.ts) | 7 天短期增量回補、180 天初始回補、受控並發隊列與多代理容錯。 | 4 tests |
| **宏觀戰情室矩陣** | [`src/engine/marginStressMatrixEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.ts) | 黑天鵝情境矩陣、斷頭保證金受壓試算、維持率敏感度分析。 | 6 tests |
| **雙動能輪動引擎** | [`src/engine/dualMomentumEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.ts) | 絕對動能與相對動能雙重過濾、跨市場輪動與避險配置。 | 7 tests |
| **量化體檢指標** | [`src/engine/quantMetrics.ts`](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts) | 夏普值 (Sharpe)、索提諾值 (Sortino)、最大回撤 (MDD)、年化波動率與基準比較。 | 20 tests |
| **公司行動智慧掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | TWSE 官方除權息/減資預告表解析、Yahoo 行動掃描、虛擬時序動態配股與二代健保扣繳。 | 22 tests |
| **官方股票字典同步** | [`src/engine/stockDictionarySync.ts`](file:///d:/APP/股票紀錄/src/engine/stockDictionarySync.ts) | TWSE / TPEx 上市櫃與興櫃官方標的自動同步、智慧自動補全。 | 4 tests |
| **資產再平衡優化器** | [`src/engine/rebalancingEngine.ts`](file:///d:/APP/股票紀錄/src/engine/rebalancingEngine.ts) | 目標權重偏離度診斷、最小摩擦再平衡試算、加減碼金額分配。 | 7 tests |
| **籌碼量化與星圖引擎** | [`src/engine/smartMoneyEngine.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyEngine.ts) | 美股 20 日 CMF 佳慶資金流向、四象限標準化座標映射、零基礎生活化診斷。 | 12 tests |
| **官方籌碼管線與快取** | [`src/engine/smartMoneyFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/smartMoneyFetcher.ts) | TWSE 官方開放日報 `fund/T86` 解析、交易日自動回推重試、IndexedDB 持久化。 | 13 tests |
| **現金、在途與購買力** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | 三層可用性核算 (`calculateAccountBalances`)、交易購買力風控、法定假日結算日曆。 | 29 tests |
| **歷史 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | 歷史日 K 增量同步、遇假日 Forward-Fill、排除 relatedTradeId 避免雙重扣款。 | 9 tests |
| **XIRR 數值求解引擎** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | 0 依賴 Newton-Raphson + Bisection 混合求解器、30 天平滑防護、現金流時序聚合。 | 11 tests |

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **肌肉書僮工作台** | [`src/components/MuscleBookerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MuscleBookerWorkspace.tsx) | 雙欄作戰看板 (Top 3 BUY vs Holding SELL)、三色操盤導航儀、日 K 快取狀態列、均線扣抵展開總表、主題色彩自適應。 |
| **宏觀戰情室工作台** | [`src/components/MacroWarRoomWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MacroWarRoomWorkspace.tsx) | 全球總經脈動、黑天鵝壓力測試矩陣、雙動能輪動雷達與 AI 策略建議。 |
| **籌碼星圖工作台** | [`src/components/ChipsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/ChipsWorkspace.tsx) | 雙模式切換（在庫持倉 vs 全市場法人焦點 Top 30）、四象限診斷膠囊、籌碼重整。 |
| **原生 SVG 聰明錢圖表**| [`src/components/SmartMoneyBubbleChart.tsx`](file:///d:/APP/股票紀錄/src/components/SmartMoneyBubbleChart.tsx) | 0 外部圖表庫純 SVG 渲染、四象限生活化浮水印、彗星位移尾巴、時間軸播放器。 |
| **現金與交割工作台** | [`src/components/CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) | 四核心可用性發光看板、在途交割時序排程面板、交割戶資金網格、質押風控。 |
| **設定與時光機看板** | [`src/components/SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx) | 券商手續費率設定、API 金鑰管理、時光機快照管理（自訂快照、一鍵還原、JSON 備份）。 |
| **持倉技術信號膠囊** | [`src/components/common/HoldingSignalCapsules.tsx`](file:///d:/APP/股票紀錄/src/components/common/HoldingSignalCapsules.tsx) | 5 階動態信號燈、結構化多空共振 Tooltip、自適應色彩切換。 |
| **持倉行動顧問彈窗** | [`src/components/HoldingAdvisorModal.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingAdvisorModal.tsx) | 技術面停損停利警示、持股健檢、買賣決策輔助。 |
| **資產再平衡彈窗** | [`src/components/RebalancingModal.tsx`](file:///d:/APP/股票紀錄/src/components/RebalancingModal.tsx) | 目標資產配置比例調整、偏離度可視化、一鍵試算加減碼金額。 |
| **公司行動掃描彈窗** | [`src/components/CorporateActionModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionModal.tsx) | 全市場在線掃描、進度回報、除權息與減資明細勾選匯入。 |

---

## 🛠️ 5. 技術債現況追蹤 (Technical Debts Status)

依據專案規範與 [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)，當前已累積 35 篇技術債與架構改進提案，其中高優先級重點如下：

- **已完成 / 已解決 (`RESOLVED`)**：
  - `DEBT-0001` ~ `DEBT-0018`：持股排序 DRY、交易紀律審查、現金簿 NAV、時光機 IndexedDB、質押壓力測試、XIRR 引擎、量化指標、股票字典同步等均已完整實作並驗收。
  - `DEBT-0025`：黑天鵝保證金壓力測試矩陣（已於 V8.12.0 實作）。
  - `DEBT-0027`：雙動能輪動體系（已於 V8.11.0 實作）。
- **待進行評估之架構改善 (Backlog / Open)**：
  - `DEBT-0021`：智慧定期定額 (DCA) 試算器與金流排程。
  - `DEBT-0022`：蒙地卡羅 FIRE 退休安全提領模擬器。
  - `DEBT-0023`：PWA 離線優先與端到端加密 (E2EE) 雲端同步。
  - `DEBT-0024`：ETF 穿透分析與產業因子集中度體檢。
  - `DEBT-0028`：多券商對帳單智慧匯入衝突消解器。
  - `DEBT-0029`：股息再投資 (DRIP) 複利引擎與現金流增長預測。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支**：
   - 當前位於 `fix/0111-yahoo-quote-previous-close-and-daily-change-fix` 分支。
   - 所有代碼變更與文檔均已 Commit（`f4b5162` 與 `7127c90`）。
2. **推送遠端與建立 PR (若使用者授權)**：
   - 執行 `git push -u origin fix/0111-yahoo-quote-previous-close-and-daily-change-fix`。
   - 使用 `gh pr create` 發起 Pull Request，描述需包含 `Closes #0111`。
   - 經 GitHub Actions CI 綠燈驗證後，執行 Squash and Merge 合併回 `main` 分支並清理分支。
3. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 655 個測試 100% 通過）與 `npm run build`（確認 0 型別錯誤）。
