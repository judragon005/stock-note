# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案交接手冊 (Handoff Document)

> **交接產生時間**：2026-08-20 16:35 (UTC+8)  
> **交接里程碑**：V1.2 公司行動（除權息、分割、減資退款、增資認股）、歷史基準日持股時序回溯判定、混合雙軌智慧金融掃描、資產總覽分項加總與持股歷程時間軸全量完成，全量測試 36/36 通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **主幹分支**：`main`
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml) (GitHub Actions 綠燈)
- **測試狀態**：**36/36 通過** (100% Passed)，TypeScript 0 錯誤，Production Bundle 打包正常。
- **目前正式版本**：**V1.2**

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 包含 Security, Trade Record, Moving Weighted Average Cost, Realized/Unrealized PnL, Total Cost Basis, Yield on Cost (YoC), Treemap, ColorThemeMode。
   - **V1.2 新增術語**：`Date Holding Resolution`（歷史基準日時序回溯判定）、`Return of Capital`（資本返還 / 減資退款本金扣減）、`Stock Dividend`（除權配股）、`Stock Split`（股票分割）、`Capital Reduction`（現金/虧損減資）、`Capital Increase`（現金增資認股）、`Hybrid Corporate Action Scanner`（混合雙軌金融掃描）、`MarketSummarySlice`（資產切片介面）。
2. **架構決策紀錄 (ADR)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：React 18 + TypeScript + Vite + Vanilla CSS，雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap（零外部圖表套件）、CSS 變數全域主題切換、純函式 + 完整 deps 消除 Stale Closure。
   - [`ADR-0003`](file:///d:/APP/股票紀錄/docs/adr/0003-v1.2-corporate-actions-and-date-holding-resolution.md)：統一事件流模型、純函式 `applyTradeToShares` 股數回放、資本返還扣減成本會計模型、Yahoo Finance API + 離線備援資料庫。
3. **規格說明書 (PRD)**：
   - [`0001-stock-tracker-and-analyzer.md`](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0：15 條 User Stories 全數落實）
   - [`0002-v1-enhancements-and-treemap.md`](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1：US-16 至 US-21 全數落實）
   - [`0003-corporate-actions-and-date-holding-resolution.md`](file:///d:/APP/股票紀錄/docs/specs/0003-corporate-actions-and-date-holding-resolution.md)（V1.2：US-22 至 US-35 全數落實）
4. **協作規範與操作指引**：
   - [`AGENTS.md`](file:///d:/APP/股票紀錄/AGENTS.md)：定義 Issue-First 原則、PR 自動關聯 (`Closes #ID`)、Doc Sync 領域文檔同步與分支清理。
   - [`docs/guides/branch_protection_and_pr_workflow.md`](file:///d:/APP/股票紀錄/docs/guides/branch_protection_and_pr_workflow.md)：GitHub 分支保護設定與標準 PR 工作流手冊。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 加權平均成本、`applyTradeToShares` 純函式、`getHoldingsAsOfDate` 基準日時序回溯、減資退款成本扣減、除權配股稀釋、YoC 與台股手續費折數試算。 |
| **計算引擎測試** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 19 大測試案例，涵蓋買進、賣出、股息、分割、減資退款、增資、基準日回溯與純函式驗證 (100% 通過)。 |
| **金融事件掃描** | [`src/engine/corporateActionScanner.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) | 整合 Yahoo Finance 免費 API (4s 超時容錯) 與內建離線備援資料庫，智慧比對持有區間並標記 `sourceType`。 |
| **掃描模組測試** | [`src/engine/corporateActionScanner.test.ts`](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.test.ts) | 3 大測試案例，驗證事件查重比對、基準日持股換算配發數與離線降級機制 (100% 通過)。 |
| **Treemap 演算法** | [`src/utils/treemap.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.ts) | Squarified Treemap 遞迴排版演算法，純數學幾何計算，零外部依賴。 |
| **Treemap 測試** | [`src/utils/treemap.test.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.test.ts) | 4 大測試案例，驗證單一持倉、多持倉幾何鋪滿、長寬比優化與空資料防禦。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、JSON/CSV 雙向解析還原（支援 15 欄位公司行動無損相容）、市價快照持久化。 |
| **持久化測試** | [`src/utils/storage.test.ts`](file:///d:/APP/股票紀錄/src/utils/storage.test.ts) | 10 大測試案例，涵蓋 CSV UTF-8 BOM 解析、公司行動欄位雙向轉換、追加去重與市價持久化。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | `TradeRecord`, `HoldingPosition` (含 `originalBuyShares`, `totalCapitalReturned`), `MarketSummarySlice`, `PortfolioSummary`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換、匯率調整、色彩主題切換、JSON/CSV 匯出入、✨ 智慧掃描按鈕入口。 |
| **智慧掃描彈窗** | [`src/components/CorporateActionScannerModal.tsx`](file:///d:/APP/股票紀錄/src/components/CorporateActionScannerModal.tsx) | 掃描進度、事件預覽、即時/離線連線狀態徽章（🟢/🟡）、單選/全選與一鍵批次補登。 |
| **關鍵財務卡片** | [`src/components/SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx) | 總市值、未實現損益、已實現損益、累計股息收益、累計減資退款（資本返還）。 |
| **資產配置圖表** | [`src/components/AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) | 視圖切換器（Treemap / 權重長條圖）與雙市場配置比例。 |
| **Treemap 元件** | [`src/components/TreemapChart.tsx`](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx) | 原生 SVG 樹狀圖，支援主題感知、自適應文字大小與懸浮 Tooltip。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 股數欄呈現目前持股/原買入股數分離比對、減資成本扣減標記、可折疊展開之股權異動時間軸 (Timeline)。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 7 種交易/公司行動專屬徽章、比例/退款/除權息日呈現、搜尋與標籤過濾。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | 7 種事件模式動態表單切換、自動調用 `getHoldingsAsOfDate` 呈現基準日持股即時試算。 |

---

## 🎫 4. 任務票券清單 (GitHub Issues & PR 歷程)

| Issue / PR | 標題 | 狀態 | 備註 |
| :--- | :--- | :--- | :--- |
| [#1](https://github.com/judragon003/-/issues/1) ~ [#6](https://github.com/judragon003/-/issues/6) | V1.0 核心記帳與持久化系列任務 | ✅ Closed | V1.0 正式交付 |
| [#7](https://github.com/judragon003/-/pull/7) ~ [#16](https://github.com/judragon003/-/pull/16) | V1.1 Treemap、色彩主題、折數試算與文檔 | 🟣 Merged | V1.1 正式交付 |
| [#17](https://github.com/judragon003/-/issues/17) | 規格: 依交易日期判定持股與公司行動自動化記錄 (PRD) | ✅ Closed | V1.2 總規格 Issue |
| [#18](https://github.com/judragon003/-/issues/18) | feat: 時序回溯持股判定、公司行動事件模型與會計核心 | ✅ Closed | Ticket 1 (Engine) |
| [#19](https://github.com/judragon003/-/issues/19) | feat: 交易彈窗公司行動動態表單與歷史記錄表格擴充 | ✅ Closed | Ticket 2 (Trade UI) |
| [#20](https://github.com/judragon003/-/issues/20) | feat: 智慧掃描免費金融資料源與一鍵自動補登模組 | ✅ Closed | Ticket 3 (Scanner) |
| [#21](https://github.com/judragon003/-/issues/21) | feat: 資產總覽現金流加總、時間軸展開與真實本金 YoC | ✅ Closed | Ticket 4 (Summary/Timeline) |
| [#22](https://github.com/judragon003/-/pull/22) | PR: feat: 實作交易日期基準日持股判定、公司行動記錄與加總 (V1.2) | 🟣 Merged | V1.2 主功能 PR |
| [#23](https://github.com/judragon003/-/issues/23) | 優化: 重構計算引擎重複 Switch、連線狀態與原始買入股數 | ✅ Closed | Code Review 重構 Issue |
| [#24](https://github.com/judragon003/-/pull/24) | PR: refactor: 重構計算引擎重複 Switch、連線狀態與原買入股數 | 🟣 Merged | Code Review 重構 PR |
| [#25](https://github.com/judragon003/-/issues/25) | docs: 補充 V1.2 公司行動與基準日時序回溯架構決策紀錄 (ADR-0003) | ✅ Closed | ADR-0003 Issue |
| [#26](https://github.com/judragon003/-/pull/26) | PR: docs: 補充 V1.2 公司行動架構決策紀錄 (ADR-0003) | 🟣 Merged | ADR-0003 PR |
| [#27](https://github.com/judragon003/-/issues/27) | docs: 補充 .scratch/v1.2-corporate-actions 任務切片檔案存檔 | ✅ Closed | .scratch 存檔 Issue |
| [#28](https://github.com/judragon003/-/pull/28) | PR: docs: 補充 .scratch/v1.2-corporate-actions 任務切片檔案存檔 | 🟣 Merged | .scratch 存檔 PR |
| [#29](https://github.com/judragon003/-/issues/29) | docs: 同步交接手冊 docs/handoff 至 V1.2 公司行動完成狀態 | ⏳ Active | 本次交接手冊 PR |

---

## 🔮 5. 專案全量收斂與未來規劃 (Project Status & Future Roadmap)

目前 **V1.0、V1.1 與 V1.2 之所有規劃 Issue（#1 ~ #29）已 100% 全數開發、測試、重構與驗收完成**。

若未來啟動 **V1.3 / V2.0** 新功能（例如：歷史損益走勢折線圖、券商對帳單自動 PDF/OCR 解析匯入、即時行情 WebSocket 串接等），請繼續遵循標準 Agent 閉環工作流：
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
