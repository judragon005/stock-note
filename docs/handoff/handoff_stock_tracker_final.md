# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-08-21 11:05 (UTC+8)  
> **交接里程碑**：**V1.4 全市場即時與延遲報價系統與自訂價格鎖定**（Yahoo Finance API v8/v7、TWSE 官方 OpenAPI 每日收盤價備援、健全 CORS 代理池、智慧開盤時段判定與 60 秒背景自動輪詢、自訂價格手動鎖定保護 🔒、持久化快取降級 ⚠️、表格狀態徽章 🟢/🟡/🔒/⚠️、當日漲跌額與百分比、頂部狀態列與「⚡ 一鍵更新市價」、Code Review 雙軸審查及 W-1 與 N-1~N-3 全數修復）。全量單元測試 66/66 通過 (100% Passed)，TypeScript 0 錯誤 0 警告。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **主幹分支**：`main`
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml) (GitHub Actions 綠燈)
- **測試狀態**：**66/66 通過** (100% Passed)，TypeScript 0 錯誤，Production Bundle 打包正常。
- **目前正式版本**：**V1.4**
- **對話全量實體備份**：[`0-0_開發歷程自動化紀錄/20260821_V1.4即時與延遲報價系統與自訂價格鎖定_對話紀錄.jsonl`](file:///d:/APP/股票紀錄/0-0_開發歷程自動化紀錄/20260821_V1.4即時與延遲報價系統與自訂價格鎖定_對話紀錄.jsonl) (已隔離於 Git 之外)

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 包含 Security, Trade Record, Moving Weighted Average Cost, Realized/Unrealized PnL, Total Cost Basis, Yield on Cost (YoC), Treemap, ColorThemeMode, Date Holding Resolution, Special Corporate Actions。
   - **V1.4 新增術語**：
     - `Realtime & Delayed Quotes Engine`（多源免費即時與延遲報價引擎）
     - `Market Session Detection & Auto Refresh`（交易時段判定與智慧自動輪詢）
     - `Manual Price Lock Shield`（自訂價格手動鎖定防禦機制）
     - `Quote Status Badge & Fallback Cache`（報價狀態徽章與持久化快取降級）
2. **架構決策紀錄 (ADR)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：React 18 + TypeScript + Vite + Vanilla CSS，雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap（零外部圖表套件）、CSS 變數全域主題切換、純函式 + 完整 deps 消除 Stale Closure。
   - [`ADR-0003`](file:///d:/APP/股票紀錄/docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)：統一事件流模型、純函式 `applyTradeToShares` 股數回放、資本返還扣減成本會計模型。
   - [`ADR-0004`](file:///d:/APP/股票紀錄/docs/adr/0004-full-market-live-corporate-actions-and-special-events.md)：全市場純線上多源即時掃描（TWSE OpenAPI + 多重 CORS 代理池）、5 大特殊公司行動會計核心與台股整數股數規則。
3. **規格說明書 (PRD)**：
   - [`0001-stock-tracker-and-analyzer.md`](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0：15 條 User Stories 全數落實）
   - [`0002-v1-enhancements-and-treemap.md`](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1：US-16 至 US-21 全數落實）
   - [`0003-corporate-actions-and-date-holding-resolution.md`](file:///d:/APP/股票紀錄/docs/specs/0003-corporate-actions-and-date-holding-resolution.md)（V1.2：US-22 至 US-35 全數落實）
   - [`0004-full-market-live-corporate-actions-and-special-events.md`](file:///d:/APP/股票紀錄/docs/specs/0004-full-market-live-corporate-actions-and-special-events.md)（V1.3：US-36 至 US-42 全數落實）
   - [`0005-realtime-and-delayed-market-quotes-system.md`](file:///d:/APP/股票紀錄/docs/specs/0005-realtime-and-delayed-market-quotes-system.md)（**V1.4：US-47 至 US-53 全數落實，PRD 0005 驗收 100% 通過**）
4. **協作規範與操作指引**：
   - [`AGENTS.md`](file:///d:/APP/股票紀錄/AGENTS.md)：定義 Issue-First 原則、PR 自動關聯 (`Closes #ID`)、Doc Sync 領域文檔同步與分支清理。
   - [`docs/guides/manual_verification_runbook.md`](file:///d:/APP/股票紀錄/docs/guides/manual_verification_runbook.md)：V1.4 手動驗證作業指導手冊（8 大測試情境逐項引導）。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **報價引擎核心** | [`src/engine/priceFetcher.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.ts) | 純前端多源報價引擎：Yahoo Finance API (v8/v7) 台美股代碼正規化、TWSE 官方 OpenAPI 盤後收盤價備援、CORS 代理池多節點重試與超時熔斷、批次並行抓取。 |
| **報價引擎測試** | [`src/engine/priceFetcher.test.ts`](file:///d:/APP/股票紀錄/src/engine/priceFetcher.test.ts) | 11 大測試案例，涵蓋代碼正規化、Yahoo API 響應解析、TWSE OpenAPI 降級備援、批次並行請求 (100% 通過)。 |
| **自動輪詢 Hook** | [`src/hooks/usePriceAutoRefresh.ts`](file:///d:/APP/股票紀錄/src/hooks/usePriceAutoRefresh.ts) | 交易時段精確判定（台股 09:00~13:30、美股 21:30~04:00）、進站自動抓取、開盤 60 秒定時輪詢、過濾已鎖定標的、單檔強制刷新。 |
| **自動輪詢測試** | [`src/hooks/usePriceAutoRefresh.test.ts`](file:///d:/APP/股票紀錄/src/hooks/usePriceAutoRefresh.test.ts) | 6 大測試案例，驗證台股/美股/週末開休市時段精確判定、已鎖定標的過濾、無持股不請求 (100% 通過)。 |
| **統一日誌工具** | [`src/utils/logger.ts`](file:///d:/APP/股票紀錄/src/utils/logger.ts) | 集中管理前端錯誤與除錯資訊，具備環境判別與防禦性錯誤前綴，消除散落的 console.error。 |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 支援 12 種交易與特殊公司行動、`applyTradeToShares` 純函式計算、台股市場強制整數四捨五入、換股合併成本平移、分拆成本拆分、特別股/收購已實現結算。 |
| **計算引擎測試** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 25 大測試案例，涵蓋買賣、股息、分割、減資退款、9927 現金減資、4 大特殊行動與台股整數精度 (100% 通過)。 |
| **純線上即時掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 串接 TWSE 減資開放資料 (`TWT48U_ALL`)、除權息預告表 (`TWT49U_ALL`) 與 Yahoo Finance，透過多重 CORS 代理池比對持股除權息與減資事件。 |
| **掃描模組測試** | [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts) | 5 大測試案例，驗證 TWSE 民國/西元日期標準化、現金減資待補登試算、基準日持股判定與查重 (100% 通過)。 |
| **Treemap 演算法** | [`src/utils/treemap.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.ts) | Squarified Treemap 遞迴排版演算法，純數學幾何計算，零外部依賴。 |
| **Treemap 測試** | [`src/utils/treemap.test.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.test.ts) | 4 大測試案例，驗證單一持倉、多持倉幾何鋪滿、長寬比優化與空資料防禦。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、`PriceMetadataStore` 與 `lockedSymbols` 讀寫、JSON/CSV 雙向解析還原（12 種交易、18 欄位無損匯出入）。 |
| **持久化測試** | [`src/utils/storage.test.ts`](file:///d:/APP/股票紀錄/src/utils/storage.test.ts) | 15 大測試案例，涵蓋報價中繼資料、自訂鎖定清單持久化、CSV UTF-8 BOM 解析、12 種事件雙向轉換。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | `PriceQuoteStatus`、`PriceQuote`、`PriceMetadataStore`、12 種 `TradeType`、`TradeRecord`、`HoldingPosition`、`PortfolioSummary`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換、匯率調整、色彩主題切換、JSON/CSV 匯出入、✨ 智慧掃描、⚡ 一鍵更新市價按鈕（旋轉動畫）與開休市狀態/時間戳標籤。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 狀態徽章 (🟢/🟡/🔒/⚠️)、當日漲跌額與百分比、單檔 🔒 鎖定切換與 🔄 立即刷新、`<PriceDisplayView />` 獨立渲染子元件、展開股權時間軸。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 12 種交易/特殊公司行動彩色徽章、比例/退款/除權息日呈現、搜尋與標籤過濾。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | 3 大分類選擇器（常規買賣、常見公司行動、⚡ 特殊公司行動）、專屬動態欄位與基準日持股即時試算橫幅。 |

---

## 🎯 4. V1.4 交付票券閉環摘要 (Ticket Summary)

| 票券編號 | 標題 | 對應 PR | 狀態 |
| :--- | :--- | :---: | :---: |
| **[#47](https://github.com/judragon003/-/issues/47)** | `feat: 多源即時/延遲報價核心引擎與 CORS 代理容錯 (Ticket 1)` | [#51](https://github.com/judragon003/-/pull/51) | ✅ Merged |
| **[#48](https://github.com/judragon003/-/issues/48)** | `feat: 報價狀態管理、持久化快取與自訂價格鎖定防禦 (Ticket 2)` | [#52](https://github.com/judragon003/-/pull/52) | ✅ Merged |
| **[#49](https://github.com/judragon003/-/issues/49)** | `feat: 智慧交易時段判定與開盤背景自動輪詢 Hook (Ticket 3)` | [#53](https://github.com/judragon003/-/pull/53) | ✅ Merged |
| **[#50](https://github.com/judragon003/-/issues/50)** | `feat: 持股列表狀態徽章、漲跌標籤與頂部狀態更新 UI 整合 (Ticket 4)` | [#54](https://github.com/judragon003/-/pull/54) | ✅ Merged |
| **-** | `docs: 同步 CONTEXT.md 領域模型與手動驗證手冊至 V1.4` | [#55](https://github.com/judragon003/-/pull/55) | ✅ Merged |
| **-** | `fix: 手動修價鎖定改為冪等操作，防止連續修改時意外解鎖 (Code Review W-1)` | [#56](https://github.com/judragon003/-/pull/56) | ✅ Merged |
| **-** | `refactor: 完成 Code Review N-1 ~ N-3 優化 (logger, PriceDisplayView, PRD 欄位)` | [#57](https://github.com/judragon003/-/pull/57) | ✅ Merged |
| **[#46](https://github.com/judragon003/-/issues/46)** | `規格: V1.4 全市場即時與延遲報價系統與自訂價格鎖定 (PRD 0005)` | - | ✅ Closed |

---

## 🔮 5. 下一階段建議主題 (Next Session Candidates)

若使用者欲啟動下一迭代版本（V1.5），建議可探索以下候選功能方向：
1. **多投資組合 / 分帳戶管理 (Multi-Portfolio Support)**：支援「長期存股倉」、「短線波段倉」、「退休帳戶」多帳號分流記帳。
2. **歷程淨值走勢與績效圖表 (Historical NAV & Performance Chart)**：繪製時間序列的總資產淨值曲線與大盤指數（如 S&P 500、加權指數）對比基準。
3. **自動股息預估與行事曆 (Dividend Forecast & Calendar)**：基於在倉持股與已公告除息日程，預估未來 12 個月現金流。

---

## 🛠️ 6. 建議接續使用的 Agent 技能 (Suggested Skills for Next Agent)

下一位 Agent 接手時，建議優先呼叫以下技能：
- **`brief-builder`** 或 **`/grill-with-docs`**：進行新需求的深入拷問與規格對齊。
- **`/to-spec` & `/to-tickets`**：產出 PRD 0006 與可測試的微小 Tickets。
- **`Unit Test Master`** (`/tdd`)：嚴格遵循紅-綠-重構循環實作新功能。
- **`Code Review Expert`** (`/code-review`)：在 PR 合併前進行品質與安全防禦檢查。
