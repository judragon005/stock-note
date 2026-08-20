# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案交接手冊 (Handoff Document)

> **交接產生時間**：2026-08-20 15:15 (UTC+8)  
> **交接里程碑**：Issue #6 本地儲存持久化、JSON/CSV 雙向匯入匯出、自訂市價快照持久化、ImportModal 衝突選擇完成，全量測試 22/22 通過。

---

## 📌 1. 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git`
- **當前分支**：`feature/6-persistence-and-backup`
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml)
- **測試狀態**：**22/22 通過** (100% Passed)，TypeScript 0 錯誤，Production Bundle 打包完成 (219.16 kB / gzip: 65.56 kB)。
- **目前正式版本**：**V1.1**

---

## 🏛️ 2. 領域模型與架構決策索引 (Domain & Decisions)

1. **通用語言詞彙表**：[`CONTEXT.md`](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 包含 Security, Trade Record, Lot, Moving Weighted Average Cost, Realized/Unrealized PnL, Total Cost Basis。
   - **V1.1 新增術語**：`Dividend`（股息）、`Total Dividends`（累計股息）、`Yield on Cost (YoC)`（成本殖利率）、`Treemap`（Squarified 資產樹狀圖）、`ColorThemeMode`（漲跌主題）、`Broker Fee Discount Rate`（券商折數）、`Minimum Fee Threshold`（低消門檻）。
2. **架構決策紀錄 (ADR)**：
   - [`ADR-0001`](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：React 18 + TypeScript + Vite + Vanilla CSS，雙市場獨立記帳與加權平均成本模型。
   - [`ADR-0002`](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：純 SVG Squarified Treemap（零外部圖表套件）、CSS 變數全域主題切換、純函式 + 完整 deps 消除 Stale Closure。
3. **規格說明書 (PRD)**：
   - [`0001-stock-tracker-and-analyzer.md`](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0：15 條 User Stories 全數落實）
   - [`0002-v1-enhancements-and-treemap.md`](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1：US-16 至 US-21 全數落實）
4. **協作規範與操作指引**：
   - [`AGENTS.md`](file:///d:/APP/股票紀錄/AGENTS.md)：定義 Issue-First 原則、PR 自動關聯 (`Closes #ID`)、Doc Sync 文檔同步與分支清理。
   - [`docs/guides/branch_protection_and_pr_workflow.md`](file:///d:/APP/股票紀錄/docs/guides/branch_protection_and_pr_workflow.md)：GitHub 分支保護設定與 4 步驟實戰手冊。

---

## 📂 3. 實體模組與程式碼索引 (Codebase Map)

| 模組分類 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 加權平均成本、未實現/已實現損益、累計股息、YoC、`calculateTaiwanFee`、`calculateTaiwanTax`。 |
| **單元測試套件** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 9 大測試案例，涵蓋買進、賣出、股息、YoC 精度、台股折數手續費與證交稅 (100% 通過)。 |
| **Treemap 演算法** | [`src/utils/treemap.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.ts) | Squarified Treemap 遞迴排版演算法，純數學幾何計算，零外部依賴。 |
| **Treemap 測試** | [`src/utils/treemap.test.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.test.ts) | 4 大測試案例，驗證單一持倉、多持倉幾何鋪滿、長寬比優化與空資料防禦。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、JSON/CSV 雙向解析還原、自訂市價快照持久化、相容 Excel 之 UTF-8 BOM CSV 匯出。 |
| **持久化測試** | [`src/utils/storage.test.ts`](file:///d:/APP/股票紀錄/src/utils/storage.test.ts) | 9 大測試案例，涵蓋 CSV UTF-8 BOM 解析、雙引號脫逸、追加合併去重、市價持久化與損毀防禦。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | `TradeRecord`, `HoldingPosition` (含 `totalDividends`, `yieldOnCostPercent`), `ColorThemeMode`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換 (全部/台股/美股)、匯率調整、紅漲綠跌/綠漲紅跌切換按鈕、JSON/CSV 匯出入。 |
| **匯入確認彈窗** | [`src/components/ImportModal.tsx`](file:///d:/APP/股票紀錄/src/components/ImportModal.tsx) | 檔案解析摘要統計、全量覆蓋 (Overwrite) 與追加合併 (Merge & Append) 模式選擇。 |
| **關鍵財務卡片** | [`src/components/SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx) | 總市值、未實現損益、已實現損益、累計股息收益。 |
| **資產配置圖表** | [`src/components/AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) | 視圖切換器（Treemap / 權重長條圖）與雙市場配置比例。 |
| **Treemap 元件** | [`src/components/TreemapChart.tsx`](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx) | 原生 SVG 樹狀圖，支援主題感知、自適應文字大小與懸浮 Tooltip。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 行內點擊修改市價、YoC 成本殖利率顯示、加碼/賣出預填。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 代碼與策略標籤即時搜尋過濾、單筆刪除確認。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | Autosuggest 智慧標的建議 (24 檔字典)、券商手續費折數試算、低消開關、連續記帳模式。 |

---

## 🎫 4. 任務票券清單 (GitHub Issues 狀態)

| Issue / PR | 標題 | 狀態 | 備註 |
| :--- | :--- | :--- | :--- |
| [#1](https://github.com/judragon003/-/issues/1) | 規格: 美股與台股雙市場交易紀錄與投資分析儀 (PRD) | ✅ Closed | V1.0 規格 |
| [#2](https://github.com/judragon003/-/issues/2) | feat: 雙市場移動加權平均與損益計算核心 | ✅ Closed | 會計核心 |
| [#3](https://github.com/judragon003/-/issues/3) | feat: 雙市場交易錄入彈窗與自動稅費試算 | ✅ Closed | 交易彈窗 |
| [#4](https://github.com/judragon003/-/issues/4) | feat: 財務指標儀表板、資產配置圖與多幣別切換 | ✅ Closed | 儀表板與圖表 |
| [#5](https://github.com/judragon003/-/issues/5) | feat: 持倉總覽表與交易明細搜尋過濾 | ✅ Closed | 表格與過濾 |
| [#6](https://github.com/judragon003/-/issues/6) | feat: 本地儲存持久化與 JSON/CSV 雙向備份還原 | ✅ Closed | 儲存持久化 |
| [#7](https://github.com/judragon003/-/pull/7) | PR: feat(v1.1) 資產樹狀圖、手續費折數、色彩主題與 YoC | 🟣 Merged | V1.1 主功能 PR |
| [#8](https://github.com/judragon003/-/issues/8) | feat(v1.1): 資產樹狀圖視覺化 (Squarified Treemap) | ✅ Closed | V1.1 關聯 Issue |
| [#9](https://github.com/judragon003/-/issues/9) | feat(v1.1): 智慧交易錄入 - Autosuggest 與連續記帳模式 | ✅ Closed | V1.1 關聯 Issue |
| [#10](https://github.com/judragon003/-/issues/10) | feat(v1.1): 漲跌色彩主題切換與 YoC 成本殖利率 | ✅ Closed | V1.1 關聯 Issue |
| [#11](https://github.com/judragon003/-/pull/11) | PR: docs: 同步更新 V1.1 領域模型、ADR 與交接手冊 | 🟣 Merged | 文檔同步 PR |
| [#12](https://github.com/judragon003/-/pull/12) | PR: docs(agents): 強化 Agent 協作工作流規範 | 🟣 Merged | 規範升級 PR |
| [#13](https://github.com/judragon003/-/pull/13) | PR: docs: 更新交接手冊至最新狀態 | 🟣 Merged | 交接手冊同步 PR |
| [#15](https://github.com/judragon003/-/pull/15) | PR: feat: 本地儲存持久化與 JSON/CSV 雙向備份還原 | 🟣 Merged | Issue #6 實作 PR |

---

## 🔮 5. 專案全量收斂與未來規劃 (Project Status & Future Roadmap)

目前 **V1.0 與 V1.1 之所有規劃 Issue（#1 ~ #6, #8 ~ #10）已 100% 全數開發、測試與驗收完成**。

若未來啟動 **V1.2 / V2.0** 新功能（例如：歷史損益走勢圖折線圖、券商對帳單自動 OCR 匯入、即時股價 API 自動同步等），請遵循標準 Agent 工作流：
1. `/to-spec`：定義新版規格書並沉澱至 `docs/specs/`
2. `/to-tickets`：建立對應 GitHub Issues
3. `/triage` ➔ `/tdd` ➔ `/code-review` ➔ `PR`

---

## 🛠️ 推薦工作流指令 (Skills Trigger)

- **`/to-spec`**：規劃下一階段 V1.2 全新功能規格書。
- **`/triage`**：檢視並分流新開立之 Issue。
- **`/code-review`**：對任意變更進行標準與規格雙軸審查。

