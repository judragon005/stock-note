# 技術債 0042: AI 主力戰情室集保大戶散戶比與月營收趨勢卡片視覺化串接

- **建立日期**: 2026-10-03
- **來源**: Code Review (Spec 0164 / Issue #163)
- **狀態**: `RESOLVED` (Spec 0169 / Issue #188)
- **解決日期**: 2026-10-08
- **優先級**: `P2 (Medium)`
- **標籤**: `Feature` · `UI` · `AiForceDashboard` · `TDCC` · `Revenue`

---

## 1. 現況與背景 (Context)

在 Spec 0164 中，後端資料庫與 API 已完整支援：
1. **湖倉資料表**：`tw_tdcc_distribution`（千張大戶比例、總人數等共 7,833 筆）與 `tw_monthly_revenue`（月營收、MoM、YoY 共 7,833 筆）。
2. **HTTP API 與 Loader**：`/api/market/history/:symbol` 與 `loadSymbolFullLakehouseData` 已成功回傳 `tdccRecords` 與 `revenueRecords`。
3. **前端視覺化現況**：目前前端主力戰情室的 18 張卡片中，尚未將 `tdccRecords` 與 `revenueRecords` 渲染為獨立的視覺化圖表或指標卡（例如「千張大戶持股比折線副圖」或「近 12 個月營收 YoY 柱狀圖」）。

---

## 2. 改善方案 (Proposed Solution)

1. 在 `src/engine/aiForceDashboardEngine.ts` 擴展 `AiForceReport` 模型，加入 `tdccSummary` 與 `revenueSummary` 結構。
2. 在主力戰情室的「籌碼集中與流向卡」或新卡片中，繪製週度千張大戶持股比例變化與散戶退場進度條。
3. 在「基本面分析卡」中，繪製近 12 個月營收年增率 (YoY) 柱狀圖，並標記「歷史新高 (ATH)」火標籤。

---

## 3. 結案紀錄 (Resolution Summary)

於 **Spec 0169 / Issue #188** 全面實裝並閉環：
- **Card 19 TDCC 集保千張大戶趨勢卡** (`TdccDistributionCard.tsx`): 實裝雙軸投影（千張大戶持股比折線 + 總股東人數柱狀圖）、波段起漲/散戶接刀徽章、As-of Date 發布基準日。
- **Card 20 月營收與成長趨勢卡** (`MonthlyRevenueCard.tsx`): 實裝等比縮放長條圖、YoY 正負成長顏色、ATH 創歷史新高標籤、0050 等 ETF 規模/殖利率河流自適應視圖。
- **SQLite 湖倉端到端貫通**: `AiForceDashboardView.tsx` 與 `aiForceDashboardEngine.ts` 完整貫通 `tdccRecords` 與 `revenueRecords`，E2E 驗證 100% 綠燈通過。
