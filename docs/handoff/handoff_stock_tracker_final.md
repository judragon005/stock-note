# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Dossier)

> **交接產生時間**：2026-10-22 13:08 (UTC+8)  
> **當前最新里程碑**：
> - **V8.115.0 個股分析深度財報全域資料治理、湖倉對齊與極簡重構**（ADR 0202, Spec 0202, Issue #322, #323, PR #324）：
>   - **Ticket 01 Piotroski F-Score 增資稀釋動態評分與流動負債係數剔除**：
>     - 徹底拔除第 5 項未增資稀釋寫死 `passed: true`，改依近 4 季/去年同期股本增資膨脹率 (>5%) 動態評估股權稀釋，並呈現真實膨脹幅度。
>     - 徹底移除流動負債 `總負債 * 0.5` 偽造係數，財報未單獨揭露時誠實標註無法客觀評估並不予給分，落實 Zero-Mock Protocol。
>     - 單元測試於公開測試縫隙全覆蓋，14/14 測試通過。
> - **V8.114.0 戰情室外部 AI 多智囊團並行回流、模型去重覆蓋與法人風控共識防線**（ADR 0201, Spec 0201, Issue #318, PR #319, #320）：
>   - **多模型並存與同名覆蓋機制**：同標的下以正規化模型名稱為識別鍵，同名模型後者覆蓋更新，異名模型追加並列展示，徹底打破單一 AI 裁決限制。
>   - **AI 模型名稱語意正規化 (normalizeAiModelName)**：精確映射 Claude, ChatGPT, Perplexity, Gemini 等頂級模型，未知模型安全清洗去重。
>   - **全域正則批次抽取 (parseLoopbackContentBatch)**：單次貼入長篇 Markdown 即可批次提純多個 JSON 策略代碼塊。
>   - **法人風控最嚴格停損優先警報 (evaluateMultiStrategyTriggers)**：盤中取所有有效模型中最高停損價（`Math.max(...stopLosses)`）作為第一道保命防線，市價跌破即刻閃爍報警並指名發起模型，徹底封死主觀凹單。
>   - **智囊團共識與分歧度量化 (Consensus Level)**：停損落差比率 $<2\%$ 標註「🛡️ 智囊團共識防線」；$>5\%$ 標註「⚡ 智囊團分歧警告 (建議縮小部位)」。
>   - **獨立與全隊結案回報**：支援單卡獨立與全員一鍵（WIN / LOSS）結案，戰績精準歸屬累積勝率榜。
>   - **緊湊條列排版 (38px/行)**：提取樣式 Tokens，排版緊湊高密度，保護戰情室核心線圖與籌碼視野。
>   - **雙軌向下相容讀取**：舊版單一物件無縫自動包裹為陣列，零 Migration 成本與零升級白屏風險。
> - **V9.11.0 AI 主力戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline 對稱對齊**（ADR 0195, Spec 0195, Issue #290）：
>   - **Card 19 TDCC 集保趨勢標的確認與美股 13F / 放空籌碼卡**：台股綁定代碼標題與散戶持股剪刀差；美股自適應為機構持股、空單佔流通比 (Short Float) 與內部人持股，>10% 觸發軋空警戒，徹底根除空白佔位。
>   - **Card 15 籌碼摘要 50%:50% 寬幅對稱與美股微觀量價**：重構為 `1fr 1fr` 等寬對稱，monospace 數值防折行，Sparkline 加入 0 軸水平分水嶺基準線；美股呈現 RVOL、VWAP 偏離、MFI 機構量能與 ATR 日振幅。
>   - **Card 13 美股宏觀情緒激活**：直讀本地 SQLite `macro_sentiment_daily`，展示 CNN Fear & Greed (半圓指針映射)、VIX 恐慌指數與 10Y 美債殖利率。
>   - **Card 21 全新估值與殖利率量化矩陣四態自適應**：台股個股（盤中動態 PE/PB/年化殖利率 + 歷史位階條）、美股個股（Forward PE/PB/扣 30% IRS 稅後殖利率）、虧損轉機股（市銷率 PS）、ETF 標的（折溢價率 >0.5% 警戒、總費用率、年化配息率）。
>   - **Layer 6 雙子容器 (`EnergySentimentTwinCard`) 封裝與 250px 鎖定**：垂直緊湊封裝 Card 10 + 13，中段計算產出 Alpha 共振仲裁標籤；四欄高度鎖定 250px 像素級齊平，消除拉長破版。
>   - **全域外聯提示詞中樞連動與金融字典閉環**：提示詞中樞注入 `<valuation_status>` 節點與美股宏觀情緒，字典齊備 6 項新術語解釋。
> > **品質狀態**：全量單元測試 **1,821/1,821 通過 (100% Passed / 243 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，GitHub Actions CI 綠燈通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`main` (已完全同步)
- **單元測試套件**：**1,821/1,821 通過 (243 test suites / 100% 綠燈)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包順利通過，0 錯誤
- **當前釋出版本**：**V8.115.0**
- **工作區與分支整潔度**：工作區乾淨受控，本地 feature/fix 分支已完全合併並清理。
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens 均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `aiForceDashboardEngine.ts`、`volumeProfileEngine.ts`、`forecastConeEngine.ts`、`keyMetricsEngine.ts`、`taiwanFinancialPipeline.ts`、`cryptoEngine.ts`、`secureProxyRouter.ts`）前。
   - 核心準則：進行全量影響評估，杜絕「修復 A 損壞 B」。
3. **`GitHub 工作流顧問 (GitHub Workflow Consultant)`**：
   - 適用時機：建立分支、管理 Issue、發起 PR、Squash & Merge 與分支清理。
   - 核心準則：嚴禁直推 `main`，維持 `Issue-First` 與 PR 關聯自動化，嚴格遵守每小時 5 次推播節流與 CI 防濫用原則。
4. **`數據實時校驗與防幻覺專家 (Real-Time Data Verification Expert)`**：
   - 適用時機：涉及股價、股利發放日、除息日、本益比、殖利率與財務報表資料。
   - 核心準則：實施即時 API 與官方發放日查表比對，拒絕靜態假資料與幻覺數值，堅持第一性原理推導真實數據與時間軸。

---

## 🏗️ 3. 規格、架構決策與版本鏡像對照 (Specs, ADRs & Local Tickets)

| 規格編號 (PRD) | 架構決策紀錄 (ADR) | 本地票券目錄 (.scratch/) | 關聯 Issue / PR | 版本 | 核心主題 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`Spec 0202`](file:///d:/APP/股票紀錄/docs/specs/0202-stock-analysis-forensic-accounting-cleanse-and-lakehouse-spec.md) | [`ADR 0202`](file:///d:/APP/股票紀錄/docs/adr/0202-stock-analysis-forensic-accounting-cleanse-and-lakehouse.md) | [`.scratch/v8.115.0-stock-analysis-forensic-accounting-cleanse-and-lakehouse/`](file:///d:/APP/股票紀錄/.scratch/v8.115.0-stock-analysis-forensic-accounting-cleanse-and-lakehouse/) | Issue #322, #323 / PR #324 | V8.115.0 | 個股深度財報假資料清零、湖倉打通、會計勾稽修復與極簡架構重構 (Ticket 01 完成) |
| [`Spec 0201`](file:///d:/APP/股票紀錄/docs/specs/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense-spec.md) | [`ADR 0201`](file:///d:/APP/股票紀錄/docs/adr/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense.md) | [`.scratch/v8.114.0-war-room-multi-ai-syndicate-loopback-and-consensus-defense/`](file:///d:/APP/股票紀錄/.scratch/v8.114.0-war-room-multi-ai-syndicate-loopback-and-consensus-defense/) | Issue #318 / PR #319, #320 | V8.114.0 | 戰情室外部 AI 多智囊團並行回流、模型去重覆蓋與法人風控共識防線架構 (4 大 Micro-Tickets) |
| [`Spec 0195`](file:///d:/APP/股票紀錄/docs/specs/0195-ai-force-dashboard-layout-reorganization-card21-valuation-and-chips-sparkline-spec.md) | [`ADR 0195`](file:///d:/APP/股票紀錄/docs/adr/0195-ai-force-dashboard-layout-reorganization-card21-valuation.md) | [`.scratch/0195-ai-force-dashboard-layout-reorganization-card21/`](file:///d:/APP/股票紀錄/.scratch/0195-ai-force-dashboard-layout-reorganization-card21/) | Issue #290 | V9.11.0 | 戰情室 Layer 6 雙子堆疊重構、Card 21 估值卡導入與 Card 15 寬幅 Sparkline 對稱對齊 (12 大 Micro-Tickets) |
| [`Spec 0194`](file:///d:/APP/股票紀錄/docs/specs/0194-war-room-prompt-temporal-and-cyclical-alignment-spec.md) | [`ADR 0194`](file:///d:/APP/股票紀錄/docs/adr/0194-war-room-prompt-temporal-and-cyclical-alignment.md) | [`.scratch/0194-war-room-prompt-temporal-and-cyclical-alignment/`](file:///d:/APP/股票紀錄/.scratch/0194-war-room-prompt-temporal-and-cyclical-alignment/) | Issue #288 | V9.10.0 | 戰情室外聯提示詞時態一致性、景氣循環判定與法人風控對齊（量價一致性、威剛/群聯循環股、時態隔離宣告、停損實質預算、借券賣出） |
| [`Spec 0193`](file:///d:/APP/股票紀錄/docs/specs/0193-institutional-macro-war-room-2-spec.md) | [`ADR 0193`](file:///d:/APP/股票紀錄/docs/adr/0193-institutional-macro-war-room-2.md) | [`.scratch/0193-institutional-macro-war-room-2/`](file:///d:/APP/股票紀錄/.scratch/0193-institutional-macro-war-room-2/) | Issue #283, #285 / PR #284, #286 | V9.00.0 | 法人旗艦級宏觀戰情室 2.0（宏觀水溫計、台美分流、1-Day VaR、3 階壓力測試、Zero Mock 雙動能、三段時序雷達、晨會簡報雙軌複製） |
| [`Spec 0188`](file:///d:/APP/股票紀錄/docs/specs/0188-full-market-all-history-lakehouse-and-preload-decoupling-spec.md) | [`ADR 0188`](file:///d:/APP/股票紀錄/docs/adr/0188-full-market-all-history-lakehouse-and-preload-decoupling.md) | [`.scratch/v8.101.0-lakehouse-full-history-and-preload/`](file:///d:/APP/股票紀錄/.scratch/v8.101.0-lakehouse-full-history-and-preload/) | Issue #271 | V8.101.0 | 全市場全歷史數據湖倉架構解耦、250日預載視窗與跨模組本地優先整合工程 (6 大 Tickets) |
| [`Spec 0187`](file:///d:/APP/股票紀錄/docs/specs/0187-backfill-timeout-watchdog-and-cancellation-control-spec.md) | [`ADR 0187`](file:///d:/APP/股票紀錄/docs/adr/0187-backfill-timeout-watchdog-and-cancellation-control.md) | [`.scratch/issues/issue-268.md`](file:///d:/APP/股票紀錄/.scratch/issues/issue-268.md) | Issue #268 / PR #269 | V8.100.0 | 歷史回補端到端全生命週期超時、單日看門狗與任務取消重設控制 (5 大 Micro-Tickets) |
| [`Spec 0186`](file:///d:/APP/股票紀錄/docs/specs/0186-us-market-backfill-transparency-lakehouse-alignment-and-eperm-resilience-spec.md) | [`ADR 0186`](file:///d:/APP/股票紀錄/docs/adr/0186-us-market-backfill-transparency-lakehouse-alignment-and-eperm-resilience.md) | [`.scratch/v8.99.0-us-market-backfill-transparency/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.99.0-us-market-backfill-transparency/issues/) | Issue #266 | V8.99.0 | 美股歷史回補透明度透視、斷點庫存對齊與 Windows EPERM 韌性強化 (4 大 Micro-Tickets) |
| [`Spec 0185`](file:///d:/APP/股票紀錄/docs/specs/0185-market-backfill-etf-cache-verification-and-transparency-spec.md) | [`ADR 0185`](file:///d:/APP/股票紀錄/docs/adr/0185-etf-cache-verification-and-transparency.md) | [`.scratch/v8.98.0-market-backfill-etf-cache-verification/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.98.0-market-backfill-etf-cache-verification/issues/) | Issue #264 / PR #265 | V8.98.0 | 台股歷史回補 ETF 快取查驗納入、法人現貨口徑對齊與透視化可觀測性 (4 大 Micro-Tickets) |
| [`Spec 0184`](file:///d:/APP/股票紀錄/docs/specs/0184-market-backfill-smart-skip-retry-and-eta-spec.md) | [`ADR 0184`](file:///d:/APP/股票紀錄/docs/adr/0184-market-backfill-smart-skip-retry-and-eta.md) | [`.scratch/v8.97.0-market-backfill-smart-skip-retry-and-eta/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.97.0-market-backfill-smart-skip-retry-and-eta/issues/) | Issue #258, #260 / PR #259, #261 | V8.97.0 | 台股歷史回補智慧快取略過、盤中時間定錨、權證排除與即時 ETA 引擎 (6 大 Micro-Tickets) |

| [`Spec 0183`](file:///d:/APP/股票紀錄/docs/specs/0183-personal-investor-institutional-edge-and-lean-enhancements-spec.md) | [`ADR 0183`](file:///d:/APP/股票紀錄/docs/adr/0183-personal-investor-institutional-edge-and-lean-enhancements.md) | [`.scratch/v8.96.0-personal-investor-institutional-edge-and-lean-enhancements/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.96.0-personal-investor-institutional-edge-and-lean-enhancements/issues/) | Issue #254 / PR #255, #256 | V8.96.0 | 個人投資者法人級微觀防禦、現金流預算與極簡風控強化 (7 大 Micro-Tickets) |

| [`Spec 0182`](file:///d:/APP/股票紀錄/docs/specs/0182-strategic-prompt-grounding-stale-state-and-portfolio-isolation-spec.md) | [`ADR 0182`](file:///d:/APP/股票紀錄/docs/adr/0182-strategic-prompt-grounding-and-portfolio-isolation.md) | [`.scratch/v8.95/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.95/issues/) | Issue #248, #251 / PR #250, #252 | V8.95.0 | 戰情室 Prompt 標的時態隔離、庫存自動錨定與時態籌碼細化 |
| [`Spec 0181`](file:///d:/APP/股票紀錄/docs/specs/0181-strategic-prompt-war-room-relocation-and-grounding-spec.md) | [`ADR 0181`](file:///d:/APP/股票紀錄/docs/adr/0181-strategic-prompt-war-room-relocation.md) | [`.scratch/v8.94/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.94/issues/) | Issue #243, #245 / PR #244, #246 | V8.94.0 | 個股深度提示詞物理遷移至主力戰情室、外聯 AI 防幻覺定錨與極簡作戰中樞 |
| [`Spec 0180`](file:///d:/APP/股票紀錄/docs/specs/0180-forensic-accounting-etf-isolation-and-ui-repair-spec.md) | [`ADR 0180`](file:///d:/APP/股票紀錄/docs/adr/0180-forensic-accounting-etf-isolation-and-ui-repair.md) | [`.scratch/v8.93/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.93/issues/) | Issue #230, #237, #239 / PR #236, #238, #240 | V8.93.0 | 個股深度財報法務會計排雷、ETF 物理隔離與智策引擎 UI 重構 |
| [`Spec 0153`](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md) | [`ADR 0153`](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md) | [`.scratch/v8.91/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.91/issues/) | Issue #135 / PR #225 | V8.91.0 | 智策精煉投資決策多維提示詞引擎與六頂思考帽工作區生成器 |
| [`Spec 0178`](file:///d:/APP/股票紀錄/docs/specs/0178-documentation-integrity-audit-broken-links-repair-and-linter-spec.md) | [`ADR 0178`](file:///d:/APP/股票紀錄/docs/adr/0178-documentation-integrity-audit-broken-links-repair-and-linter.md) | [`.scratch/v8.90/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.90/issues/) | Issue #220 / PR #221 | V8.90.0 | 專案全量文檔完整性稽核、死鏈全數修復、變更日誌補齊與自動化守門機制 |
| [`Spec 0177`](file:///d:/APP/股票紀錄/docs/specs/0177-auto-sync-tdcc-revenue-and-kline-institutional-spectrum-spec.md) | [`ADR 0177`](file:///d:/APP/股票紀錄/docs/adr/0177-auto-sync-tdcc-revenue-and-kline-institutional-spectrum.md) | [`.scratch/v8.89/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.89/issues/) | Issue #217 / PR #218 | V8.89.0 | TDCC 集保大戶與月營收全自動新鮮度管線、主 K 線雙灰線修復與券商法人色譜 |
| [`Spec 0176`](file:///d:/APP/股票紀錄/docs/specs/0176-ai-force-card18-verdict-playbook-color-spectrum-and-institutional-gate-spec.md) | [`ADR 0176`](file:///d:/APP/股票紀錄/docs/adr/0176-card18-verdict-playbook-and-color-spectrum.md) | [`.scratch/v8.88/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.88/issues/) | Issue #214 / PR #215 | V8.88.0 | 主力戰情室 Card 18 主力追蹤總評判操盤指引升級、5 態作戰光譜圖例與機構級風控門檻 |
| [`Spec 0175`](file:///d:/APP/股票紀錄/docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md) | [`ADR 0175`](file:///d:/APP/股票紀錄/docs/adr/0175-api-key-probe-csp-cors-and-endpoint-repair.md) | [`.scratch/v8.87/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.87/issues/) | Issue #209 / PR #212, #213 | V8.87.0 | 外部金融 API 控制台探針修復、CSP/CORS 網路防禦與 NAS 通用反向代理 |
| [`Spec 0174`](file:///d:/APP/股票紀錄/docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md) | [`ADR 0174`](file:///d:/APP/股票紀錄/docs/adr/0174-ai-force-dashboard-visual-master-layout-and-tooltip.md) | [`.scratch/v8.86/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.86/issues/) | Issue #203, #205 / PR #204, #206 | V8.86.0 | 主力戰情室視覺大師級版面重構、TermTooltip 500px 旗艦升級與籌碼熱區 1:1 對位 |
| [`Spec 0173`](file:///d:/APP/股票紀錄/docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md) | [`ADR 0173`](file:///d:/APP/股票紀錄/docs/adr/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow.md) | [`.scratch/v8.85/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.85/issues/) | Issue #197, #199 / PR #198, #200 | V8.85.0 | 全市場個股深度投研高容錯雙軌剪貼簿、全鏈路數據管線與券商法人風控閉環 |
| [`Spec 0172`](file:///d:/APP/股票紀錄/docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md) | [`ADR 0172`](file:///d:/APP/股票紀錄/docs/adr/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor.md) | [`.scratch/v8.84/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.84/issues/) | Issue #195 / PR #196 | V8.84.0 | 主力戰情室全景佈局重構、量化引擎修復與專業任務視圖升級 |
| [`Spec 0171`](file:///d:/APP/股票紀錄/docs/specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager-spec.md) | [`ADR 0171`](file:///d:/APP/股票紀錄/docs/adr/0171-sync-checkpoints-index-and-api-key-manager-decomposition.md) | [`.scratch/v8.83/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.83/issues/) | Issue #193 / PR #194 | V8.83.0 | SQLite 斷點檢查點複合狀態索引優化與金鑰管理員視圖模組化解耦 (0 OPEN Debts) |
| [`Spec 0169`](file:///d:/APP/股票紀錄/docs/specs/0169-ai-force-war-room-institutional-tdcc-revenue-and-us-microstructure-spec.md) | [`ADR 0169`](file:///d:/APP/股票紀錄/docs/adr/0169-ai-force-war-room-institutional-tdcc-revenue-and-us-microstructure.md) | [`.scratch/v8.82/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.82/issues/) | Issue #188 / PR #189 | V8.82.0 | AI 主力戰情室法人籌碼與 TDCC 大戶端到端貫通、月營收與 ETF 自適應、美股微觀結構獨立化與搜尋體驗全面補強 |
| [`Spec 0168`](file:///d:/APP/股票紀錄/docs/specs/0168-zero-csv-dual-market-backfill-and-unified-api-key-console-spec.md) | [`ADR 0168`](file:///d:/APP/股票紀錄/docs/adr/0168-zero-csv-dual-market-backfill-and-unified-api-key-console.md) | [`.scratch/v8.81/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.81/issues/) | Issue #182 / PR #183 | V8.81.0 | 台美雙軌零 CSV 歷史全回補、真實成交筆數入庫、櫃買代碼標準化與統一金融金鑰控制中心 |
| [`Spec 0161`](file:///d:/APP/股票紀錄/docs/specs/0161-market-freshness-service-decoupling-spec.md) | [`ADR 0161`](file:///d:/APP/股票紀錄/docs/adr/0161-market-freshness-service-decoupling.md) | [`.scratch/v8.74/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.74/issues/) | Issue #153 | V8.74.0 | 市場時區新鮮度服務解耦、中介層消除 Feature Envy 依戀情結、獨立公開測試縫隙 |
| [`Spec 0160`](file:///d:/APP/股票紀錄/docs/specs/0160-market-sync-catchup-and-kline-ssot-alignment-spec.md) | [`ADR 0160`](file:///d:/APP/股票紀錄/docs/adr/0160-market-sync-catchup-and-kline-ssot-alignment.md) | [`.scratch/v8.73/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.73/issues/) | Issue #150 / PR #151 | V8.73.0 | 市場數據過期自動追趕同步、本機湖倉推進至 10/02、主力戰情室預載 0050、主 K 線 SSOT 自適應縫合防拼裝 |
| [`Spec 0149`](file:///d:/APP/股票紀錄/docs/specs/0149-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements-spec.md) | [`ADR 0149`](file:///d:/APP/股票紀錄/docs/adr/0149-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements.md) | [`.scratch/v8.62.0-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.62.0-scheduled-sync-anchor-repair-and-ai-force-cards-ux-enhancements/issues/) | Issue #125 / PR #126 | V8.62.0 | 全市場排程工作目錄絕對錨定、空數據防清空守門員、搜尋代碼彈性防截斷、Tooltip Portal 穿透、Card 04 籌碼熱區圖自適應填滿、Card 05 風險雷達圖半徑擴大與大字級 |
| [`Spec 0148`](file:///d:/APP/股票紀錄/docs/specs/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair-spec.md) | [`ADR 0148`](file:///d:/APP/股票紀錄/docs/adr/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair.md) | [`.scratch/v8.61.0-ai-force-cards-visual-fidelity-and-popover-boundary-repair/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.61.0-ai-force-cards-visual-fidelity-and-popover-boundary-repair/issues/) | Issue #121 / PR #122 | V8.61.0 | 卡片 04/02/06/07 視覺動態連動、自適應刻度與熱力矩陣、三態橫幅、扇形預測錐與山脈堆疊、字典小方塊抗裁切防遮蔽 |
| [`Spec 0145`](file:///d:/APP/股票紀錄/docs/specs/0145-ai-force-dashboard-responsive-bento-grid-and-header-redesign-spec.md) | [`ADR 0145`](file:///d:/APP/股票紀錄/docs/adr/0145-ai-force-dashboard-responsive-bento-grid-and-header-redesign.md) | [`.scratch/v8.58.0-ai-force-bento-grid-and-header-redesign/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.58.0-ai-force-bento-grid-and-header-redesign/issues/) | Issue #112 / PR #113 | V8.58.0 | 雙層全繁中即時行情列、01 主 K 線獨立全寬滿版、01➔18 內容導向自然流 Bento-Grid、圖表防碰撞修復 |
| [`Spec 0144`](file:///d:/APP/股票紀錄/docs/specs/0144-ai-force-cards-06-07-photo-alignment-spec.md) | [`ADR 0144`](file:///d:/APP/股票紀錄/docs/adr/0144-ai-force-cards-06-07-photo-alignment.md) | [`.scratch/v8.57.0-ai-force-cards-06-07-photo-alignment/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.57.0-ai-force-cards-06-07-photo-alignment/issues/) | Issue #109 / PR #110 | V8.57.0 | 卡片 06 雙色發散錐與價格軸、卡片 07 多時段多層波形堆疊圖、卡片 09 籌碼換手率校準 |
| [`Spec 0143`](file:///d:/APP/股票紀錄/docs/specs/0143-ai-force-institutional-chips-and-task-views-live-sync-spec.md) | [`ADR 0143`](file:///d:/APP/股票紀錄/docs/adr/0143-ai-force-institutional-chips-and-task-views-live-sync.md) | [`.scratch/v8.56.0-ai-force-institutional-chips-and-task-views/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.56.0-ai-force-institutional-chips-and-task-views/issues/) | Issue #103, #105, #107 | V8.56.0 | 三大法人真實籌碼管線、中間量化卡片群加權動態化、底部 5 大任務視圖全景連動 |
| [`Spec 0140`](file:///d:/APP/股票紀錄/docs/specs/0140-ai-force-decision-dashboard-spec.md) | [`ADR 0140`](file:///d:/APP/股票紀錄/docs/adr/0140-ai-force-decision-dashboard-architecture.md) | [`.scratch/v8.53.0-ai-force-decision-dashboard/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.53.0-ai-force-decision-dashboard/issues/) | Issue #93 | V8.53.0 | 18 張卡片 Bento-Grid 網格、原生向量 SVG 圖表、5 大任務視圖、5 大量化匯出管線 |
| [`Spec 0139`](file:///d:/APP/股票紀錄/docs/specs/0139-unified-full-payoff-and-engine-dry-refactor-spec.md) | [`ADR 0139`](file:///d:/APP/股票紀錄/docs/adr/0139-unified-full-payoff-and-engine-dry-refactor.md) | [`.scratch/v8.52.0-unified-full-payoff-and-dry-engine/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.52.0-unified-full-payoff-and-dry-engine/issues/) | Issue #25 / PR #91 | V8.52.0 | 質押借貸 FULL_PAYOFF 統一委託 applyDebtRepayment 引擎與純函式 DRY 閉環 |
| [`Spec 0150`](file:///d:/APP/股票紀錄/docs/specs/0150-pending-market-close-pre-close-anchor-and-alert-spec.md) | [`ADR 0150`](file:///d:/APP/股票紀錄/docs/adr/0150-pending-market-close-pre-close-anchor-and-alert.md) | [`.scratch/v1.150/issues/`](file:///d:/APP/股票紀錄/.scratch/v1.150/issues/) | Issue #128 / PR #129 | V8.52.0 | 未收盤標的前日收盤數據定錨與雙層警示機制 (台股15:00 / 美股08:00) |
| [`Spec 0138`](file:///d:/APP/股票紀錄/docs/specs/0138-header-realtime-market-clock-and-accurate-dividend-reconciliation-spec.md) | [`ADR 0138`](file:///d:/APP/股票紀錄/docs/adr/0138-header-realtime-market-clock-and-accurate-dividend-reconciliation.md) | [`.scratch/v8.51.0-header-clock-and-dividend-reconciliation/`](file:///d:/APP/股票紀錄/.scratch/v8.51.0-header-clock-and-dividend-reconciliation/) | Issue #87 / PR #88 | V8.51.0 | 頂部 Header 即時盤中時鐘與股利收益對帳精準化 |
| [`Spec 0137`](file:///d:/APP/股票紀錄/docs/specs/0137-dividend-gross-reconciliation-smart-boundary-and-reconciliation-wizard-spec.md) | [`ADR 0137`](file:///d:/APP/股票紀錄/docs/adr/0137-dividend-gross-reconciliation-smart-boundary-and-reconciliation-wizard.md) | [`.scratch/v8.50.0-dividend-gross-reconciliation-and-tooltip-boundary/`](file:///d:/APP/股票紀錄/.scratch/v8.50.0-dividend-gross-reconciliation-and-tooltip-boundary/) | Issue #83 / PR #84, #85 | V8.50.0 | 月度長條圖 Tooltip 邊界避讓、券商 APP 應發毛額對帳雙軌切換、官方發放日對照庫 |
| [`Spec 0136`](file:///d:/APP/股票紀錄/docs/specs/0136-dividend-log-view-pay-date-aggregation-and-contributor-ranking-spec.md) | [`ADR 0136`](file:///d:/APP/股票紀錄/docs/adr/0136-dividend-log-view-pay-date-aggregation-and-contributor-ranking.md) | [`.scratch/v8.49.0-dividend-pay-date-aggregation-and-contributor-ranking/`](file:///d:/APP/股票紀錄/.scratch/v8.49.0-dividend-pay-date-aggregation-and-contributor-ranking/) | Issue #81 / PR #82 | V8.49.0 | 實質入帳日時序 SSOT 對齊、毛淨額對帳、貢獻榜過濾與明細表年度連動 |
| [`Spec 0134`](file:///d:/APP/股票紀錄/docs/specs/0134-full-market-history-backfill-and-reconciliation-pipeline-spec.md) | [`ADR 0134`](file:///d:/APP/股票紀錄/docs/adr/0134-full-market-history-backfill-and-reconciliation-pipeline.md) | [`.scratch/v8.48.0-full-market-history-backfill-and-reconciliation/`](file:///d:/APP/股票紀錄/.scratch/v8.48.0-full-market-history-backfill-and-reconciliation/) | Issue #79 / PR #80 | V8.48.0 | 加權指數 7,158 日歷 SSOT 對齊、四層容錯修復、二分搜尋 33 秒極速回補 |
| [`Spec 0133`](file:///d:/APP/股票紀錄/docs/specs/0133-header-sync-ux-redesign-and-settings-schedule-hub-spec.md) | [`ADR 0133`](file:///d:/APP/股票紀錄/docs/adr/0133-header-sync-ux-redesign-and-settings-schedule-hub.md) | [`.scratch/v8.47.1-header-sync-ux-redesign-and-schedule-hub/`](file:///d:/APP/股票紀錄/.scratch/v8.47.1-header-sync-ux-redesign-and-schedule-hub/) | Issue #77 / PR #78 | V8.47.1 | Header 狀態膠囊極簡毛玻璃收斂與設定中心 Windows 排程管理中樞 |
| [`Spec 0132`](file:///d:/APP/股票紀錄/docs/specs/0132-scheduled-market-sync-and-zero-latency-cache-spec.md) | [`ADR 0132`](file:///d:/APP/股票紀錄/docs/adr/0132-scheduled-market-sync-and-zero-latency-cache.md) | [`.scratch/v8.47.0-scheduled-market-sync-and-zero-latency-cache/`](file:///d:/APP/股票紀錄/.scratch/v8.47.0-scheduled-market-sync-and-zero-latency-cache/) | Issue #75 / PR #76 | V8.47.0 | 每日收盤全市場台美股定時同步、本地快取秒讀與零遺漏稽核 |
| [`Spec 0131`](file:///d:/APP/股票紀錄/docs/specs/0131-stock-analysis-growth-river-and-valuation-audit-spec.md) | [`ADR 0131`](file:///d:/APP/股票紀錄/docs/adr/0131-stock-analysis-growth-river-and-valuation-audit.md) | [`.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/`](file:///d:/APP/股票紀錄/.scratch/v8.46.2-stock-analysis-growth-river-and-valuation/) | Issue #61 / PR #62 | V8.46.2 | 成長率基期擴充、毛利離群視覺封頂、向量河流圖與動態流通股數推導 |

---

## 🧩 4. 關鍵核心引擎與組件清單 (Key Engines & Components)

### 4.1 股息與時序核心模組 (`src/engine/`)

| 模組 | 檔案路徑 | 職責與關鍵演算法 | 測試覆蓋 |
| :--- | :--- | :--- | :--- |
| **股利數據聚合引擎** | [`src/engine/dividendAggregator.ts`](file:///d:/APP/股票紀錄/src/engine/dividendAggregator.ts) | 導出 `getEffectiveDividendPayDate(trade)` 作為時序 SSOT，支援標的官方發放日對照，計算年度應發毛額、實領淨額、扣稅額與 1~12 月月度分佈。 | 9 tests |
| **應收股利與發放日引擎** | [`src/engine/receivableDividendEngine.ts`](file:///d:/APP/股票紀錄/src/engine/receivableDividendEngine.ts) | 內建 `OFFICIAL_TW_PAY_DATE_MAP` 官方常態發放日快取對照庫，`estimatePaymentDate` 依標的與除息日精確比對，推估天數無縫回退。 | 12 tests |
| **量化關鍵指標引擎** | [`src/engine/keyMetricsEngine.ts`](file:///d:/APP/股票紀錄/src/engine/keyMetricsEngine.ts) | 動態流通股數推導（`capitalStock / 10`）、近 4 季 TTM FCF Yield 報酬率、DCF 現金流折現每股內在價值、Piotroski F-Score 九項指標評分。 | 6 tests |
| **指標審計測試套件** | [`src/engine/analysisMetricsAudit.test.ts`](file:///d:/APP/股票紀錄/src/engine/analysisMetricsAudit.test.ts) | 5 大核心金融審計檢驗：基期缺失平整化、毛利暴衝真實性與離群高度維持、動態股數 >70 億股、FCF Yield 合理區間、DCF 25~55 元。 | 9 tests |
| **市場結算狀態與定錨引擎** | [`src/engine/marketSettlementEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marketSettlementEngine.ts) | Asia/Taipei 時區感知純函式，判定台股 15:00 籌碼發布門檻與美股 08:00 結算門檻，未收盤時自適應回退前一收盤交易日定錨日。 | 8 tests |
| **AI 主力戰情室決策報告引擎** | [`src/engine/aiForceDashboardEngine.ts`](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts) | 支援 `basePrice` 與 `realtimeQuote` 動態注入與自適應回退，杜絕 2290 寫死假資料，實現 18 張卡片與即時行情等比動態同步。 | 13 tests |
| **AI 主力動態信號與多空智能仲裁引擎** | [`src/engine/aiForceDashboardEngine.ts`](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts) | 實作多因子加權量化評分純函式（0.35籌碼+0.3趨勢+0.2動能-0.15風險，支援 `CompositeQuantWeights`）、動態燈號映射、多空矛盾智能仲裁演算法（精準識別洗盤破底翻、誘多出貨、共振主升、共振主跌四大實戰型態）。 | 21 tests |
| **智策多維提示詞決策引擎** | [`src/engine/strategicPromptEngine.ts`](file:///d:/APP/股票紀錄/src/engine/strategicPromptEngine.ts) | 實作個股/ETF雙軌特徵壓榨、六頂思考帽決策 Prompt 生成、Token 預算守門 (<1200 / <5500)、語意防護（LAST_20_TRADING_DAYS、TTM 四季滾動）、真脫敏防洩漏與文末外部 AI 回流協議代碼塊指令。 | 17 tests |
| **外部 AI 裁決回流與多智囊團共識引擎** | [`src/engine/strategyPinEngine.ts`](file:///d:/APP/股票紀錄/src/engine/strategyPinEngine.ts)<br>[`src/types/strategyPin.ts`](file:///d:/APP/股票紀錄/src/types/strategyPin.ts) | 支援長篇 Markdown 中正則秒級批次提純標準 JSON、模型名稱語意正規化（去重覆蓋率 100%）、同標的多模型並存與同名覆蓋、向下相容適配器、最高停損優先風控警報（`Math.max(...stopLosses)`）、共識與分歧度量化評級、LocalStorage 持久化與 AI 模型實戰勝率統計。 | 20 tests |
| **統一金融時序日曆與營業日引擎** | [`scripts/market-sync/trading-calendar-engine.cjs`](file:///d:/APP/股票紀錄/scripts/market-sync/trading-calendar-engine.cjs)<br>[`src/engine/holidayCalendar.ts`](file:///d:/APP/股票紀錄/src/engine/holidayCalendar.ts)<br>[`src/engine/marketStatusEngine.ts`](file:///d:/APP/股票紀錄/src/engine/marketStatusEngine.ts) | 接入 `market-holidays.json` SSOT 字典。實作 T+2/T+1 交割日跳轉、融資長假計息天數與金額、台指期/美股四巫結算感知、TDCC 提前至週四、營收 10 號遇假順延、排程零 I/O 守衛與夏令/冬令時區即時時鐘。 | 46 tests |

### 4.2 前端工作台與核心組件 (`src/components/`)

| 類別 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **AI 戰情提示詞與多智囊團釘選中樞** | [`src/components/aiForceDashboard/WarRoomPromptCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/WarRoomPromptCard.tsx) | 一鍵複製戰情提示詞、支援一鍵讀取剪貼簿直接解析與手動輸入抽屜、多模型緊湊條列清單排版（38px/行）、共識防線指標、最嚴格停損優先警報、單卡與全隊獨立結案回報（WIN/LOSS）及外部 AI 智囊團勝率榜抽屜。 | 5 tests |
| **股利收益日誌與現金流** | [`src/components/DividendLogView.tsx`](file:///d:/APP/股票紀錄/src/components/DividendLogView.tsx) | `calculateMonthTooltipAlign` 智慧避讓演算法（1~2月靠左、10~12月靠右、3~9月居中）、KPI 首卡券商對帳毛淨額雙軌切換、明細表標的對帳小計卡片網格與單點過濾。 |
| **個股分析工作台** | [`src/components/analysis/StockAnalysisWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/StockAnalysisWorkspace.tsx) | 整合 6 大核心指標分頁（獲利力、安全性、成長力、現金流、價值評估、公開股利），落實 ETF 物理隔離與【主力戰情室】導流橫幅、自適應響應式佈局。 |
| **法務會計排雷排毒燈** | [`src/components/analysis/ForensicWarningSection.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/ForensicWarningSection.tsx) | 獨立抽離法務會計五大排雷子模組（應收帳款剪刀差、獲利純度、FCF 失血、存貨積壓、負債比率），列表渲染語意唯一穩定 Key，金融業享負債比率豁免。 |
| **智策提示詞生成面板** | [`src/components/analysis/StrategicPromptPanel.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/StrategicPromptPanel.tsx) | 嵌入個股分析工作台，提供六頂思考帽 3x2 Bento 網格與彩色動態發光選取態、Token 儀表板、隱私脫敏開關、一鍵複製與 XML 展開預覽。 |
| **指標圖表與河流圖** | [`src/components/analysis/AnalysisMetricView.tsx`](file:///d:/APP/股票紀錄/src/components/analysis/AnalysisMetricView.tsx) | 向量 SVG 估值河流圖引擎、成長率離群值視覺封頂防禦演算法、全面整合 `industryGate.ts` 產業權威字典判定、景氣循環股 PB 估值指引與零假資料杜邦年化計算。 |
| **AI 主力頂部行情與雙層警示** | [`src/components/aiForceDashboard/HeaderMarketBar.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/HeaderMarketBar.tsx) | 未結算時動態切換「前日收盤價」、出示橘黃警示徽章、定錨基準日標示，並次級輔助顯示盤中即時參考價。 |
| **AI 決策核心卡片** | [`src/components/aiForceDashboard/cards/AiDecisionCoreCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/AiDecisionCoreCard.tsx) | 未結算時頂部出示顯著防禦警示橫幅，明確宣告量化基準日，確保決策透明度。 |
| **主力 K 線卡片 (Card 01)** | [`src/components/aiForceDashboard/cards/KLineChartCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/KLineChartCard.tsx) | 實作 `normalizeAndSortCandles` 升冪排序守護，校正時間軸為左側歷史軌跡、右側最新交易日。 |
| **多維度六角雷達 (Card 03)** | [`src/components/aiForceDashboard/cards/MultiDimensionRadarCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MultiDimensionRadarCard.tsx) | `RADAR_CHART_CONFIG` 有效半徑擴展至 100px，標籤 13px 加粗高對比，數值 12px 高亮，判讀體驗顯著提升。 |
| **AI 主力動態信號判斷 (Card 12)** | [`src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx) | 徹底廢除寫死純紅燈，依量化分連動三色動態呼吸光暈；整合交易所處置/注意、券商融資警戒、法人 VWAP 標準差偏離與個人關鍵價位之 Bento 資訊流。 |
| **健康度綜合評估 (Card 11)** | [`src/components/aiForceDashboard/cards/HealthSummaryCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/HealthSummaryCard.tsx) | `DONUT_GAUGE_CONFIG` 甜甜圈直徑擴大至 78px，間距緊湊無重疊，數值字級 15px，對齊照片 4 飽滿風格。 |
| **主力追蹤總評判 (Card 18)** | [`src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx) | 容器 100% 高度與 Card 16、17 齊平，Bento 佈局重新層次化（狀態 ➔ 核心看板 ➔ 數據膠囊 ➔ 論述）。 |
| **TDCC 集保千張大戶趨勢 (Card 19)** | [`src/components/aiForceDashboard/cards/TdccDistributionCard.tsx`](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/TdccDistributionCard.tsx) | 綁定 `key={symbol}` 生命週期隔離，換股時即刻洗淨待命狀態；美股市場標的展示合規之「美股無集保機制 (採 13F 機構申報)」Honest Empty State。 |

---

## 🛠️ 5. 技術債現況追蹤 (Technical Debts Status)

依據專案規範與 [`docs/debts/README.md`](file:///d:/APP/股票紀錄/docs/debts/README.md)，當前重點如下：

- **待進行評估之架構改善 (Backlog / Open)**：
  - `DEBT-0050`：[個股分析指標視圖 (AnalysisMetricView) 子元件模組化解耦重構](file:///d:/APP/股票紀錄/docs/debts/0050-analysis-metric-view-subcomponent-decomposition.md) (`P3`，已完成排雷燈子模組解耦，持續追蹤四大構面拆解)。
  - `DEBT-0049`：[AI 動態信號判斷卡片 (Card 12) 專業層與決策層子元件模組化解耦重構](file:///d:/APP/股票紀錄/docs/debts/0049-dynamic-signals-card-subcomponent-decomposition.md) (`P3`)。
  - `DEBT-0048`：[個股分析工作區已載入之量化財務報表與本益比深度注入智策提示詞事實清單](file:///d:/APP/股票紀錄/docs/debts/0048-strategic-prompt-workspace-financial-records-injection.md) (`P3`，待下期個股財務深探或即時估值欄位對齊時實作)。
  - `DEBT-0047`：[Pre-push Guard 整合文檔完整性與死鏈自動化守門 (verify-docs)](file:///d:/APP/股票紀錄/docs/debts/0047-pre-push-guard-docs-integrity-linter-integration.md) (`P3`)。
  - `DEBT-0046`：[中央金鑰庫與私有雲全端代理架構](file:///d:/APP/股票紀錄/docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md) (`P2`)。
  - `DEBT-0038`：[提取流通股數推導共用輔助函式 (deriveSharesOutstanding) 消除 DRY 異味](file:///d:/APP/股票紀錄/docs/debts/0038-derive-shares-outstanding-helper-refactor.md) (`P3`)。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支與儲存庫狀態**：
   - 當前位於分支 `main`，與 `origin/main` 保持一致，Working Tree Clean。
   - 所有變更均已透過 GitHub Actions CI 綠燈驗證並 Squash and Merge 回主幹（近期已合併 PR #313, #314, #316）。
2. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 243 個測試檔案、1,810 個測試 100% 綠燈）與 `npm run build`（確認 0 型別錯誤）。
3. **工作流閉環準則**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。

### 建議後續技能 (Suggested Skills for Next Agent)
- `/grill-with-docs`：在承接新需求或架構調整前，進行深度的文檔壓力測試與隱性假設梳理。
- `/tdd & /implement`：新功能實作嚴格遵循測試驅動開發紅-綠-重構循環。
- `/code-review`：每次合併前執行標準與規格雙軸代碼審查。
- `架構感知與防禦性開發 (Defensive Development)`：確保修改 A 不會破壞 B，防止任何資料回溯或破壞性重構。

