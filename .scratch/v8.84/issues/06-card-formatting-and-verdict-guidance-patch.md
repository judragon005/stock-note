# Ticket 06: 卡片 08/16/17 排版微調、Tooltip 防截斷與超跌反彈操盤指南

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 3 / AC 3.4, AC 3.5, Story 5 / AC 5.1, AC 5.2)

## 任務細節
1. 修改 `src/components/aiForceDashboard/cards/InstitutionalFlowCard.tsx`：
   - 優化右側近 3 日明細表格網格佔比與欄距（padding: 2px 4px），日期縮短為 MM/DD，確保「日期、外資、投信、自營、合計」5 欄完整呈現、零溢出、無橫向捲軸。
2. 修改 `src/components/aiForceDashboard/cards/ForceDistributionCard.tsx` 與 `src/components/aiForceDashboard/cards/BullBearStrengthCard.tsx`：
   - 統一圓環直徑為 `68px × 68px`，半徑 `r=26`，文字 `14px`，保持視覺平衡對稱。
3. 修改 `src/components/common/TermTooltip.tsx`：
   - 移除寫死之 `maxHeight: '280px'`，調整為 `maxHeight: '400px'` 並配置美觀之暗黑滾動條。
4. 修改 `src/constants/aiForceGlossary.ts`：
   - 在 `mlpSemanticVerdict` 詞條中增補「超跌反彈」的精準定義（20MA 負乖離過大）與短線快進快出/分批低接/嚴設停損之實戰操作指引。

## 驗收標準
- [x] 卡片 08 右側明細表格 5 欄完整無溢出。
- [x] 卡片 16 與 17 的圓環尺寸完全一致 (68px)。
- [x] 卡片 18 懸停「超跌反彈」時彈出的說明框內容完整不被截斷，清楚解釋「超跌反彈」的意義與具體操盤方法。
