# ADR 0242: 台股全市場集保與配息歷史數據湖倉、每週自動更新閉環暨主力戰情室司令台重構

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-20
- **關聯規格 (Spec)**: [docs/specs/0242-tw-lakehouse-tdcc-dividend-history-and-war-room-command-deck-spec.md](file:///d:/APP/股票紀錄/docs/specs/0242-tw-lakehouse-tdcc-dividend-history-and-war-room-command-deck-spec.md)
- **關聯 Issue**: `#598`

---

## 1. 背景與問題定義 (Context & Problem Statement)

主力戰情室在檢視台股標的（如 `0050`）與全市場歷史數據時，存在以下底層資料斷層與介面決策效率瓶頸：
1. **Card 19 集保趨勢退化為單點快照**：本地 SQLite 湖倉僅存最新單週快照，第三方免費歷史集保介面返回 HTTP 400，且既有按需補齊在 300ms 逾時瞬間即強制中止背景連線，導致歷史集保無法沉澱。
2. **除權息歷史資料庫短缺且 Card 20 人為截斷**：全庫僅 111 筆除權息紀錄（既有機制僅抓上市預告表未抓歷年結果表）；前端組裝層寫死截斷最新 4 筆（誤稱「近四季」），導致半年配/年配 ETF 的 2024、2023 年配息被隱蔽。
3. **Card 21 在 ETF 模式下出現 160px 大片空白半殘視圖**：下半部個股財報與董監質押在 ETF 模式下皆為空，使卡片產生巨大黑洞。
4. **Card 18 總評判沉於頁尾且三欄橫向字體擁擠**：操盤司令台未能置頂，三欄排版壓縮字體，不符快速判讀人體工學。
5. **湖倉缺乏統一每週自動更新與無人值守生產伺服器**：缺乏單一每週協調更新指令，NAS Docker 部署需額外排程與持久化機制。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 台股全市場除權息 10 年雙源批次入庫
- [ingest-tw-corporate-actions.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-tw-corporate-actions.cjs)：整合 TWSE `TWT49U` 與 TPEx `exDailyQ` 官方年份批次端點，自動將民國年正規化為 ISO `YYYY-MM-DD`。
- 採用複合主鍵 `(symbol, action_type, ex_date)` 執行 SQLite 冪等寫入（`ON CONFLICT DO UPDATE`），保留發放日等輔助欄位不被空值覆蓋。近 10 年歷史成功抓取 19,494 筆全市場上市櫃除權息紀錄。
- [aiForceMarketAssembly.ts](file:///d:/APP/股票紀錄/src/engine/aiForceMarketAssembly.ts) 解除 `.slice(0, 4)` 截斷，擴展至 12 筆；[MonthlyRevenueCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MonthlyRevenueCard.tsx) 標題動態修正為「歷年配息紀錄與單期殖利率」。

### 2.2 TDCC 51 週歷史回溯與非阻塞背景補齊
- [ingest-tw-tdcc.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/ingest-tw-tdcc.cjs)：廢棄付費介面，對接 TDCC 官方 `qryStock` 免費端點，精確聚合 15 級股權分散矩陣。
- [on-demand-backfill-orchestrator.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/on-demand-backfill-orchestrator.cjs)：引入 `runWithNonBlockingTimeout`，將「首屏等待門檻（300ms）」與「背景補齊逾時（15s）」解耦，首屏即時回傳不中止背景 I/O，寫庫完成後前端即現連續多週趨勢。

### 2.3 Card 21 ETF 折溢價波動統計量化補全
- [aiForceDashboardEngine.ts](file:///d:/APP/股票紀錄/src/engine/aiForceDashboardEngine.ts)：自湖倉 30 日歷史淨值計算 ETF 折溢價區間（最高、最低、平均與波動幅度）。
- [ValuationMetricsCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/ValuationMetricsCard.tsx)：在 ETF 模式下注入折溢價波動區間與合理容忍帶警示條，徹底消滅 160px 空白黑洞。

### 2.4 Card 18 司令台置頂與直式垂直作戰甲板
- [AiForceDashboardView.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.tsx)：Card 18 移至 Card 01 之前（ZONE 01 最頂端）。
- [MainForceVerdictCard.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/cards/MainForceVerdictCard.tsx)：採用 `data-layout="vertical-stack"`，改為直式三層垂直堆疊。語意大字提升至 `34px`、點位數字提升至 `26px`、戰術指令提升至 `16px`，全數符合微字人體工學。

### 2.5 NAS 24/7 生產伺服器與 Docker 持久化部署
- 新增純 Node.js 22 零依賴生產伺服器 [scripts/nas-server.cjs](file:///d:/APP/股票紀錄/scripts/nas-server.cjs)，支援環境變數 `LAKEHOUSE_DB_PATH`、`/api/market/*` 與 `/api/yahoo` 代理。
- 提供 [Dockerfile](file:///d:/APP/股票紀錄/Dockerfile)、[docker-compose.yml](file:///d:/APP/股票紀錄/docker-compose.yml) 與無頭排程器 [nas-autonomous-scheduler.cjs](file:///d:/APP/股票紀錄/scripts/market-sync/nas-autonomous-scheduler.cjs)。

---

## 3. 影響與驗證 (Consequences & Verification)

- **測試與建置**：新增 [spec0242LakehouseAndCommandDeck.test.tsx](file:///d:/APP/股票紀錄/src/engine/spec0242LakehouseAndCommandDeck.test.tsx)（6/6 通過），既有 [AiForceDashboardView.test.tsx](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/AiForceDashboardView.test.tsx)（14/14 通過）與 [ergonomicTypographyGuardrail.test.ts](file:///d:/APP/股票紀錄/src/components/aiForceDashboard/ergonomicTypographyGuardrail.test.ts)（4/4 通過）100% 綠燈；`npm run build` TypeScript 0 錯誤。
- **技術債管理**：無新增未解決之技術債。
