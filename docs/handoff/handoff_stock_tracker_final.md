# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案交接手冊 (Handoff Document)

## 📌 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git` (`main` 分支已完全同步)
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml)
- **測試狀態**：公開會計核心運算縫隙 6/6 通過 (100% Passed)，TypeScript 型別檢查 0 錯誤，Production Bundle 打包完成，Markdownlint 0 警告。

---

## 🏛️ 領域模型與架構決策 (Domain & Decisions)

1. **通用語言詞彙表**：[CONTEXT.md](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 規範 Transaction（買進、賣出、股利）、Market（TW/US）、Holding、Realized/Unrealized PnL 等標準定義。
2. **架構決策紀錄 (ADR)**：[ADR-0001](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)
   - **前端技術棧**：React 18 + TypeScript + Vite + Vanilla CSS Glassmorphism 設計系統。
   - **多幣別獨立記帳**：台股 (TWD) 與美股 (USD) 獨立計算，總資產支援自訂 USD/TWD 匯率即時折算。
   - **成本結算模型**：移動加權平均成本法 (Moving Weighted Average Cost)。
3. **產品需求規格書 (PRD)**：[docs/specs/0001-stock-tracker-and-analyzer.md](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（15 條 User Stories 均 100% 落實）。
4. **Agent 協作規範與追蹤器**：
   - 協作準則：[AGENTS.md](file:///d:/APP/股票紀錄/AGENTS.md)
   - 任務追蹤：[docs/agents/issue-tracker.md](file:///d:/APP/股票紀錄/docs/agents/issue-tracker.md)（GitHub Issues）
   - 分流標籤：[docs/agents/triage-labels.md](file:///d:/APP/股票紀錄/docs/agents/triage-labels.md)
   - 領域消費：[docs/agents/domain.md](file:///d:/APP/股票紀錄/docs/agents/domain.md)

---

## 📂 實體模組與程式碼索引 (Codebase Map)

| 模組 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 純函數會計引擎，處理加權平均、部分賣出、股息、小數點股數與匯率折算。 |
| **單元測試套件** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 6 大測試案例，涵蓋邊界條件與精度校驗 (100% 通過)。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、JSON 完整備份還原、相容 Excel 之 UTF-8 BOM CSV 匯出。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | 嚴格定義 `TradeRecord`, `HoldingPosition`, `PortfolioSummary`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換 (全部/台股/美股)、自訂匯率調整、新增交易與資料匯出入入口。 |
| **關鍵財務卡片** | [`src/components/SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx) | 總市值、未實現損益、已實現損益、累計股息收益。 |
| **資產配置圖表** | [`src/components/AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) | 雙市場配置比例進度條與前幾大重倉標的權重長條圖 (User Story 9)。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 即時行內點擊修改市價、一鍵「加碼」與「賣出」預填 (User Story 15)。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 股票代碼與策略標籤即時搜尋過濾、單筆刪除確認 (User Story 14)。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | 支援台美雙市場切換、自動試算台股手續費 (0.1425%) 與證交稅 (0.3%)、美股小數點股數輸入。 |

---

## 🎫 任務票券清單 (GitHub Issues & Local Tracking)

- **[#1](https://github.com/judragon003/-/issues/1)**：規格: 美股與台股雙市場交易紀錄與投資分析儀 (PRD)
- **[#2](https://github.com/judragon003/-/issues/2)**：feat: 雙市場移動加權平均與損益計算核心 (Accounting Engine & TDD)
- **[#3](https://github.com/judragon003/-/issues/3)**：feat: 雙市場交易錄入彈窗與自動稅費試算 (Trade Entry Modal & Auto Fees)
- **[#4](https://github.com/judragon003/-/issues/4)**：feat: 財務指標儀表板、資產配置圖與多幣別切換 (Portfolio Dashboard)
- **[#5](https://github.com/judragon003/-/issues/5)**：feat: 持倉總覽表 (行內現價快修) 與交易明細搜尋過濾 (Holdings & History)
- **[#6](https://github.com/judragon003/-/issues/6)**：feat: 本地儲存持久化與 JSON/CSV 雙向備份還原 (Persistence & Backup)
- 本地票券文檔：[`.scratch/v1-stock-tracker/issues/`](file:///d:/APP/股票紀錄/.scratch/v1-stock-tracker/issues/)

---

## 🔮 後續迭代路線 (Next Steps / Roadmap)

1. **V2 即時金融報價串接**：
   - 串接免費或公開金融報價 API（如 Yahoo Finance 或 TWSE API），提供一鍵刷新全持股最新收盤市價。
2. **V3 資產報酬走勢圖與股息日曆**：
   - 累計資產淨值 (NAV) 走勢折線圖、月度/年度已實現損益柱狀圖、歷史配息發放日曆。
3. **V4 資產再平衡模擬器 (Rebalancing Simulator)**：
   - 設定目標配置權重（例如台股 50% : 美股 50%），自動模擬試算買進/賣出調整股數。

---

## 🛠️ 下一個 Agent 推薦調用技能 (Suggested Skills)

- **`/grill-with-docs`**：若要啟動 V2/V3 新功能設計，先對齊邊界條件並新增 ADR。
- **`/to-spec` & `/to-tickets`**：將新功能拆解為垂直切片票券。
- **`/tdd`**：針對新功能實作公開縫隙之單元測試。
- **`/code-review`**：提交前執行標準與規格雙軸審查。
