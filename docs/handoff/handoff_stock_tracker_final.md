# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-09-12 13:06 (UTC+8)  
> **當前最新里程碑**：
> - **V8.42.1 穿透式財報深度戰情室浮動彈窗樣式修復與原生化**（修復持股時間軸「📊 財報穿透」按鈕無反應問題；徹底清除無效 Tailwind 類別，全數遷移至 Vanilla CSS + Inline Styles；支援 `position: fixed; inset: 0; zIndex: 9999` 全螢幕置中毛玻璃遮罩；Layer 1~3 原生美學渲染；兼容紅綠與國際主題；全量測試 867/867 綠燈）。
> - **V8.42.0 穿透式財報分析儀與財務防雷鑑識系統**（三層漸進式架構：0秒戰報 ➔ 8季獲利三率趨勢 ➔ 深度排雷；稅後淨利 vs 營業現金流 CFO 階梯圖；杜邦 ROE 三因子長條矩陣；「市場沒說什麼」六大逆向背離偵測；會計師查核防線與四大所標章；金融保險業豁免與強週期高峰警語；IndexedDB Version 4 本地優先快取管線；持倉清單「📊 財報穿透」直達按鈕）。
> - **V8.41.0 全能技術指標大腦升級與三層實戰矩陣系統**（市場狀態機四階判定、ADX 鈍化與矛盾懲罰、關鍵位密集聚集、ATR 吊燈移動防守、背離偵測與誘多假突破）。
> - **V8.40.0 全市場個股全技術指標透視分析與多空共振系統**（趨勢、動能、通道、量能、位階五大維度 15 種關鍵指標矩陣、多空共振評分儀、隨選真實日 K 回補）。
> - **V8.35.0 資安深度防護套件：Web Crypto 敏感憑證加密、CORS 安全代理邊界路由與 CSV DDE 公式注入防禦**（端到端保密持久化：AES-GCM 256-bit + PBKDF2 100,000 次雜湊衍生；智能安全代理路由：憑證敏感 Header/Query 強制阻斷外流公共代理池；CSV/Excel DDE 注入脫逸消毒；JSON 備份脫敏匯出；自訂代理 SSRF 內網阻擋校驗）。
> **品質狀態**：全量單元測試 **867/867 通過 (100% Passed / 88 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，Vite 生產環境打包順利通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`fix/45-financial-forensic-modal-styling`
- **單元測試套件**：**867/867 通過 (88 test suites / 100% 綠燈，耗時 ~28s)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包耗時 ~5.8 秒，產出 0 錯誤
- **當前釋出版本**：**V8.42.1**
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens（如 FinMind / FMP / 自訂代理）均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `cryptoEngine.ts`、`secureProxyRouter.ts`、`csvSanitizer.ts`、`priceFetcher.ts`、`muscleBookerEngine.ts`、`cashLedgerEngine.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化，嚴格遵守每小時 5 次推播節流與 CI 防濫用原則。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及金融報價、殖利率、股價昨收、成分股變更等數據解析時。
   - 核心準則：強制多源交叉驗證與即時 API 抓取，阻絕靜態舊資料與假性數值污染決策。
5. **`技術文件大師 (Tech Writer)`**：
   - 適用時機：每次迭代交接收尾、ADR 產出與 `CONTEXT.md` / `README.md` 同步更新。

---

## 🏛️ 3. 領域模型與架構決策追溯矩陣 (Traceability Matrix)

### 3.1 近期核心規格 (PRD) 與架構決策 (ADR) 雙向對照

| 版本 | 規格書 (PRD / Spec) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 核心變更與收益 |
| :--- | :--- | :--- | :--- | :--- |
| **v8.42.0** | [`SPEC-0123`](file:///d:/APP/股票紀錄/docs/specs/0123-financial-statement-analyzer-and-forensic-radar-spec.md) | [`ADR-0123`](file:///d:/APP/股票紀錄/docs/adr/0123-financial-statement-analyzer-and-forensic-radar.md) | `.scratch/v8.42.0-financial-statement-analyzer-and-forensic-radar` | 穿透式財報戰情室（0秒戰報 ➔ 8季趨勢矩陣 ➔ 深度排雷）、杜邦三因子長條拆解、六大逆向背離防雷偵測、會計師查核意見與四大所標章、IndexedDB 快取優先管線。 |
| **v8.35.0** | [`SPEC-0116`](file:///d:/APP/股票紀錄/docs/specs/0116-web-crypto-cors-guard-and-csv-dde-sanitization-spec.md) | [`ADR-0116`](file:///d:/APP/股票紀錄/docs/adr/0116-web-crypto-cors-guard-and-csv-dde-sanitization.md) | `.scratch/v8.35.0-web-crypto-and-security-hardening` | Web Crypto 敏感金鑰加密 (AES-GCM/PBKDF2)、CORS 安全邊界路由阻斷外流、CSV DDE 公式注入防禦與脫敏匯出。 |
| **v8.34.0** | [`SPEC-0115`](file:///d:/APP/股票紀錄/docs/specs/0115-etf-look-through-behavioral-audit-and-reconciliation-spec.md) | [`ADR-0115`](file:///d:/APP/股票紀錄/docs/adr/0115-etf-look-through-and-multi-broker-reconciliation.md) | `.scratch/v8.34.0-etf-look-through-and-reconciliation` | ETF 穿透核算分析、實質產業因子曝險下鑽、多券商對帳單自動消歧義與行為審計即時核銷。 |
| **v8.33.0** | [`SPEC-0114`](file:///d:/APP/股票紀錄/docs/specs/0114-adaptive-universe-sync-and-liveness-probe-spec.md) | [`ADR-0114`](file:///d:/APP/股票紀錄/docs/adr/0114-adaptive-universe-sync-and-liveness-probe.md) | `.scratch/v8.33.0-adaptive-universe-sync-and-liveness-probe` | 自適應動態成分股同步、存活探針、後備池自動遞補、每日開市背景校準與輕量 Toast 通知。 |
| **v8.32.0** | [`SPEC-0113`](file:///d:/APP/股票紀錄/docs/specs/0113-muscle-booker-sync-hang-and-fallback-spec.md) | [`ADR-0113`](file:///d:/APP/股票紀錄/docs/adr/0113-muscle-booker-sync-hang-proxy-404-fast-fail-and-synthetic-fallback.md) | `.scratch/v8.32.0-muscle-booker-sync-hang-and-fallback` | 替換失效代碼 SQ ➔ PYPL、本地代理 404 Fast-Fail 快速終止、合成日 K 保底防禦與 IndexedDB 持久化。 |
| **v8.31.0** | [`SPEC-0112`](file:///d:/APP/股票紀錄/docs/specs/0112-fire-compounding-drip-and-dca-simulator-spec.md) | [`ADR-0112`](file:///d:/APP/股票紀錄/docs/adr/0112-fire-compounding-drip-and-dca-simulator.md) | `.scratch/v8.31.0-fire-compounding-drip-and-dca-simulator` | DRIP 雙軌複利、DCA 假日順延防透支推演、蒙地卡羅 1,000 次 GBM 與 Guyton-Klinger 護欄。 |
| **v8.30.0** | [`SPEC-0111`](file:///d:/APP/股票紀錄/docs/specs/0111-yahoo-quote-previous-close-and-daily-change-spec.md) | [`ADR-0111`](file:///d:/APP/股票紀錄/docs/adr/0111-yahoo-quote-previous-close-and-daily-change.md) | `.scratch/v8.30.0-...` | 修復 Yahoo 報價誤用 3 個月前 `chartPreviousClose`，改以當日差值與昨收倒推，數據與券商 APP 100% 吻合。 |
| **v8.29.0** | [`SPEC-0110`](file:///d:/APP/股票紀錄/docs/specs/0110-muscle-booker-risk-reward-r-multiple-format-spec.md) | [`ADR-0110`](file:///d:/APP/股票紀錄/docs/adr/0110-muscle-booker-risk-reward-r-multiple-format.md) | `.scratch/v8.29.0-...` | 風益比全面統一為標準 `${rrRatio}R`（如 `7.9R`），消滅上下方向顛倒與冗贅混搭語病。 |
| **v8.28.0** | [`SPEC-0109`](file:///d:/APP/股票紀錄/docs/specs/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency-spec.md) | [`ADR-0109`](file:///d:/APP/股票紀錄/docs/adr/0109-muscle-booker-bandwidth-gate-target-price-and-us-currency.md) | `.scratch/v8.28.0-...` | 布林帶寬 $\le 8\%$ 硬門檻防追高、作戰看板目標價對齊、美股 `US$` 貨幣別統一標示。 |
| **v8.27.0** | [`SPEC-0108`](file:///d:/APP/股票紀錄/docs/specs/0108-muscle-booker-top3-action-brief-and-holding-gated-sell-spec.md) | [`ADR-0108`](file:///d:/APP/股票紀錄/docs/adr/0108-muscle-booker-top3-action-brief-and-holding-gated-sell.md) | `.scratch/v8.27.0-...` | 今日核心作戰指令看板（Top 3 買進先鋒 vs 在庫限定賣出）與雙向自適應色彩主題。 |

### 3.2 領域術語與單一事實來源 (SSOT)
- **領域詞彙手冊**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
  - 核心規範包含：`Web Crypto Master Key & PBKDF2 Derivation`、`CORS Proxy Safe Boundary Router`、`CSV DDE Injection Sanitization`、`Look-Through Weighting Engine`、`Reconciliation Disambiguation Engine`、`Adaptive Dynamic Universe & Stale-While-Revalidate Baseline`、`Reserve Candidates Pool & Auto-Healing Engine`、`Pre-Market Daily Auto-Sync & Throttling`、`Universal R-Multiple Standard`、`DRIP Dual-Track Compounding`、`DCA Holiday-Aware Scheduler` 等。

---

## 📂 4. 實體模組與程式碼架構地圖 (Codebase & Component Architecture)

### 4.1 核心運算與管線引擎 (`src/engine/`)

| 模組分類 | 檔案路徑 | 核心職責與特性 | 測試覆蓋 |
| :--- | :--- | :--- | :--- |
| **Web Crypto 安全密鑰** | [`src/engine/cryptoEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cryptoEngine.ts) | 原生 Web Crypto API (AES-GCM 256-bit + PBKDF2 100,000 次)、零外部依賴、純密文持久化。 | 9 tests |
| **智能安全代理路由** | [`src/engine/secureProxyRouter.ts`](file:///d:/APP/股票紀錄/src/engine/secureProxyRouter.ts) | 憑證安全邊界校驗、阻斷敏感金鑰流向公共代理池、自訂代理 SSRF 內網阻擋校驗。 | 10 tests |
| **CSV 公式注入防護** | [`src/engine/csvSanitizer.ts`](file:///d:/APP/股票紀錄/src/engine/csvSanitizer.ts) | DDE 惡意公式注入消毒 (`=,+,-,@,\t,\r` 前綴脫逸)、JSON 敏感帳密脫敏遮罩。 | 22 tests |
| **ETF 穿透核算引擎** | [`src/engine/lookThroughEngine.ts`](file:///d:/APP/股票紀錄/src/engine/lookThroughEngine.ts) | 跨標的持倉下鑽、穿透綜合實質權重計算、真實產業因子曝險聚合。 | 4 tests |
| **對帳單消歧與對賬** | [`src/engine/reconciliationEngine.ts`](file:///d:/APP/股票紀錄/src/engine/reconciliationEngine.ts) | 多券商格式自動偵測、重疊流水號衝突消歧、行為紀律偏差即時核銷。 | 9 tests |
| **自適應動態成分股** | [`src/engine/adaptiveUniverseEngine.ts`](file:///d:/APP/股票紀錄/src/engine/adaptiveUniverseEngine.ts) | 存活探針、後備候選池庫自動遞補、開市前每日校準、假日與同日節流保護。 | 10 tests |
| **肌肉書僮量化引擎** | [`src/engine/muscleBookerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/muscleBookerEngine.ts) | 箱體突破、20MA 扣抵翻揚、帶寬門檻 $\le 8\%$、R 倍數制 (`7.9R`)、動態快取委託。 | 14 tests |
| **市場即時報價引擎** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | 安全代理路由整合、Yahoo Chart 昨收隔離、HTTP 404 Fast-Fail 快速終止、多代理輪詢。 | 25 tests |
| **歷史日 K 回補引擎** | [`src/engine/historicalOhlcvBackfill.ts`](file:///d:/APP/股票紀錄/src/engine/historicalOhlcvBackfill.ts) | 7 天短期增量抓取、合成日 K 保底防禦、IndexedDB 歷史持久化。 | 10 tests |
| **DRIP 複利滾雪球** | [`src/engine/dripCompoundingEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dripCompoundingEngine.ts) | 雙軌市值對比、股份指數放大、複利增益倍數、4 階被動收入自由度里程碑連續線性插值。 | 8 tests |
| **DCA 智慧排程防透支** | [`src/engine/dcaSchedulerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dcaSchedulerEngine.ts) | 國定假日休市順延下一撮合日 ($T$)、T+2/T+1 交割日曆、未來 30 天防透支現金推演。 | 7 tests |
| **蒙地卡羅 FIRE 模擬** | [`src/engine/monteCarloFireEngine.ts`](file:///d:/APP/股票紀錄/src/engine/monteCarloFireEngine.ts) | 純原生 0 依賴 Box-Muller 標準常態亂數、幾何布朗運動 1,000 次隨機路徑、Guyton-Klinger 動態護欄。 | 6 tests |
| **宏觀戰情室矩陣** | [`src/engine/marginStressMatrixEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marginStressMatrixEngine.ts) | 黑天鵝情境矩陣、斷頭保證金受壓試算、維持率敏感度分析。 | 6 tests |
| **雙動能輪動引擎** | [`src/engine/dualMomentumEngine.ts`](file:///d:/APP/股票紀錄/src/engine/dualMomentumEngine.ts) | 絕對動能與相對動能雙重過濾、跨市場輪動與避險配置。 | 7 tests |
| **量化體檢指標** | [`src/engine/quantMetrics.ts`](file:///d:/APP/股票紀錄/src/engine/quantMetrics.ts) | 夏普值 (Sharpe)、索提諾值 (Sortino)、最大回撤 (MDD)、年化波動率與基準比較。 | 20 tests |
| **公司行動智慧掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | TWSE 官方除權息/減資預告表解析、Yahoo 行動掃描、虛擬時序動態配股與二代健保扣繳。 | 22 tests |
| **官方股票字典同步** | [`src/engine/stockDictionarySync.ts`](file:///d:/APP/股票紀錄/src/engine/stockDictionarySync.ts) | TWSE / TPEx 上市櫃與興櫃官方標的自動同步、智慧自動補全。 | 4 tests |
| **現金、在途與購買力** | [`src/engine/cashLedgerEngine.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) | 三層可用性核算 (`calculateAccountBalances`)、交易購買力風控、法定假日結算日曆。 | 29 tests |
| **歷史 NAV 引擎** | [`src/engine/historicalNav.ts`](file:///d:/APP/股票紀錄/src/engine/historicalNav.ts) | 歷史日 K 增量同步、遇假日 Forward-Fill、排除 relatedTradeId 避免雙重扣款。 | 9 tests |
| **XIRR 數值求解引擎** | [`src/engine/xirrCalculator.ts`](file:///d:/APP/股票紀錄/src/engine/xirrCalculator.ts) | 0 依賴 Newton-Raphson + Bisection 混合求解器、30 天平滑防護、現金流時序聚合。 | 11 tests |
| **穿透式財報鑑識引擎** | [`src/engine/financialScoringEngine.ts`](file:///d:/APP/股票紀錄/src/engine/financialScoringEngine.ts) | 0~100 分綜合體質評估、獲利/安全/效率/現金流四大指示燈、杜邦三因子拆解與白話結論。 | 35 tests |
| **逆向防雷鑑識雷達** | [`src/engine/forensicRadarEngine.ts`](file:///d:/APP/股票紀錄/src/engine/forensicRadarEngine.ts) | 「市場沒說什麼」六大結構性背離排雷（塞貨、紙上富貴、借債配息、業外虛胖、SBC稀釋、審計異常）。 | 8 tests |
| **財報資料雙軌管線** | [`src/engine/financialReportService.ts`](file:///d:/APP/股票紀錄/src/engine/financialReportService.ts) | IndexedDB 快取優先、台股 FinMind / 美股 FMP 雙軌隨選載入、永久快取歷史季度。 | 8 tests |

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **ETF 穿透與產業曝險** | [`src/components/LookThroughIntegration.tsx`](file:///d:/APP/股票紀錄/src/components/LookThroughIntegration.tsx) | ETF Look-Through 權重下鑽、跨標的綜合實質產業因子曝險圖表與體檢視窗。 |
| **多券商對帳單消歧核銷** | [`src/components/ReconciliationModal.tsx`](file:///d:/APP/股票紀錄/src/components/ReconciliationModal.tsx) | 批次對帳單衝突消歧、差異比對、多筆交易一鍵核銷與審計標記。 |
| **肌肉書僮工作台** | [`src/components/MuscleBookerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MuscleBookerWorkspace.tsx) | 開市自動校準、輕量 Toast 通知、狀態列指示與手動檢查、雙欄作戰看板 (Top 3 BUY vs Holding SELL)、日 K 就緒度進度條。 |
| **宏觀戰情室工作台** | [`src/components/MacroWarRoomWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/MacroWarRoomWorkspace.tsx) | 全球總經脈動、黑天鵝壓力測試矩陣、雙動能輪動雷達與 AI 策略建議。 |
| **籌碼星圖工作台** | [`src/components/ChipsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/ChipsWorkspace.tsx) | 雙模式切換（在庫持倉 vs 全市場法人焦點 Top 30）、四象限診斷膠囊、籌碼重整。 |
| **現金與交割工作台** | [`src/components/CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) | 四核心可用性發光看板、在途交割時序排程面板、交割戶資金網格、質押風控。 |
| **設定與時光機看板** | [`src/components/SettingsWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/SettingsWorkspace.tsx) | 券商手續費率、Web Crypto 敏感金鑰防護徽章、自訂代理 SSRF 檢驗、脫敏備份匯出、時光機快照管理。 |
| **穿透式財報深度戰情室** | [`src/components/financial/FinancialForensicModal.tsx`](file:///d:/APP/股票紀錄/src/components/financial/FinancialForensicModal.tsx) | 三層漸進式架構（0秒戰報 ➔ 8季趨勢矩陣 ➔ 深度排雷）、純 SVG 走勢圖、一鍵導出 Markdown 研報。 |

---

## 🛠️ 5. 技術債現況追蹤 (Technical Debts Status)

依據專案規範與 [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)，當前已累積 35 篇技術債與架構改進提案，其中重點如下：

- **已完成 / 已解決 (`RESOLVED`)**：
  - `DEBT-0001` ~ `DEBT-0018`：持股排序 DRY、交易紀律審查、現金簿 NAV、時光機 IndexedDB、質押壓力測試、XIRR 引擎、量化指標、股票字典同步等均已完整實作並驗收。
  - `DEBT-0021`：智慧定期定額 (DCA) 排程器與防透支推演（已於 V8.31.0 實作）。
  - `DEBT-0022`：蒙地卡羅 FIRE 退休安全提領模擬器（已於 V8.31.0 實作）。
  - `DEBT-0024`：ETF 穿透分析與產業因子集中度體檢（已於 V8.34.0 實作）。
  - `DEBT-0025`：黑天鵝保證金壓力測試矩陣（已於 V8.12.0 實作）。
  - `DEBT-0027`：雙動能輪動體系（已於 V8.11.0 實作）。
  - `DEBT-0028`：多券商對帳單智慧匯入衝突消解器（已於 V8.34.0 實作）。
  - `DEBT-0029`：股息再投資 (DRIP) 複利引擎與現金流增長預測（已於 V8.31.0 實作）。
  - `DEBT-0030`：Web Crypto API 敏感金鑰加密與端到端保密持久化（已於 V8.35.0 實作）。
  - `DEBT-0031`：公共 CORS 代理憑證防洩漏與安全邊界路由機制（已於 V8.35.0 實作）。
  - `DEBT-0032`：CSV 公式注入防禦 (DDE Protection) 與備份匯出脫敏機制（已於 V8.35.0 實作）。
- **待進行評估之架構改善 (Backlog / Open)**：
  - `DEBT-0023`：PWA 離線優先與端到端加密 (E2EE) 雲端同步。
  - `DEBT-0033`：靜態資源 Content-Security-Policy (CSP) 安全標頭與 XSS 深度防護。
  - `DEBT-0034`：JSON / CSV 匯入解析的原型鏈污染 (Prototype Pollution) 與邊界防護。
  - `DEBT-0035`：大型交易紀錄分頁載入與虛擬列表 (Virtualization) 滾動效能優化。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支**：
   - 當前位於 `main` 主幹分支，工作目錄 100% clean。
   - 所有代碼變更、規格書、ADR、本地票券與交接文檔均已合併收斂（最新 Commit: `4ae9dc3`）。
2. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 736 個測試 100% 通過）與 `npm run build`（確認 0 型別錯誤）。
3. **新需求啟動流程**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。
