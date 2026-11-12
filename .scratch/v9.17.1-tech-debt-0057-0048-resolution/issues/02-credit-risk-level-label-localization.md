# 02 — 信用雷達風險標籤繁中化適配器與 Markdown 導出整合

**What to build:** 在 `src/engine/zavySlowWealthEngine.ts` 實作 `formatCreditRiskLevelLabel` 函式，並在 `exportZavyReportMarkdown` 中採用繁體中文輸出信貸風險等級。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 實作 `formatCreditRiskLevelLabel` 函式，精準映射：
  - `LOW` ➔ `低風險穩健`
  - `ELEVATED` ➔ `偏高警戒`
  - `HIGH` ➔ `高風險承壓`
  - `CRITICAL` ➔ `極端危急`
  - 未知或無效值 ➔ 安全 fallback 為原字串或 `未知`
- [x] 在 `exportZavyReportMarkdown` 中整合該標籤，確保 Markdown 報告信貸風險項目輸出為繁體中文
- [x] 在 `src/engine/zavySlowWealthEngine.test.ts` 驗證所有枚舉轉換與 Markdown 報告內容
