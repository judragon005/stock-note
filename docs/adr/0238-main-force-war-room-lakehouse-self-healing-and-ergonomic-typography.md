# ADR 0238: 主力戰情室 4.1 — 湖倉欄位級完好度自癒、ETF 資產多型與零微字人體工學規範

- **狀態 (Status)**: Accepted (2026-11-18)
- **關聯規格 (Spec)**: [Spec 0238](file:///d:/APP/股票紀錄/docs/specs/0238-main-force-war-room-lakehouse-self-healing-etf-polymorphism-and-ergonomic-typography-spec.md)
- **關聯議題 (Issue)**: #590

## 1. 背景與決策脈絡 (Context)

主力戰情室在 Spec 0237 拔除合成假數據後，實測 `0050 元大台灣50` 等主流 ETF 與近期盤後湖倉仍出現三類系統性問題：
1. 外部市場資料分批公布（15:00 日 K、15:30 三大法人、16:30+ 資券/借券/當沖/估值/ETF 淨值），但新鮮度探針與歷史回補僅檢查日 K 與法人筆數，導致「半殘交易日」被永久標記為最新並鎖死。
2. 證交所 `all_etf.txt` 依投信/類別分為 `a1[0..N]` 多組，解析器硬編碼只讀 `a1[0]` 漏接 98% ETF；同時 ETF 不存在於 `BWIBBU_d` 本益比表，且 `TWT48U` 僅含未來預告，導致 Card 20 與 Card 21 對 `0050` 顯示空白或 `--`。
3. 28 個戰情室元件累積 272 處 `< 12px` 微字級、63 處低對比 `#64748b` 文字，疊加 SVG `preserveAspectRatio="none"` 橫向拉伸與 Layer 6 四欄窄網格擠壓，嚴重損害閱讀體驗。

## 2. 架構決策 (Decisions)

1. **7 維欄位級湖倉完好度探針 (`Column-Level Lakehouse Completeness`)**：
   - `checkMarketFreshness` 查核近 5 個已結算台股交易日之日 K、法人、`margin_balance`、`sbl_balance`、`day_trade_rate`、`tw_valuation_daily` 與最新日 `etf_daily_nav`，將缺漏日期列入 `incompleteDates` 並驅動背景精準補抓。
2. **全分組 ETF 解析與按需歷史序列補齊 (`Asset-Aware Card Polymorphism`)**：
   - 遍歷 `rawData.a1[0..N]` 全數 ETF 淨值入庫；當單一標的 TDCC `< 4` 週、月營收 `< 6` 月或缺乏歷史除權息時，於 `GET /api/market/history/:symbol` 執行帶逾時保護與防重入鎖的按需回補；Card 20/21 以近一年現金配息反推殖利率，並結合主流 ETF 規模與費用率基準，徹底解除 `0050` 假空狀態。
3. **零微字人體工學與 Layer 6 雙欄舒展 (`Ergonomic Typography Floor`)**：
   - 全戰情室強制執行 `>= 12px (0.75rem)` 字級硬底線與 WCAG AA `#94a3b8+` 次要文字對比色；移除含 `<text>` SVG 之 `preserveAspectRatio="none"`；將 Layer 6 從 4 欄擴展為 `minmax(440px, 1fr)` 雙欄矩陣，並以自動化 AST/Regex 守門員測試鎖死回歸防線。

## 3. 後果與權衡 (Consequences)

- **正向效益**：`etf_daily_nav` 覆蓋率從 4 檔提升至 365 檔（含 `0050`）；半殘日可自動偵測自癒；全戰情室 272 處微字與 63 處暗灰字清零，桌機閱讀零摩擦。
- **權衡與約束**：按需歷史序列補齊受限於外部 API（FinMind / Yahoo）速率，實作以 `<= 2500ms` 逾時與單標的防重入鎖確保不阻塞前端主畫面渲染。
