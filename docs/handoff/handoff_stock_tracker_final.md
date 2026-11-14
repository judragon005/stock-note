# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Dossier)

> **交接產生時間**：2026-11-14 10:30 (UTC+8)  
> **當前最新里程碑**：
> - **V9.20.0 現金流三態時序統一、股利發放月精準對齊與月度日曆勾稽重構**（ADR 0227, Spec 0227, Issues #516 ~ #521, #527 ~ #534, PRs #522 ~ #526, #528, #530, #532, #534）：
>   - **0056 與核心權值股發放月精準校準 (Issue #517)**：修正 `projectedCashflowEngine.ts` 將 0056 自除息月校準為實質發放月 `[2, 5, 8, 11]`，並校準 `00878` (`[3, 6, 9, 12]`)、`00919`、`00713`、`2330` 與 `00888`，徹底終結「11 月明明有 0056 入帳，圖表與明細卻空白」之混亂。
>   - **解除 8 月單點集中 29 筆之硬編碼暴衝 (Issue #517)**：引入歷史發放月查表優先機制 (`historicalPayoutMonths`) 並具備大小寫不敏感防禦（`.toUpperCase()`）；無歷史記錄之新標的改由 Symbol Hash 確定性平滑分攤至除權息旺季（7~9 月），徹底杜絕 520% 超標的假性高峰。
>   - **現金流三態時序聚合與待入帳應收分佈擴展 (Issue #518)**：月度分佈資料結構擴充 `pendingNetTWD` 與 `pendingCount`，精準收錄未到期之 `receivableDividends`，並保持實領淨額會計原則不失真。
>   - **月度長條圖三態堆疊渲染與 Tooltip 待入帳清單穿透 (Issue #519)**：在已結算月份顯示祖母綠實心柱，當前或未來月份若存在應收款則以金黃色條紋柱 (`#f59e0b` / `stripes-amber`) 分層堆疊；Tooltip 清晰穿透各標的待入帳清單與入帳日。
>   - **歷史明細表明確時序口徑提示與待入帳錨點跳轉 (Issue #520)**：表頭增設清晰口徑橫幅，標示實領流水性質，並提供便捷跳轉至上方待入帳行事曆，避免重複造輪子。
>   - **品質狀態**：全量單元測試 **2,215/2,215 通過 (100% Passed / 289 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，生產打包 `npm run build` 100% 綠燈。
> - **V9.19.0 台美跨市場股利發放日精準時序、ETF 配息組成穿透與被動現金流全景重構**（ADR 0226, Spec 0226, Issues #507 ~ #513, PR #514）：
>   - **現金流預估月曆 3 列 4 欄佈局與視覺層級升級 (Issue #508)**：將 `DividendCalendarCard.tsx` 中間 12 個月份卡片自 1 列擠壓徹底重構為 3 行 × 4 欄 (`repeat(4, minmax(0, 1fr))`) 網格，月份字體 13px、金額 16px 粗體、完整呈現 `NT$ XX,XXX`，枯水期與達標 11px 雙色膠囊標籤，窄螢幕自動回退為 2 欄自適應。
>   - **股息貢獻排行 (1/3) 與月度長條圖 (2/3) 齊高並列解耦 (Issue #509)**：自明細表中物理抽離獨立組件 `DividendTopContributorsCard.tsx`，主控制台建立 `2fr 1fr` 網格佈局達成左右等高對齊，保留 10~12 月 Tooltip 向左智慧避讓演算法，且窄螢幕 (<1024px) 自動折行堆疊。
>   - **長條圖幾何坐標 0 誤差對齊、scaleMax 口徑修復與生活費持久化 (Issue #510)**：統一柱高與生活費線係數為 120px，消除魔術數字並錨定底座 24px 達成 0 像素誤差對齊；GROSS 模式分母動態納入實際毛額最大值杜絕溢出；生活費虛線置於 `zIndex: 0` 背景層，長條柱置於 `zIndex: 1` 前景層；生活費門檻自動儲存至 `localStorage` (`STOCK_TRACKER_DIVIDEND_TARGET_EXPENSE`)。
>   - **0056 官方發放日精準時序對齊與 FinMind 原生欄位映射 (Issue #511)**：官方常態庫補入 `'0056:2026-10-22': '2026-11-11'`，精準顯示 11/11 入帳並亮起綠色 `[官方公告]`；`corporateActionScanner.ts` 正式映射 FinMind 原生 `CashDividendPaymentDate` 欄位，台股除息自動獲得官方入帳日。
>   - **填息判定基準價 Bug 根絕、質押利差連通與 Zavy 活水轉向 (Issue #512)**：徹底修復 `determineDividendFillStatus` 誤用持股成本 `avgCost` 作為除息參考價之深水區 Bug，杜絕假填息；連通 `cashLedgerEngine` 動態計算質押借貸利息支出，激活真實淨利差 (Net Carry Spread) 指標。
>   - **品質狀態**：全量單元測試 **2,202/2,202 通過 (100% Passed / 289 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，生產打包 `npm run build` 100% 綠燈。
> - **V9.18.0 股利日誌與現金流全景：證交所發放日時差對齊、法人級實戰指標打通與極簡模組化重構**（ADR 0225, Spec 0225, Issues #502, #504, PR #505）：
> - **V9.17.1 第三梯隊架構技術債清理與精實收斂**（ADR 0224, Spec 0224, Issue #500）：
>   - **Zavy 慢富工作區龐大單體測試解耦 (技術債 0057)**：將 630+ 行包含 4 個鏡頭的 `ZavyMacroCompassCard.test.tsx` 拆解為 4 個聚焦單一職責之元件測試檔（羅盤卡片、工作區導覽、市場寬度卡片、雙軌決策卡片），消除發散變更與脆弱性。
>   - **股息估算邏輯下沉至純函式模組 (技術債 0057)**：自工作區抽離 inline reduce，實作 `estimateHoldingsAnnualDividendsTwd`，支援 USD/TWD 匯率換算、平倉排除與 4.5% 兜底；新增 `formatCreditRiskLevelLabel` 消除信用風險英文枚舉。
>   - **智策外聯提示詞董監質押率精確注入 (技術債 0048)**：在主力戰情室個股提示詞與 `ValuationMetricsData` 中打通 `directorPledgeRatioPct`，提供多重安全提取與 100% 邊界測試。
>   - **技術債看板閉環**：`docs/debts/README.md` 將 0057 與 0048 狀態更新為 `RESOLVED`。
> - **V9.17.0 Zavy 慢富新手白話導覽、零造輪子 TermTooltip 整合與 12 項漏接欄位全貫通**（ADR 0223, Spec 0223, Issue #494, PR #494 系列）：
>   - **Zavy 慢富白話決策字典 (`zavyGlossary.ts`)**：收錄 18 項核心慢富詞條與信心度詞條，提供 `formatWavePhaseLabel`、`formatTreasuryStatusLabel` 與 `formatTidalRegimeLabel`，徹底消除裸露英文枚舉。
>   - **頂部新手 30 秒慢富導覽**：提供展開/收合三步驟（「看天氣 ➔ 量體溫 ➔ 穿防彈衣」）白話心法橫幅。
>   - **鏡頭一總經羅盤**：掛載 `TermTooltip`、補齊潮汐白話敘事、並列美新訂單-存貨利差與台股營收擴散指數等免費真實替代硬數據、修正台灣小車領先月數顯示。
>   - **鏡頭二市場寬度與去槓桿**：掛載 `TermTooltip`、增設反恐慌定心丸（祖母綠機會色定錨）、十年線鈍化防禦錨點、大盤回撤/融資減幅雙膠囊與落底合格門檻。
>   - **鏡頭三見自己雙軌決策**：提供 5 檔耐受回撤 Pills 連動安全持股上限與超配診斷、質押借款優先還款提醒橫幅、真假防彈衣識別、股息活水轉向明細與 SRR 順序風險破產率降幅實證。
> - **V9.16.0 Zavy「散戶慢富之路」三級週期定位、台美市場結構寬度與 A/B 雙軌配置系統**（ADR 0221, Spec 0221, Issue #472, PR #473, #475）：
>   - **頂層專屬工作區（`🐢 慢富週期與配置`）**：在導航列新增 `key: 'zavy'`，提供 HUD 大局觀定錨橫幅與三層分段鏡頭（總經週期大局觀、市場位階與風險傳導、見自己 A/B 雙軌配置與慢富退休）。
>   - **SQLite 湖倉 `<25ms` 叢集索引多週期還原寬度與宏觀持久化修復**：實作 `getMarketMultiHorizonBreadth`，一次算完台美 `20/60/200MA` 還原寬度與近 60 日融資去槓桿比率；冪等補齊 `macro_sentiment_daily` 9 個宏觀欄位（FRED 利差、`T10YIE`、失業金）。
>   - **大類資產分類器與 `etf_daily_nav` 折溢價守門員**：擴充 `'ASSET_CLASS'` 配置型別，實作 `classifyZavyAssetClass`（長/中/短純公債 vs 投資級公司債 vs 黃金 vs REITs vs 剔除池）；折溢價 `>1.0%` 攔截防買貴。
>   - **大類資產再平衡、股息活水轉向與質押降槓桿**：支援「高股息存量不動、增量股息活水轉向（Dividend-Redirect）」；榮景期優先償還股票質押借款（`LoanRecord`），防範維持率斷頭中斷風險。
>   - **慢富 30 倍年支出、Coast-FIRE 與雙軌順序風險**：實作 30x 本金（3.33% SWR）、Coast-FIRE 今日門檻，修復 FIRE 頁面 50,000 元硬編碼。
> - **V9.15.0 戰情室風控指標抽取與估值河流二元搜尋優化**（ADR 0220, Spec 0220, Issue #466, PR #467）：
>   - **估值河流圖二元搜尋優化 (技術債 0056)**：在 `src/utils/binarySearch.ts` 實作純函式二元搜尋 `findLatestCloseBeforeDate`，將歷史季度收盤價匹配時間複雜度降為 $O(M \log N)$，消滅 GC 記憶體分配浪費。
>   - **主力戰情室龐大單體風控計算解耦 (技術債 0055)**：建立 `src/hooks/useWarRoomPortfolioMetrics.ts`，自 `WarRoomWorkspace.tsx` 移出 110+ 行非視圖之維持率、可用防禦資金、槓桿曝險與集中度穿透指標，補齊無 DOM 單元測試。
>   - **技術債看板全面閉環**：`docs/debts/README.md` 將 0055 與 0056 狀態更新為 `RESOLVED`。
> - **V9.14.0 台美股機構級深度財報研究與實戰投資決策系統**（ADR 0219, Spec 0219, Issue #449, PR #461, #463）：
> - **V9.04.0 資產成長全歷史管線修復、券商隔離與量化複利指標**（ADR 0207, Spec 0207, Issue #340）：
>   - **App 頂層管線縫隙貫通**：在 `App.tsx` 注入 `receivableDividends` 平滑除息假摔，注入 `selectedAccountId` 篩選單一券商持股，並導出 `growthScopedCash` 隔離現金流，徹底解決多券商混雜金流與除息空窗期假凹洞。
>   - **動態無風險利率接軌**：將硬編碼 `1.5%` 替換為 `resolveDynamicRiskFreeRate(null, baseCurrency)`，USD 計價使用 4.5%、TWD 計價使用 1.8%，消滅美股夏普率與索提諾率系統性虛高。
>   - **長期複利 CAGR 指標增設**：在 `calculatePerformanceMetrics` 實作年化複合成長率（CAGR %），並於頂部「全期累計總損益」卡片清晰呈現標籤，為長年投資者提供超越市場長期均值的量化複利錨點。
>   - **大盤日 K 本機湖倉非同步水合**：建立非同步管線，切換大盤基準時自本機 SQLite 湖倉 `/api/market/history/` 載入真實日 K 數據並自動重繪，告別靜態備份常數。
>   - **實戰出入金跳空打點與歷史最長水下天數**：在 Hover Crosshair 與累計本金卡片中動態呈現「💵 入金: +金額」與「💸 出金: -金額」標籤；水下回撤面板計算並呈現「最長水下: N 天」歷史極端套牢週期防禦指標。
> - **V9.03.0 資產成長與單位淨值會計及量化風控引擎重構**（ADR 0206, Spec 0206, Issue #338）：
>   - **GIPS 單位淨值狀態機 (Unit NAV / TWR)**：起點 100.00，外部大額出入金等比增減總份額，淨值連續不跳水，徹底消滅資金進出對投資實力的假性稀釋與膨脹。
>   - **除息空窗應收股利平滑機制 (Receivable Dividends)**：在除息基準日與發放日之間以權責發生制認列應收資產加計至當日總淨值，發放日自動沖銷，撫平除權息假凹洞。
>   - **融資賣出利息扣除與全歷史水下回撤數列 (Drawdown Series)**：平倉時 FIFO 逐筆扣除融資利息；逐日追蹤歷史最高淨值 (Peak ATH)，推演 `underwaterDrawdownPercent` 數列。
>   - **真大盤數據直連本機 SQLite 湖倉 API**：清除 2025/2026 年捏造的 SPY 偽常數，直連 `/api/market/history/:symbol?limit=all` 並具備記憶體快取；依計價幣別 (USD 4.5%, TWD 1.8%) 與外部 FRED 動態注入無風險利率 ($R_f$)。
>   - **時間除數校準 (`days/365.25`) 與索提諾比率 (Sortino Ratio)**：時間除數統一校準為 365.25 日曆天；量化風控看板新增「🛡️ 索提諾比率 (Sortino)」卡片並具備多階層智能診斷（>2 🌟 極致抗跌、1~2 🟢 防禦良好、<1 🟡 防禦偏弱、<0 🔴 下行脆弱）。
>   - **資產走勢 AUM 金額與 Unit NAV % 雙模切換視圖**：提供膠囊切換按鈕，Unit NAV 模式下資產與大盤起點歸一化為 100%，Y 軸切換為百分比刻度（如 `+15.2%`）。
>   - **SVG 畫布穿倉負淨值防禦與破產警戒紅線 (Y = 0)**：移除負淨值截斷，當遭遇融資穿倉淨值跌破 0 時繪製紅色虛線基準線，座標計算防禦 NaN 崩潰。
>   - **原生向量 SVG 實戰水下回撤圖與落水修復天數指標**：面板支援展開/收合、向下面積陰影、0.0% 基準線，即時統計當前水下深度與落水天數，並與上方主圖指針連動。
>   - **操作管線閉環（透視金流移位、帳戶篩選器、一鍵隱私遮罩）**：將「透視金流」移至「累計投入本金」卡片並連動週期；打通券商篩選器 (`selectedAccountId`)；頂部新增 `[ 👁️ 隱私遮罩 ]`，一鍵遮蔽全頁敏感金額（`NT$******`）且保留報酬率百分比。
> - **V9.02.0 第一梯隊高性價比架構技術債清理與精實重構**（ADR 0205, Spec 0205, Issue #336）：
>   - **Pre-push Guard 整合文檔完整性守門 (技術債 0047)**：在 `scripts/pre-push-guard.cjs` 插入 `node scripts/verify-docs.cjs`，強制本地推送前 100% 阻斷死鏈與 Spec/ADR 脫鉤。
>   - **defaultFetchJson 雙重信號複合支援 (技術債 0052)**：在 `backfill-tw-history-web.cjs` 與 `sync-tw-market.cjs` 引入 `AbortSignal.any` 複合取消與逾時信號，具備三元降級兜底，徹底消除連線掛起風險。
>   - **戰情室快速校準 Modal 抽取與狀態自治 (技術債 0054)**：將分散之 8 個 State 泥團封裝至獨立元件 `MacroQuickCalibrationModal.tsx`，表單自治管理，父層零無效重繪，`WarRoomWorkspace.tsx` 精簡約 250 行。
>   - **財務三表樣式常數與純展示儲存格抽取 (技術債 0053)**：於 `EightQuarterStatementTable.tsx` 抽取 `STATEMENT_TABLE_STYLES` 與 `<StatementDataCell />`，消滅重複內聯宣告。
>   - **技術債看板閉環**：`docs/debts/README.md` 將 0047, 0052, 0053, 0054 標記為 `RESOLVED`。
> - **品質狀態**：全量單元測試 **2,141/2,141 通過 (100% Passed / 278 個測試套件)**，TypeScript Strict 0 錯誤 0 警告，生產打包 `npm run build` 100% 綠燈。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案本機路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon005/stock-note.git`
- **當前工作分支**：`main` (已完全同步主幹，Working Tree Clean)
- **單元測試套件**：**2,215/2,215 通過 (289 test suites / 100% 綠燈)**
- **型別檢查**：TypeScript Strict Mode **0 Errors / 0 Warnings**
- **生產環境構建**：`npm run build` 打包順利通過，0 錯誤
- **當前釋出版本**：**V9.20.0**
- **工作區與分支整潔度**：工作區乾淨受控，本地 feature/fix 分支已完全合併並清理。
- **資安與隱私防護**：本機所有個人交易、質押數據、財務隱私與 API Tokens 均受 Web Crypto 原生 AES-GCM 加密保護，搭配 LocalStorage / IndexedDB 本地隔離與 `.gitignore` 保護，絕不推播至遠端。

---

## 🧭 2. 接棒 Agent 推薦技能清單 (Suggested Skills for Next Agent)

依據專案規範與 `.agents/skills/README.md` 規定，接手本專案的下一任 Agent 應優先調用以下技能以確保工程質量：

1. **`專業單元測試 (Unit Test Master)`**：
   - 適用時機：開發任何新功能、修復 Bug 或重構前。
   - 核心準則：強制遵循 TDD 紅-綠-重構循環，堅持公開介面測試縫隙 (Test Seams)，禁止編寫脆性內部測試。
2. **`架構感知與防禦性開發 (Defensive Development)`**：
   - 適用時機：修改任何共用引擎（如 `aiForceDashboardEngine.ts`、`historicalNav.ts`、`quantMetrics.ts`、`benchmarkData.ts`、`cryptoEngine.ts`、`secureProxyRouter.ts`）前。
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
| [`Spec 0227`](file:///d:/APP/股票紀錄/docs/specs/0227-dividend-cashflow-tri-state-reconciliation-and-calendar-precision-spec.md) | [`ADR 0227`](file:///d:/APP/股票紀錄/docs/adr/0227-dividend-cashflow-tri-state-reconciliation.md) | [`.scratch/v9.20.0-dividend-cashflow-tri-state-reconciliation/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.20.0-dividend-cashflow-tri-state-reconciliation/issues/) | Issue #516 ~ #521, #533 / PR #522 ~ #526, #534 | V9.20.0 | 現金流三態時序統一、0056發放月修正、8月硬編碼暴衝解除、長條圖待入帳堆疊與Tooltip清單穿透 |
| [`Spec 0226`](file:///d:/APP/股票紀錄/docs/specs/0226-cross-market-dividend-cashflow-and-composition-spec.md) | [`ADR 0226`](file:///d:/APP/股票紀錄/docs/adr/0226-cross-market-dividend-cashflow-and-composition.md) | [`.scratch/v9.19.0-cross-market-dividend-cashflow-and-composition/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.19.0-cross-market-dividend-cashflow-and-composition/issues/) | Issue #507 ~ #513 / PR #514 | V9.19.0 | 台美跨市場股利發放日精準時序、ETF 配息組成穿透與被動現金流全景重構 |
| [`Spec 0225`](file:///d:/APP/股票紀錄/docs/specs/0225-dividend-and-cashflow-holistic-refactor-and-timing-alignment-spec.md) | [`ADR 0225`](file:///d:/APP/股票紀錄/docs/adr/0225-dividend-and-cashflow-holistic-refactor.md) | [`.scratch/v9.18.0-dividend-cashflow-timing-and-modular-refactor/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.18.0-dividend-cashflow-timing-and-modular-refactor/issues/) | Issue #502, #504 / PR #503, #505 | V9.18.0 | 股利日誌與現金流全景：證交所發放日時差對齊、法人級實戰指標打通與極簡模組化重構 |
| [`Spec 0224`](file:///d:/APP/股票紀錄/docs/specs/0224-technical-debts-0057-0048-resolution-spec.md) | [`ADR 0224`](file:///d:/APP/股票紀錄/docs/adr/0224-technical-debts-0057-0048-resolution.md) | [`.scratch/v9.17.1-tech-debt-0057-0048-resolution/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.17.1-tech-debt-0057-0048-resolution/issues/) | Issue #500 | V9.17.1 | Zavy 慢富工作區測試解耦、股息估算下沉純函式與智策提示詞董監質押技術債閉環 (技術債 0057 & 0048) |
| [`Spec 0223`](file:///d:/APP/股票紀錄/docs/specs/0223-zavy-slow-wealth-onboarding-termtooltip-and-full-pipeline-alignment-spec.md) | [`ADR 0223`](file:///d:/APP/股票紀錄/docs/adr/0223-zavy-slow-wealth-onboarding-termtooltip-and-full-pipeline-alignment.md) | [`.scratch/v9.17.0-zavy-onboarding-termtooltip/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.17.0-zavy-onboarding-termtooltip/issues/) | Issue #494 / PR #495, #497 | V9.17.0 | Zavy 慢富新手白話導覽、零造輪子 TermTooltip 整合與 12 項漏接欄位全貫通 |
| [`Spec 0221`](file:///d:/APP/股票紀錄/docs/specs/0221-zavy-slow-wealth-cycle-market-breadth-and-dual-track-allocation-system-spec.md) | [`ADR 0221`](file:///d:/APP/股票紀錄/docs/adr/0221-zavy-slow-wealth-cycle-market-breadth-and-dual-track-allocation-system.md) | [`.scratch/v9.16.0-zavy-slow-wealth-cycle-breadth-and-dual-track/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.16.0-zavy-slow-wealth-cycle-breadth-and-dual-track/issues/) | Issue #472 / PR #473, #475 | V9.16.0 | Zavy「散戶慢富之路」三級週期定位、台美市場結構寬度與 A/B 雙軌配置系統 |
| [`Spec 0220`](file:///d:/APP/股票紀錄/docs/specs/0220-technical-debts-0055-0056-resolution-spec.md) | [`ADR 0220`](file:///d:/APP/股票紀錄/docs/adr/0220-technical-debts-0055-0056-resolution.md) | [`.scratch/v9.15.0-tech-debt-batch-2-warroom-metrics-and-binary-search/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.15.0-tech-debt-batch-2-warroom-metrics-and-binary-search/issues/) | Issue #466 / PR #467, #469 | V9.15.0 | 第二梯隊架構技術債清理 (0055 戰情室風控狀態抽取 Hook 與 0056 估值河流二元搜尋) |
| [`Spec 0219`](file:///d:/APP/股票紀錄/docs/specs/0219-institutional-equity-research-and-decision-system-spec.md) | [`ADR 0219`](file:///d:/APP/股票紀錄/docs/adr/0219-institutional-equity-research-and-decision-system.md) | [`.scratch/v9.14.0-institutional-equity-research/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.14.0-institutional-equity-research/issues/) | Issue #449 / PR #461, #463, #465 | V9.14.0 | 台美股機構級深度財報研究與實戰投資決策系統 (5 大數據孤島貫通、20 季財報縱深、反向 DCF) |
| [`Spec 0218`](file:///d:/APP/股票紀錄/docs/specs/0218-smart-money-star-map-full-chain-temporal-anchoring-spec.md) | [`ADR 0218`](file:///d:/APP/股票紀錄/docs/adr/0218-smart-money-star-map-full-chain-temporal-anchoring.md) | [`.scratch/v9.13.0-smart-money-temporal-anchoring/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.13.0-smart-money-temporal-anchoring/issues/) | Issue #433 / PR #444, #448 | V9.13.0 | 籌碼與動態星圖全鏈路時空定錨、產業輪動、實戰訊號與零假資料精實重構 |
| [`Spec 0217`](file:///d:/APP/股票紀錄/docs/specs/0217-smart-money-star-map-lakehouse-and-physics-calibration-spec.md) | [`ADR 0217`](file:///d:/APP/股票紀錄/docs/adr/0217-smart-money-star-map-lakehouse-and-physics-calibration.md) | [`.scratch/v9.12.0-chips-star-map-lakehouse/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.12.0-chips-star-map-lakehouse/issues/) | Issue #418 / PR #427, #429 | V9.12.0 | 籌碼與動態星圖湖倉直連、物理引擎校準、ETF 造市隔離與實戰閉環升級 |
| [`Spec 0216`](file:///d:/APP/股票紀錄/docs/specs/0216-muscle-booker-quant-defense-and-segmented-lens-architecture-spec.md) | [`ADR 0216`](file:///d:/APP/股票紀錄/docs/adr/0216-muscle-booker-quant-defense-and-segmented-lens.md) | [`.scratch/v9.11.0-muscle-booker-quant-defense-and-segmented-lens/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.11.0-muscle-booker-quant-defense-and-segmented-lens/issues/) | Issue #397 / PR #398 | V9.11.0 | 肌肉書僮動能雷達量化防禦核升級、既有引擎零造輪子串聯與分段視圖收斂 |
| [`Spec 0215`](file:///d:/APP/股票紀錄/docs/specs/0215-quadrant-card-apple-design-and-market-pools-evolution-spec.md) | [`ADR 0215`](file:///d:/APP/股票紀錄/docs/adr/0215-quadrant-card-apple-design-and-market-pools-evolution.md) | [`.scratch/v9.10.0-quadrant-card-apple-design-and-market-pools/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.10.0-quadrant-card-apple-design-and-market-pools/issues/) | Issue #395 / PR #396 | V9.10.0 | 四大象限動能卡片蘋果系統美學重構、全量台股與美股四大市場選池進化 |
| [`Spec 0214`](file:///d:/APP/股票紀錄/docs/specs/0214-muscle-booker-momentum-radar-full-spectrum-evolution-spec.md) | [`ADR 0214`](file:///d:/APP/股票紀錄/docs/adr/0214-muscle-booker-momentum-radar-evolution.md) | [`.scratch/v9.09.0-muscle-booker-momentum-radar-evolution/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.09.0-muscle-booker-momentum-radar-evolution/issues/) | Issue #387 / PR #388 | V9.09.0 | 肌肉書僮·動能雷達全量進化、量化風控防禦與無重複模組化重構 |
| [`Spec 0213`](file:///d:/APP/股票紀錄/docs/specs/0213-macro-war-room-thermometer-signals-and-dual-momentum-spec.md) | [`ADR 0213`](file:///d:/APP/股票紀錄/docs/adr/0213-macro-war-room-thermometer-signals-and-dual-momentum.md) | [`.scratch/v9.08.0-war-room-thermometer-signals-and-momentum/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.08.0-war-room-thermometer-signals-and-momentum/issues/) | Issue #367 / PR #368 | V9.08.0 | 宏觀戰情室雙水溫計排版對齊防折行、持股訊號分頁膠囊狀態機與雙重動能湖倉數據審計 |
| [`Spec 0212`](file:///d:/APP/股票紀錄/docs/specs/0212-card18-trading-desk-layout-and-risk-management-spec.md) | [`ADR 0212`](file:///d:/APP/股票紀錄/docs/adr/0212-card18-trading-desk-layout-and-risk-management.md) | [`.scratch/v9.07.0-ai-force-card18-full-deck-and-layer7-matrix/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.07.0-ai-force-card18-full-deck-and-layer7-matrix/issues/) | Issue #366 / PR #368 | V9.07.0 | Card 18 主力追蹤總評判三欄式司令台佈局、金融大字號點位與法人部位風控升級 |
| [`Spec 0211`](file:///d:/APP/股票紀錄/docs/specs/0211-ai-force-dashboard-verdict-full-width-and-layer7-dual-matrix-spec.md) | [`ADR 0211`](file:///d:/APP/股票紀錄/docs/adr/0211-ai-force-dashboard-verdict-full-width-and-layer7-dual-matrix.md) | [`.scratch/v9.07.0-ai-force-card18-full-deck-and-layer7-matrix/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.07.0-ai-force-card18-full-deck-and-layer7-matrix/issues/) | Issue #365 / PR #363 | V9.07.0 | 主力戰情室 Layer 7 作戰決策雙欄對稱重組與 Card 18 終極作戰指引全寬佈局 |
| [`Spec 0210`](file:///d:/APP/股票紀錄/docs/specs/0210-financial-data-gateway-self-healing-and-workspace-guard-spec.md) | [`ADR 0210`](file:///d:/APP/股票紀錄/docs/adr/0210-financial-data-gateway-self-healing-and-workspace-guard.md) | [`.scratch/v9.06.1-financial-gateway-guard/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.06.1-financial-gateway-guard/issues/) | Issue #362 / PR #363 | V9.06.1 | 金融數據網關入境淨化、快取自愈與工作區安全氣囊防禦 |
| [`Spec 0209`](file:///d:/APP/股票紀錄/docs/specs/0209-macro-war-room-3-cross-market-transmission-and-api-key-pipeline-spec.md) | [`ADR 0209`](file:///d:/APP/股票紀錄/docs/adr/0209-macro-war-room-3-cross-market-transmission-and-api-key-pipeline.md) | [`.scratch/v9.06.0-macro-war-room-3/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.06.0-macro-war-room-3/issues/) | Issue #359 / PR #361 | V9.06.0 | 宏觀戰情室 3.0 — 台美費半跨市傳導鏈、總經波段雙溫度計、已配置 API 金鑰池全自動接線 |
| [`Spec 0208`](file:///d:/APP/股票紀錄/docs/specs/0208-portfolio-inventory-institutional-audit-and-pipeline-alignment-spec.md) | [`ADR 0208`](file:///d:/APP/股票紀錄/docs/adr/0208-portfolio-inventory-institutional-audit-and-pipeline-alignment.md) | [`.scratch/v9.05.0-portfolio-inventory-institutional-upgrade/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.05.0-portfolio-inventory-institutional-upgrade/issues/) | Issue #342 / PR #343 | V9.05.0 | 投資組合與庫存法人級會計修復、跨帳戶隔離、斷頭管線貫通與風控歸因升級 |
| [`Spec 0207`](file:///d:/APP/股票紀錄/docs/specs/0207-portfolio-nav-pipeline-repair-and-cagr-alignment-spec.md) | [`ADR 0207`](file:///d:/APP/股票紀錄/docs/adr/0207-portfolio-nav-pipeline-repair-and-cagr-alignment.md) | [`.scratch/v9.04.0-portfolio-nav-pipeline-repair-and-cagr-alignment/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.04.0-portfolio-nav-pipeline-repair-and-cagr-alignment/issues/) | Issue #340 / PR #341 | V9.04.0 | 資產成長全歷史管線修復、券商隔離與量化複利指標規格 (CAGR、動態 Rf、真實出入金打點) |
| [`Spec 0206`](file:///d:/APP/股票紀錄/docs/specs/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine-spec.md) | [`ADR 0206`](file:///d:/APP/股票紀錄/docs/adr/0206-portfolio-nav-unitized-accounting-and-quant-risk-engine.md) | [`.scratch/v9.03.0-portfolio-nav-unitized-accounting-and-quant-risk-engine/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.03.0-portfolio-nav-unitized-accounting-and-quant-risk-engine/issues/) | Issue #338 / PR #339 | V9.03.0 | 資產成長與單位淨值會計及量化風控引擎重構 (11 大 Micro-Tickets 閉環) |
| [`Spec 0205`](file:///d:/APP/股票紀錄/docs/specs/0205-tech-debts-guardrails-and-lean-refactor-spec.md) | [`ADR 0205`](file:///d:/APP/股票紀錄/docs/adr/0205-tech-debts-guardrails-and-lean-refactor.md) | [`.scratch/v9.02.0-tech-debts-guardrails-and-lean-refactor/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.02.0-tech-debts-guardrails-and-lean-refactor/issues/) | Issue #336 / PR #337 | V9.02.0 | 第一梯隊高性價比架構技術債清理與精實重構 (4 大 Micro-Tickets 閉環) |
| [`Spec 0204`](file:///d:/APP/股票紀錄/docs/specs/0204-war-room-morning-brief-data-seal-and-lean-alignment.md) | [`ADR 0204`](file:///d:/APP/股票紀錄/docs/adr/0204-war-room-morning-brief-data-seal-and-lean-alignment.md) | [`.scratch/v9.01.0-war-room-morning-brief-data-seal-and-lean-alignment/issues/`](file:///d:/APP/股票紀錄/.scratch/v9.01.0-war-room-morning-brief-data-seal-and-lean-alignment/issues/) | Issue #332 / PR #333, #334 | V9.01.0 | 戰情室宏觀晨會數據認證戳記、獨立防守價修復、隱私脫敏與實戰極簡對齊 (8 大 Micro-Tickets 閉環) |
| [`Spec 0203`](file:///d:/APP/股票紀錄/docs/specs/0203-lakehouse-bootstrap-api-probe-proxy-and-tiingo-backup-spec.md) | [`ADR 0203`](file:///d:/APP/股票紀錄/docs/adr/0203-lakehouse-bootstrap-api-probe-proxy-and-tiingo-backup.md) | [`.scratch/v8.116.0-lakehouse-bootstrap-api-probe-proxy-and-tiingo-backup/`](file:///d:/APP/股票紀錄/.scratch/v8.116.0-lakehouse-bootstrap-api-probe-proxy-and-tiingo-backup/) | Issue #329 / PR #330 | V8.116.0 | 數據湖倉全量補足、API 金鑰測活代理中繼與 Tiingo 備援整合 (切片 01~13 閉環) |
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
| [`Spec 0150`](file:///d:/APP/股票紀錄/docs/specs/0150-pending-market-close-pre-close-anchor-and-alert-spec.md) | [`ADR 0150`](file:///d:/APP/股票紀錄/docs/adr/0150-pending-market-close-pre-close-anchor-and-alert.md) | [`.scratch/v8.68.0-pending-market-close-pre-close-anchor-and-alert/issues/`](file:///d:/APP/股票紀錄/.scratch/v8.68.0-pending-market-close-pre-close-anchor-and-alert/issues/) | Issue #128 / PR #129 | V8.52.0 | 未收盤標的前日收盤數據定錨與雙層警示機制 (台股15:00 / 美股08:00) |
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

- **待進行評估之架構改善 (Backlog / Open: 5 項)**：
  - `DEBT-0046`：[中央金鑰庫與私有雲全端代理架構 (跨裝置同步與安全邊界防禦)](file:///d:/APP/股票紀錄/docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md) (`P2`)。
  - `DEBT-0048`：[個股分析工作區已載入之量化財務報表與本益比深度注入智策提示詞事實清單](file:///d:/APP/股票紀錄/docs/debts/0048-strategic-prompt-workspace-financial-records-injection.md) (`P3`，待下期個股財務深探或即時估值欄位對齊時實作)。
  - `DEBT-0049`：[AI 動態信號判斷卡片 (Card 12) 專業層與決策層子元件模組化解耦重構](file:///d:/APP/股票紀錄/docs/debts/0049-dynamic-signals-card-subcomponent-decomposition.md) (`P3`，待未來自訂多因子權重偏好演進時實作)。
  - `DEBT-0050`：[個股分析指標視圖 (AnalysisMetricView) 子元件模組化解耦重構](file:///d:/APP/股票紀錄/docs/debts/0050-analysis-metric-view-subcomponent-decomposition.md) (`P3`，已完成排雷燈子模組解耦，持續追蹤四大構面拆解)。
  - `DEBT-0051`：[未來現金流投影慣性配息庫動態學習與跨市場擴展](file:///d:/APP/股票紀錄/docs/debts/0051-projected-cashflow-dynamic-calendar-profile-learning.md) (`P3`，待下期跨市場現金流或自動化公司行動整合時實作)。

- **近期已完整解決之架構技術債 (Recently Resolved: 6 項)**：
  - `DEBT-0056`：[估值河流圖歷史收盤價匹配二元搜尋優化](file:///d:/APP/股票紀錄/docs/debts/0056-valuation-river-candle-lookup-binary-search.md) (`RESOLVED`，已於 v9.15.0 Spec 0220 / ADR 0220 解決)。
  - `DEBT-0055`：[主力戰情室龐大單體風控計算解耦 (useWarRoomPortfolioMetrics)](file:///d:/APP/股票紀錄/docs/debts/0055-warroom-divergent-change-metrics-hook.md) (`RESOLVED`，已於 v9.15.0 Spec 0220 / ADR 0220 解決)。
  - `DEBT-0054`：[WarRoomWorkspace 快速校準表單聚合與子元件解耦](file:///d:/APP/股票紀錄/docs/debts/0054-war-room-quick-calibration-modal-decomposition.md) (`RESOLVED`，已於 v9.02.0 Spec 0205 解決)。
  - `DEBT-0053`：[EightQuarterStatementTable 樣式常數與子儲存格抽取](file:///d:/APP/股票紀錄/docs/debts/0053-eight-quarter-statement-table-style-constants-extraction.md) (`RESOLVED`，已於 v9.02.0 Spec 0205 解決)。
  - `DEBT-0052`：[defaultFetchJson 雙重信號複合支援 (Compound AbortSignal)](file:///d:/APP/股票紀錄/docs/debts/0052-default-fetch-json-compound-abort-signal.md) (`RESOLVED`，已於 v9.02.0 Spec 0205 解決)。
  - `DEBT-0047`：[Pre-push Guard 整合文檔完整性與死鏈自動化守門 (verify-docs)](file:///d:/APP/股票紀錄/docs/debts/0047-pre-push-guard-docs-integrity-linter-integration.md) (`RESOLVED`，已於 v9.02.0 Spec 0205 解決)。

---

## 🚀 6. 接棒 Agent 後續行動指引 (Next Session Directives)

若新會話接手本專案，請依序執行以下標準作業：

1. **確認當前工作分支與儲存庫狀態**：
   - 當前位於分支 `main`，與 `origin/main` 保持一致，Working Tree Clean。
   - 所有變更均已透過 GitHub Actions CI 綠燈驗證並 Squash and Merge 回主幹（近期已合併 PR #461, #463, #465, #467, #469）。
2. **日常驗證防線**：
   - 接手前務必執行 `npm test`（確認 277 個測試套件、2,111 個測試 100% 綠燈）與 `npm run build`（確認 0 型別錯誤）。
3. **工作流閉環準則**：
   - 嚴格遵循工作流藍圖：`/grill-with-docs` ➔ `/to-spec` ➔ `/to-tickets` ➔ `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `/handoff`。

### 建議後續技能 (Suggested Skills for Next Agent)
- `/grill-with-docs`：在承接新需求或架構調整前，進行深度的文檔壓力測試與隱性假設梳理。
- `/tdd & /implement`：新功能實作嚴格遵循測試驅動開發紅-綠-重構循環。
- `/code-review`：每次合併前執行標準與規格雙軸代碼審查。
- `架構感知與防禦性開發 (Defensive Development)`：確保修改 A 不會破壞 B，防止任何資料回溯或破壞性重構。

