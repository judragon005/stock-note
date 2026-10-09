# Ticket 01: Card 08 法人行為計量上下排列與近 5 日明細表格重構

## 關聯規格
- Spec: `docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md` (3.1 / AC 1.1 ~ 1.4)

## 問題背景
原本 Card 08 採用左右對分結構（各約 180px）。左側三色柱（外資、投信、自營）擠成一團，長天期折線波動細節被大幅壓縮；右側明細表格僅能擠進 3 日資料，字體縮至 0.70rem，且與底部「近 5 日買賣超」之總結天期產生認知落差。

## 任務細節
1. 修改 `src/components/aiForceDashboard/cards/InstitutionalFlowCard.tsx`：
   - 將主體版面由 `display: grid; gridTemplateColumns: minmax(0, 1.25fr) minmax(180px, 1fr)` 改為 `display: flex; flexDirection: column; gap: 10px` 上下垂直佈局。
   - 上方雙軸 SVG 圖表獨享 100% 寬幅，高度維持 150px~160px；微調單日柱寬（`barW`）與間隔，折線發光（Drop Shadow）增強。
   - 下方明細表格全寬展開，將展示天數由 `recentDays.slice(-3)` 升級為 `recentDays.slice(-5)`。
   - 欄位排版等比緊湊對齊（`日期 | 外資 | 投信 | 自營 | 合計`），字體調大至 `0.80rem ~ 0.82rem`（Mono 字型），加入微弱斑馬紋與 hover 聚焦光暈。
   - 底部維持 20 日與 5 日累計買賣超膠囊總結。
2. 更新單元測試 `src/components/aiForceDashboard/cards/InstitutionalFlowCard.test.ts`：
   - 驗證明細表格切片渲染為 5 列（近 5 日）。
   - 驗證張數格式化、合計色彩與上下佈局容器樣式屬性。

## 驗收標準
- [x] `npm test src/components/aiForceDashboard/cards/InstitutionalFlowCard.test.ts` 100% 通過。
- [x] Card 08 呈現上下流動，上方圖表全寬展開，下方呈現 5 日法人進出明細，無橫向捲軸。

