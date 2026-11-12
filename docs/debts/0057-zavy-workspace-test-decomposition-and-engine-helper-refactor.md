# 技術債 0057: Zavy 慢富工作區測試職責解耦、預估年股息輔助函式下沉與信用雷達枚舉中文化

## 1. 基本資訊

| 項目 | 內容 |
| :--- | :--- |
| **債務編號** | `0057` |
| **關聯模組** | `src/components/zavy/` · `src/engine/zavySlowWealthEngine.ts` |
| **優先級別** | `P3` (Low - 代碼整潔與架構健壯性備忘) |
| **狀態** | `RESOLVED` (已於 v9.17.0 / Spec 0224 / Issue #500 完整解決) |
| **發現來源** | Spec 0223 雙軸代碼審查 (`/code-review`, Issue #494) |
| **標籤** | `Refactor` · `CleanCode` · `TestSmell` · `ZavyWorkspace` |

---

## 2. 債務背景與現況分析 (Context & Smells)

在完成 Spec 0223（Zavy 慢富週期與配置新手白話導覽、零造輪子 TermTooltip 整合與 12 項漏接欄位全貫通）後，雙軸代碼審查識別出以下三項非阻擋性代碼氣味與架構改善點，為避免當期過度工程化，特建檔於此：

1. **Mysterious Name & Divergent Change (測試職責發散)**：
   - 現況：`src/components/zavy/ZavyMacroCompassCard.test.tsx` 檔案名稱與頂層 `describe` 原為第一鏡頭羅盤卡片，但目前內部同時包含了工作區頂部導覽、第二鏡頭寬度卡片與第三鏡頭雙軌決策卡片的測試案例。
   - 建議：在未來進行組件測試擴充時，拆分為 `ZavySlowWealthWorkspace.test.tsx`、`ZavyMarketBreadthCard.test.tsx` 與 `ZavyDualTrackDecisionCard.test.tsx` 等獨立測試檔。

2. **Feature Envy (業務邏輯下沉至 Engine)**：
   - 現況：`ZavySlowWealthWorkspace.tsx` 在渲染層內直接對 `holdings` 進行成本殖利率計算與幣別折算（`annualEstimatedDividendsTwd`）。
   - 建議：下沉為純函式 `estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate)` 並置於 `zavySlowWealthEngine.ts` 內，加強單元測試覆蓋與複用性。

3. **Domain Language (信用雷達 Markdown 導出中文化)**：
   - 現況：`zavySlowWealthEngine.ts` 導出 Markdown 報告時，潮汐、波浪與美債狀態皆已完成中文化，唯 `creditRiskLevel` 仍輸出為英文枚舉（`LOW`, `ELEVATED`, `HIGH`, `CRITICAL`）。
   - 建議：提供 `formatCreditRiskLevelLabel` 函式將其轉為繁體中文標籤。

---

## 3. 重構計畫與解決成果 (Resolution)

- **解決狀態**：`RESOLVED` (v9.17.0 / Spec 0224 / ADR #0224 / Issue #500)
- **實作成效**：
  1. 測試職責解耦：將 `ZavyMacroCompassCard.test.tsx` 拆分為羅盤、工作區、市場寬度與雙軌決策 4 個獨立測試檔，徹底消除 Divergent Change。
  2. 業務邏輯下沉：實作純函式 `estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate)` 置於 `zavySlowWealthEngine.ts`，由工作區渲染層委託調用，消除 Feature Envy。
  3. 信用雷達繁中化：實作 `formatCreditRiskLevelLabel` 函式，Markdown 導出報告全面採用繁中標籤（`低風險穩健`、`偏高警戒`、`高風險承壓`、`極端危急`）。
