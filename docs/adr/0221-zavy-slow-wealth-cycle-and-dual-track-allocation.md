# 0221 ADR: Zavy「散戶慢富之路」三級週期定位、台美市場結構寬度與 A/B 雙軌配置系統架構

## 狀態 (Status)
`ACCEPTED` (2026-11-10)

## 背景 (Context)
在專案演進至 v9.15.0 (Spec 0220) 後，系統已具備 SQLite 本地湖倉（2,360+ 檔台股日 K 與融資庫、1,448 檔美股日 K、ETF 每日官方淨值折溢價表 `etf_daily_nav`）、FRED / Yahoo 跨資產脈搏管線（`ingest-macro-sentiment.cjs`）、目標配置再平衡引擎（`rebalancingEngine.ts`）與蒙地卡羅退休飛輪（`monteCarloFireEngine.ts`）。
使用者希望將 `D:\APP\諮詢\私人\慢富之路`（涵蓋 2022–2026/10 共 64 部逐字稿與 V1–V26 實證稽核證據鏈）之 **Zavy 台美股分析框架（三級週期大局觀 × 台美市場寬度與布林位階 × 見自己 A/B 雙軌決策與 30 倍慢富退休）** 轉化為本專案原生專屬工作區（`🐢 慢富週期與配置`），並要求：
1. **100% 善用專案既有模組與外部 API，零重複造輪子，拒絕過度工程化**（不維護外部獨立 Python 爬蟲與重複 JSON 設定檔）。
2. **以原作者（Zavy）視角貫徹核心紀律**：拒絕短線「高頻金絲雀背離自動砍倉」對漣漪起反應；堅持「週期方向決定市場寬度與布林通道意義」（上行期觸及季線布林下緣/20MA 寬度 `<20%` 為買點，中期修正檢核半數落底條件，大型空頭跌破十年線時警示 200MA 寬度鈍化失效並改看 10Y 平衡通膨率 `T10YIE` 插針）。
3. **穿透使用者 21 檔真實持倉與股票質押借貸（`LoanRecord`）**：尊重高股息 ETF（`00878`/`00919`）之現金流心理支柱地位，採「存量不動、增量股息轉向再平衡」；在第三輪榮景期中後段將「順勢調降質押槓桿（還本金防中斷風險）」列為第一優先，並對台股債券 ETF 執行「政府公債 vs 投資級公司債純度分流」與 `etf_daily_nav` 折溢價守門。

## 決策 (Decision)
1. **四大外科手術式重構（Surgical Refactoring，一石二鳥零重複代碼）**：
   - **手術 1（大類資產與存續期間再平衡擴充）**：擴充 `src/types/allocation.ts` 與 `src/engine/rebalancingEngine.ts` 支援 `'ASSET_CLASS'` 維度，實作純函式分類器區分「市值型總報酬核心」、「高股息收息股」、「波段衛星股」、「純美國政府公債（長/中/短存續期間）」、「投資級公司債/特別股（防禦性風險資產）」、「黃金」、「美國權益型 REITs（排除抵押權型 mREITs `00712` 與槓桿債 `00680L`）」與「現金」，並接通 `etf_daily_nav` 攔截溢價買貴風險。
   - **手術 2（SQLite 湖倉 `<25ms` 叢集索引多週期還原寬度與融資去槓桿聚合）**：升級 `scripts/market-sync/sqlite-db-core.cjs`，利用 `PRIMARY KEY (symbol, date)` 叢集索引順序掃描 + `GROUP BY symbol` 條件平均（取 `adj_close` 還原除權息），一次產出台美 `20MA / 60MA / 200MA` 市場寬度與台股近 60 日「大盤回撤 vs 融資餘額減幅（去槓桿完成度）」，消除視窗函數排序耗時並加上交易日定錨快取。
   - **手術 3（修復 `ingest-macro-sentiment.cjs` 離線持久化漏洞並補齊 Zavy 總經序列）**：以無損冪等 `ALTER TABLE` 為 `macro_sentiment_daily` 補齊先前漏存之 `treasury_yield_2y`、`fed_funds_rate`、`us_cpi_yoy`、`credit_spread_oas`、`tw_margin_maintenance_ratio` 欄位，並擴充支援 FRED `BAMLC0A0CM`（投等債 OAS）、`BAMLH0A3HYC`（CCC 級垃圾債利差早期裂痕指標）、`T10YIE`（10Y 平衡通膨率）與 `ICSA`（初請失業金），結合內建至 2026/10 之台美月度製造業基準庫與 10 秒快填校準抽屜。
   - **手術 4（統一 `monteCarloFireEngine.ts` 之 30x 本金與 Coast-FIRE 純函式並修復硬編碼）**：於 `monteCarloFireEngine.ts` 封裝 `calculateSlowWealthFireMetrics`（含 30 倍年支出 `3.33%` 提領防線、Coast-FIRE 今日滑行退休門檻、以及現況純股 vs 股債金防彈衣之前 10 年順序風險破產率對比），並將真實現金餘額注入 `FirePlanningWorkspace.tsx` 拔除 `50_000` 元硬編碼。
2. **專屬頁面三層分段鏡頭架構（防巨石元件護欄）**：
   - 於 `WorkspaceTabs.tsx` 註冊 `'zavy'`（`🐢 慢富週期與配置`）專屬頁籤。
   - 主容器 `ZavySlowWealthWorkspace.tsx` 與各子組件嚴格遵守單檔 `≤ 250 行` 上限，透過頂部常駐「大局觀定錨 HUD 橫幅」與三大分段鏡頭（`[ 🌊 一、總經週期與大局觀 ]`、`[ 🌡️ 二、市場位階與風險傳導 ]`、`[ 🛡️ 三、見自己：雙軌配置與慢富退休 ]`）按需渲染，並支援一鍵複製/匯出 Zavy 標準化 Markdown 市場紀要與 CSV 數據表。
3. **全域 `E06_zavy-perspective` 技能同步升級**：
   - 將知識庫由 2026/06 推進至 2026/10，補齊美台雙引擎榮景期、二次升息實現後 10Y 公債新區間（`4.0%–5.5%`）、CCC 垃圾債裂痕、200MA 寬度大型空頭失效條款與七巨頭/半導體去槓桿輪動心智模型。

## 後果 (Consequences)
- **正面效益**：
  - 100% 複用本專案 SQLite 湖倉與算術引擎，零外部 Python 腳本維護負擔，且同時修復舊戰情室離線持久化漏洞與 FIRE 頁面硬編碼技術債。
  - 完美融合 Zavy 原典「不對漣漪起反應、見自己、把路走完」哲學與使用者 21 檔真實持倉及質押帳本。
- **潛在權衡**：
  - 台美 PMI 細項與國發會領先指標等月頻數據無免費免爬蟲官方 JSON 端點，採「內建 2026/10 稽核基準庫 + 每月月中 10 秒快填校準 Modal + As-Of 明確標記」機制，以換取 100% 離線韌性與零爬蟲斷裂風險。

