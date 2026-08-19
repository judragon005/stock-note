# 股票紀錄與分析儀 (Stock Tracker & Analyzer) - 專案交接手冊 (Handoff Document)

## 📌 專案當前狀態 (Current Project State)

- **專案路徑**：`d:\APP\股票紀錄`
- **遠端儲存庫**：`git@github.com:judragon003/-.git` (`main` 分支，最新 commit：PR #7 Squash Merge)
- **CI/CD 自動化**：[`.github/workflows/ci.yml`](file:///d:/APP/股票紀錄/.github/workflows/ci.yml)
- **測試狀態**：**13/13 通過** (100% Passed)，TypeScript 0 錯誤，Production Build 完成 (209 kB / gzip 62 kB)。
- **目前版本**：**V1.1**（2026-08-19 完成並合併至 main）

---

## 🏛️ 領域模型與架構決策 (Domain & Decisions)

1. **通用語言詞彙表**：[CONTEXT.md](file:///d:/APP/股票紀錄/CONTEXT.md)
   - 規範 Trade、Market (TW/US)、Holding、PnL、YoC、ColorThemeMode、Treemap、Fee Discount 等標準定義。
2. **架構決策紀錄 (ADR)**：
   - [ADR-0001](file:///d:/APP/股票紀錄/docs/adr/0001-core-architecture-and-accounting-model.md)：技術棧、多幣別記帳、加權平均成本模型。
   - [ADR-0002](file:///d:/APP/股票紀錄/docs/adr/0002-v1.1-treemap-theme-and-fee-architecture.md)：Treemap 零依賴 SVG、CSS 變數主題系統、Stale Closure 修復模式。
3. **產品需求規格書 (PRD)**：
   - [0001-stock-tracker-and-analyzer.md](file:///d:/APP/股票紀錄/docs/specs/0001-stock-tracker-and-analyzer.md)（V1.0，15 條 US 均落實）
   - [0002-v1-enhancements-and-treemap.md](file:///d:/APP/股票紀錄/docs/specs/0002-v1-enhancements-and-treemap.md)（V1.1，US-16 ~ US-21 均落實）
4. **Agent 協作規範**：[AGENTS.md](file:///d:/APP/股票紀錄/AGENTS.md)、[docs/agents/](file:///d:/APP/股票紀錄/docs/agents/)

---

## 📂 實體模組與程式碼索引 (Codebase Map)

| 模組 | 檔案路徑 | 核心職責與特性 |
| :--- | :--- | :--- |
| **會計計算核心** | [`src/engine/calculator.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.ts) | 加權平均、部分賣出、股息、YoC、`calculateTaiwanFee`、`calculateTaiwanTax`。 |
| **單元測試套件** | [`src/engine/calculator.test.ts`](file:///d:/APP/股票紀錄/src/engine/calculator.test.ts) | 9 大測試案例，涵蓋邊界條件、YoC、費率精度 (100% 通過)。 |
| **Treemap 演算法** | [`src/utils/treemap.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.ts) | Squarified Treemap 座標計算引擎，純函式零依賴。 |
| **Treemap 測試** | [`src/utils/treemap.test.ts`](file:///d:/APP/股票紀錄/src/utils/treemap.test.ts) | 4 大測試案例（含邊界與多持倉驗證）。 |
| **資料儲存與備份** | [`src/utils/storage.ts`](file:///d:/APP/股票紀錄/src/utils/storage.ts) | LocalStorage 容錯存取、JSON 備份還原、UTF-8 BOM CSV 匯出。 |
| **型別定義** | [`src/types/stock.ts`](file:///d:/APP/股票紀錄/src/types/stock.ts) | `TradeRecord`, `HoldingPosition`（含 `totalDividends`, `yieldOnCostPercent`）, `ColorThemeMode`。 |
| **頂部工具列** | [`src/components/Header.tsx`](file:///d:/APP/股票紀錄/src/components/Header.tsx) | 市場切換、匯率調整、漲跌色彩主題切換、資料匯出入。 |
| **關鍵財務卡片** | [`src/components/SummaryCards.tsx`](file:///d:/APP/股票紀錄/src/components/SummaryCards.tsx) | 總市值、未實現損益、已實現損益、累計股息。 |
| **資產配置圖表** | [`src/components/AllocationChart.tsx`](file:///d:/APP/股票紀錄/src/components/AllocationChart.tsx) | 視圖切換器：Treemap / 權重長條圖雙模式。 |
| **Treemap 圖表元件** | [`src/components/TreemapChart.tsx`](file:///d:/APP/股票紀錄/src/components/TreemapChart.tsx) | SVG Treemap 渲染，色彩主題感知，懸浮 Tooltip。 |
| **持倉總覽表** | [`src/components/HoldingsTable.tsx`](file:///d:/APP/股票紀錄/src/components/HoldingsTable.tsx) | 行內市價修改、YoC 成本殖利率欄位、搜尋過濾。 |
| **交易明細表** | [`src/components/TradeHistoryTable.tsx`](file:///d:/APP/股票紀錄/src/components/TradeHistoryTable.tsx) | 代碼與標籤即時搜尋、單筆刪除確認。 |
| **交易錄入彈窗** | [`src/components/TradeModal.tsx`](file:///d:/APP/股票紀錄/src/components/TradeModal.tsx) | Autosuggest (24 熱門標的)、手續費折數試算、低消開關、連續記帳模式。 |

---

## 🎫 任務票券清單 (GitHub Issues)

| Issue | 標題 | 狀態 |
| :--- | :--- | :--- |
| [#1](https://github.com/judragon003/-/issues/1) | 規格: 美股與台股雙市場交易紀錄與投資分析儀 (PRD) | ✅ Closed |
| [#2](https://github.com/judragon003/-/issues/2) | feat: 雙市場移動加權平均與損益計算核心 | ✅ Closed |
| [#3](https://github.com/judragon003/-/issues/3) | feat: 雙市場交易錄入彈窗與自動稅費試算 | ✅ Closed |
| [#4](https://github.com/judragon003/-/issues/4) | feat: 財務指標儀表板、資產配置圖與多幣別切換 | ✅ Closed |
| [#5](https://github.com/judragon003/-/issues/5) | feat: 持倉總覽表與交易明細搜尋過濾 | ✅ Closed |
| [#6](https://github.com/judragon003/-/issues/6) | feat: 本地儲存持久化與 JSON/CSV 雙向備份還原 | 🟢 **Open（下一個）** |
| [#8](https://github.com/judragon003/-/issues/8) | feat(v1.1): 資產樹狀圖視覺化 (Squarified Treemap) | ✅ Closed |
| [#9](https://github.com/judragon003/-/issues/9) | feat(v1.1): 智慧交易錄入 - Autosuggest 與連續記帳模式 | ✅ Closed |
| [#10](https://github.com/judragon003/-/issues/10) | feat(v1.1): 漲跌色彩主題切換與 YoC 成本殖利率 | ✅ Closed |

---

## 🔮 後續迭代路線 (Next Steps / Roadmap)

1. **#6 本地儲存持久化（先決條件）**：離線完整備份是後續所有功能的安全前提。建立 `feature/6-persistence-json-csv` 分支開始。
2. **V2 即時金融報價串接**：串接 Yahoo Finance / TWSE API，一鍵刷新全持股最新收盤市價。
3. **V3 資產報酬走勢圖與股息日曆**：累計 NAV 走勢折線圖、月度/年度損益柱狀圖、配息日曆。
4. **V4 資產再平衡模擬器**：設定目標配置權重，自動試算調整股數。

---

## 🛠️ 下一個 Agent 推薦調用技能 (Suggested Skills)

- **`/grill-me`**：啟動新功能設計前，先對齊邊界條件。
- **`/to-spec` & `/to-tickets`**：將新功能拆解為垂直切片票券。
- **`/tdd`**：針對新功能實作公開縫隙之單元測試。
- **`/code-review`**：提交前執行標準與規格雙軸審查。
