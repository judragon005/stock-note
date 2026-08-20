# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案全量交接手冊 (Final Handoff Document)

> **交接產生時間**：2026-08-20 17:20 (UTC+8)  
> **交接里程碑**：V1.3 全市場純線上即時公司行動（TWSE 減資/除權息、Yahoo Finance、多重 CORS 代理池）、5 大特殊公司行動會計核心（換股合併、特別股贖回、企業分拆、可轉債換股、公開收購）、9927 泰銘 2025 現金減資端到端驗收、台股整數股數精度規則修復，全量單元測試 45/45 通過 (100% Passed)。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **主幹分支**：`main`
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml) (GitHub Actions 綠燈)
- **測試狀態**：**45/45 通過** (100% Passed)，TypeScript 0 錯誤，Production Bundle 打包正常。
- **目前正式版本**：**V1.3**

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 包含 Security, Trade Record, Moving Weighted Average Cost, Realized/Unrealized PnL, Total Cost Basis, Yield on Cost (YoC), Treemap, ColorThemeMode, Date Holding Resolution。
   - **V1.3 新增術語**：`Full Market Live Corporate Actions Scanner`（全市場純線上即時公司行動掃描器）、`Stock Merger`（換股合併）、`Preferred Stock Redemption`（特別股贖回）、`Spin-off`（企業分拆獨立上市）、`Convertible Bond Conversion`（可轉債換股）、`Tender Offer`（公開收購）。
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
4. **協作規範與操作指引**：
   - [`AGENTS.md`](file:///d:/APP/股票紀錄/AGENTS.md)：定義 Issue-First 原則、PR 自動關聯 (`Closes #ID`)、Doc Sync 領域文檔同步與分支清理。
   - [`docs/guides/branch_protection_and_pr_workflow.md`](file:///d:/APP/股票紀錄/docs/guides/branch_protection_and_pr_workflow.md)：GitHub 分支保護設定與標準 PR 工作流手冊。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 支援 12 種交易與特殊公司行動、`applyTradeToShares` 純函式計算、台股市場強制整數四捨五入（零小數點）、換股合併跨標的成本平移、分拆成本拆分、特別股/收購已實現結算、可轉債轉普通股成本基準。 |
| **計算引擎測試** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 25 大測試案例，涵蓋買賣、股息、分割、減資退款、9927 現金減資、4 大特殊行動與台股整數精度 (100% 通過)。 |
| **純線上即時掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 廢除假資料庫，串接 TWSE 減資開放資料 (`TWT48U_ALL`)、除權息預告表 (`TWT49U_ALL`) 與 Yahoo Finance，透過多重 CORS 代理池（`corsproxy.io`, `allorigins`, `codetabs`）智慧比對持股區間。 |
| **掃描模組測試** | [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts) | 5 大測試案例，驗證 TWSE 民國/西元日期標準化、9927 現金減資待補登試算、基準日持股判定與查重 (100% 通過)。 |
| **Treemap 演算法** | [`src/utils/treemap.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.ts) | Squarified Treemap 遞迴排版演算法，純數學幾何計算，零外部依賴。 |
| **Treemap 測試** | [`src/utils/treemap.test.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.test.ts) | 4 大測試案例，驗證單一持倉、多持倉幾何鋪滿、長寬比優化與空資料防禦。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、JSON/CSV 雙向解析還原（支援 12 種交易與特殊公司行動、18 欄位無損匯出入）、市價快照持久化。 |
| **持久化測試** | [`src/utils/storage.test.ts`](file:///d:/APP/股票紀錄/src/utils/storage.test.ts) | 11 大測試案例，涵蓋 CSV UTF-8 BOM 解析、12 種事件雙向轉換、追加去重與市價持久化。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | 12 種 `TradeType`、`TradeRecord`（含 `targetSymbol`, `allocationRatio`, `conversionPrice`）、`HoldingPosition`、`PortfolioSummary`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換、匯率調整、色彩主題切換、JSON/CSV 匯出入、✨ 智慧掃描按鈕入口。 |
| **智慧掃描彈窗** | [`src/components/CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx) | 「🟢 全市場純線上即時掃描」徽章、事件預覽、單選/全選與一鍵批次補登。 |
| **關鍵財務卡片** | [`src/components/SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx) | 總市值、未實現損益、已實現損益、累計股息收益、累計減資退款（資本返還）。 |
| **資產配置圖表** | [`src/components/AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) | 視圖切換器（Treemap / 權重長條圖）與雙市場配置比例。 |
| **Treemap 元件** | [`src/components/TreemapChart.tsx`](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx) | 原生 SVG 樹狀圖，支援主題感知、自適應文字大小與懸浮 Tooltip。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 台股純整數格式化（`maximumFractionDigits: 0`）、減資成本扣減標記、可折疊展開之股權異動時間軸 (Timeline)。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 12 種交易/特殊公司行動彩色徽章、比例/退款/除權息日呈現、搜尋與標籤過濾。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | 3 大分類選擇器（常規買賣、常見公司行動、⚡ 特殊公司行動）、專屬動態欄位與基準日持股即時試算橫幅。 |

---

## 🎫 4. 任務票券清單 (GitHub Issues & PR 歷程)

| Issue / PR | 標題 | 狀態 | 備註 |
| :--- | :--- | :--- | :--- |
| [#1](https://github.com/judragon003/-/issues/1) ~ [#6](https://github.com/judragon003/-/issues/6) | V1.0 核心記帳與持久化系列任務 | ✅ Closed | V1.0 正式交付 |
| [#7](https://github.com/judragon003/-/pull/7) ~ [#16](https://github.com/judragon003/-/pull/16) | V1.1 Treemap、色彩主題、折數試算與文檔 | 🟣 Merged | V1.1 正式交付 |
| [#17](https://github.com/judragon003/-/issues/17) ~ [#30](https://github.com/judragon003/-/pull/30) | V1.2 公司行動事件模型、基準日時序回溯與雙軌掃描 | 🟣 Merged | V1.2 正式交付 |
| [#31](https://github.com/judragon003/-/issues/31) | 規格: 全市場純線上即時公司行動掃描與 5 大特殊公司行動 (Epic) | ✅ Closed | V1.3 總規格 Issue |
| [#32](https://github.com/judragon003/-/issues/32) | feat: 事件流模型擴充與特殊公司行動會計核心 | ✅ Closed | Ticket 1 (Engine) |
| [#33](https://github.com/judragon003/-/issues/33) | feat: 全市場純線上多源掃描模組 | ✅ Closed | Ticket 2 (Online Scanner) |
| [#34](https://github.com/judragon003/-/issues/34) | feat: 交易錄入彈窗 12 種事件動態表單與即時試算 | ✅ Closed | Ticket 3 (Dynamic Forms) |
| [#35](https://github.com/judragon003/-/issues/35) | feat: 掃描彈窗狀態與全流程表格呈現升級 | ✅ Closed | Ticket 4 (UI/Table) |
| [#36](https://github.com/judragon003/-/pull/36) | PR: feat: 全市場純線上即時公司行動掃描與 5 大特殊事件會計架構 | 🟣 Merged | V1.3 主功能 PR |
| [#37](https://github.com/judragon003/-/issues/37) | fix: 台股市場股數強制四捨五入取整數，消除小數點股數與顯示精度異常 | ✅ Closed | 精度修復 Issue |
| [#38](https://github.com/judragon003/-/pull/38) | PR: fix: 台股市場股數強制四捨五入取整數，消除小數點股數與顯示精度異常 | 🟣 Merged | 精度修復 PR |

---

## 🔮 5. 專案全量收斂與未來規劃 (Project Status & Future Roadmap)

目前 **V1.0、V1.1、V1.2 與 V1.3 之所有規劃 Issue（#1 ~ #38）已 100% 全數開發、測試、重構與驗收完成**。

若未來啟動 **V1.4 / V2.0** 新功能（例如：歷史淨值走勢折線圖、券商對帳單自動 PDF/OCR 解析匯入、即時行情 WebSocket 串接等），請繼續遵循標準 Agent 閉環工作流：
1. `/grill-with-docs`：釐清架構決策與領域術語
2. `/to-spec`：產出 PRD 規格書並沉澱至 `docs/specs/`
3. `/to-tickets`：建立對應 GitHub Issues
4. `/triage` ➔ `/tdd & /implement` ➔ `/code-review` ➔ `PR Squash Merge` ➔ `/handoff`

---

## 🛠️ 常用工作流指令 (Skills Trigger)

- **`/to-spec`**：規劃下一階段全新功能規格書。
- **`/to-tickets`**：將規格拆解為獨立任務 Ticket。
- **`/triage`**：檢視並分流新開立之 Issue。
- **`/tdd & /implement`**：紅-綠-重構循環開發。
- **`/code-review`**：對任意變更進行標準與規格雙軸審查。
- **`/handoff`**：會話結尾歸檔專案交接手冊。
